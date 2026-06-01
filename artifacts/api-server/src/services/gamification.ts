// ============ Gamification service (v1) ============
// Minimal, deterministic engine that turns user actions into XP, levels, quest
// progress, badges, and leaderboard score. Kept intentionally simple so the
// rules are easy to reason about and the read-only screens (Rewards / Quests /
// Leaderboard) finally have real data behind them.
//
// Design notes:
// - XP is the single source of truth. Level is derived from XP; leaderboard
//   score mirrors XP for the active season.
// - Milestone hooks (profile, first like, first match…) are made idempotent by
//   awarding a sentinel badge first and only granting XP when that badge is new.
// - Everything is best-effort: callers wrap hooks in `.catch(() => {})` so a
//   gamification hiccup never breaks the underlying user action.

import { db } from "@workspace/db";
import {
  users, cubeWallets, cubeTransactions, seasons, leaderboards,
  quests, questProgress, badges, userBadges,
} from "@workspace/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";

// 500 XP per level. Level 1 starts at 0 XP. Deterministic and easy to explain.
const XP_PER_LEVEL = 500;
export function levelForXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

async function getActiveSeasonId(): Promise<number | null> {
  const now = new Date();
  const [season] = await db.select({ id: seasons.id }).from(seasons)
    .where(and(eq(seasons.active, true), lte(seasons.startDate, now), gte(seasons.endDate, now)))
    .limit(1);
  return season?.id ?? null;
}

// Upsert the user's leaderboard row for the active season, adding `delta` to score.
async function addLeaderboardScore(userId: number, delta: number): Promise<void> {
  if (delta === 0) return;
  const seasonId = await getActiveSeasonId();
  if (!seasonId) return;
  const [me] = await db.select({ city: users.city }).from(users).where(eq(users.id, userId)).limit(1);
  const [existing] = await db.select().from(leaderboards)
    .where(and(eq(leaderboards.seasonId, seasonId), eq(leaderboards.userId, userId)))
    .limit(1);
  if (existing) {
    await db.update(leaderboards)
      .set({ score: sql`${leaderboards.score} + ${delta}`, updatedAt: new Date() })
      .where(eq(leaderboards.id, existing.id));
  } else {
    await db.insert(leaderboards).values({ seasonId, userId, score: delta, city: me?.city ?? null });
  }
}

// Award XP, recompute level, and mirror the gain into the leaderboard.
export async function awardXp(userId: number, amount: number): Promise<{ xp: number; level: number }> {
  if (!amount) {
    const [u] = await db.select({ xp: users.xp, level: users.level }).from(users).where(eq(users.id, userId)).limit(1);
    return { xp: u?.xp ?? 0, level: u?.level ?? 1 };
  }
  const [updated] = await db.update(users)
    .set({ xp: sql`${users.xp} + ${amount}`, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ xp: users.xp });
  const xp = updated?.xp ?? 0;
  const level = levelForXp(xp);
  await db.update(users).set({ level }).where(eq(users.id, userId));
  await addLeaderboardScore(userId, amount);
  return { xp, level };
}

// Grant a badge by code. Returns true only the first time it is granted.
export async function awardBadge(userId: number, code: string): Promise<boolean> {
  const [badge] = await db.select({ id: badges.id }).from(badges).where(eq(badges.code, code)).limit(1);
  if (!badge) return false;
  const [existing] = await db.select({ id: userBadges.id }).from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badge.id)))
    .limit(1);
  if (existing) return false;
  await db.insert(userBadges).values({ userId, badgeId: badge.id });
  return true;
}

// Advance progress on every active quest of a given goalType. When a quest
// crosses its goal for the first time, grant its cube + XP reward.
export async function bumpQuest(userId: number, goalType: string, increment = 1): Promise<void> {
  if (increment <= 0) return;
  const active = await db.select().from(quests)
    .where(and(eq(quests.active, true), eq(quests.goalType, goalType)));
  for (const quest of active) {
    const [prog] = await db.select().from(questProgress)
      .where(and(eq(questProgress.userId, userId), eq(questProgress.questId, quest.id)))
      .limit(1);
    const prev = prog?.progress ?? 0;
    if (prog?.completedAt) continue; // already done
    const next = Math.min(prev + increment, quest.goalValue);
    const justCompleted = next >= quest.goalValue;
    if (prog) {
      await db.update(questProgress)
        .set({ progress: next, completedAt: justCompleted ? new Date() : null })
        .where(eq(questProgress.id, prog.id));
    } else {
      await db.insert(questProgress).values({
        userId, questId: quest.id, progress: next,
        completedAt: justCompleted ? new Date() : null,
      });
    }
    if (justCompleted) {
      if (quest.rewardCubes > 0) {
        await db.update(cubeWallets)
          .set({
            balance: sql`${cubeWallets.balance} + ${quest.rewardCubes}`,
            totalEarned: sql`${cubeWallets.totalEarned} + ${quest.rewardCubes}`,
            updatedAt: new Date(),
          })
          .where(eq(cubeWallets.userId, userId));
        await db.insert(cubeTransactions).values({
          userId, kind: "earn", amount: quest.rewardCubes,
          meta: { reason: "quest_complete", questCode: quest.code },
        });
      }
      if ((quest.rewardXp ?? 0) > 0) await awardXp(userId, quest.rewardXp ?? 0);
    }
  }
}

// ---------------------------------------------------------------------------
// Action hooks — call these from routes. All are best-effort and idempotent
// where it matters (milestones gated behind a sentinel badge).
// ---------------------------------------------------------------------------

export async function onProfileCompleted(userId: number): Promise<void> {
  if (await awardBadge(userId, "profile_complete")) {
    await awardXp(userId, 50);
    await bumpQuest(userId, "profile_complete", 1);
  }
}

export async function onPhotoUploaded(userId: number, count = 1): Promise<void> {
  if (await awardBadge(userId, "first_photo")) await awardXp(userId, 20);
  await bumpQuest(userId, "upload_photo", count);
}

export async function onCheckIn(userId: number, xp = 5): Promise<void> {
  await awardXp(userId, xp);
  await awardBadge(userId, "explorer");
  await bumpQuest(userId, "check_in", 1);
}

export async function onFirstLike(userId: number): Promise<void> {
  if (await awardBadge(userId, "first_like")) await awardXp(userId, 10);
  await bumpQuest(userId, "send_like", 1);
}

export async function onMatchCreated(userId: number): Promise<void> {
  if (await awardBadge(userId, "first_match")) await awardXp(userId, 30);
  await awardXp(userId, 15);
  await bumpQuest(userId, "match", 1);
}

export async function onMessageSent(userId: number): Promise<void> {
  await awardXp(userId, 2);
  await bumpQuest(userId, "message", 1);
}

export async function onRoomJoined(userId: number): Promise<void> {
  if (await awardBadge(userId, "socialite")) await awardXp(userId, 15);
  await bumpQuest(userId, "room_join", 1);
}

export async function onGiftRedeemed(userId: number): Promise<void> {
  if (await awardBadge(userId, "generous")) await awardXp(userId, 25);
  await bumpQuest(userId, "gift", 1);
}
