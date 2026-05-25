import { db } from "../db";
import {
  venues, rooms, events, roomPresence, tickets,
  users, preferences, cubeWallets, cubeTransactions,
  seasons, quests, questProgress, leaderboards, subscriptions,
  swipes, matches, messages,
} from "../shared/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

const now = new Date();
const todayAt = (h: number, m = 0) => {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
  return d;
};
const slot = (startH: number, startM: number, durationHours: number) => {
  const start = todayAt(startH, startM);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return { start, end };
};
const tomorrowAt = (h: number, m = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d;
};
const daysAhead = (days: number, h: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(h, 0, 0, 0);
  return d;
};
const yearsAgo = (yrs: number) => {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - yrs);
  return d;
};

if (process.env.NODE_ENV === "production" && process.env.SEED_WIPE !== "1") {
  console.error("Refusing to wipe demo data in production. Set SEED_WIPE=1 to override.");
  process.exit(1);
}

// ============ DEMO NPCs ============
// Phones use the 99XXXXXXXX demo range so we never collide with real signups.
const NPC_SEED = [
  { phone: "9990000001", name: "Ananya",  gender: "female" as const, age: 24, bio: "Indie gigs + brewery hops.",            interests: ["music", "craft beer"],   photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80" },
  { phone: "9990000002", name: "Riya",    gender: "female" as const, age: 26, bio: "Rooftop sunsets > anything.",            interests: ["sunsets", "wine"],       photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80" },
  { phone: "9990000003", name: "Meera",   gender: "female" as const, age: 23, bio: "Brunch, books, and bad puns.",           interests: ["brunch", "books"],       photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80" },
  { phone: "9990000004", name: "Priya",   gender: "female" as const, age: 27, bio: "House music + dim sum.",                 interests: ["house", "food"],         photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80" },
  { phone: "9990000005", name: "Aisha",   gender: "female" as const, age: 25, bio: "Trivia champion. Allegedly.",            interests: ["trivia", "quiz"],        photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80" },
  { phone: "9990000006", name: "Tara",    gender: "female" as const, age: 28, bio: "Saturday nights, Sunday brunches.",      interests: ["parties", "brunch"],     photo: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=80" },
  { phone: "9990000007", name: "Arjun",   gender: "male"   as const, age: 27, bio: "Beer nerd. Toit regular.",               interests: ["craft beer", "football"],photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80" },
  { phone: "9990000008", name: "Karan",   gender: "male"   as const, age: 26, bio: "DJ on weekends, coder on weekdays.",     interests: ["music", "tech"],         photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" },
  { phone: "9990000009", name: "Vikram",  gender: "male"   as const, age: 29, bio: "Rooftops, single malts, jazz.",          interests: ["jazz", "whisky"],        photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80" },
  { phone: "9990000010", name: "Rohan",   gender: "male"   as const, age: 25, bio: "Pub trivia or it didn't happen.",        interests: ["trivia", "football"],    photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80" },
  { phone: "9990000011", name: "Aditya",  gender: "male"   as const, age: 28, bio: "Loft Saturdays are sacred.",             interests: ["parties", "music"],      photo: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&q=80" },
  { phone: "9990000012", name: "Sahil",   gender: "male"   as const, age: 26, bio: "Brunch enthusiast. Mimosa specialist.",   interests: ["brunch", "wine"],        photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80" },
];

async function upsertNpcs(): Promise<number[]> {
  const phones = NPC_SEED.map(n => n.phone);
  const existing = await db.select().from(users).where(inArray(users.phone, phones));
  const existingByPhone = new Map(existing.map(u => [u.phone, u]));
  const ids: number[] = [];
  for (const n of NPC_SEED) {
    let cur = existingByPhone.get(n.phone);
    if (!cur) {
      const [u] = await db.insert(users).values({
        phone: n.phone,
        name: n.name,
        dob: yearsAgo(n.age),
        gender: n.gender,
        city: "Bangalore",
        bio: n.bio,
        interests: n.interests,
        photos: [n.photo],
        verified: true,
        level: 3,
        xp: 420,
      }).returning();
      cur = u;
    }
    // Self-heal: always ensure preferences + wallet exist for every NPC.
    await db.insert(preferences).values({ userId: cur.id }).onConflictDoNothing();
    await db.insert(cubeWallets).values({
      userId: cur.id,
      balance: n.gender === "female" ? 200 : 100,
      totalEarned: n.gender === "female" ? 200 : 100,
    }).onConflictDoNothing();
    ids.push(cur.id);
  }
  return ids;
}

async function main() {
  const allVenues = await db.select().from(venues);
  if (allVenues.length === 0) { console.error("No venues found."); process.exit(1); }
  const byName = (s: string) => allVenues.find((v) => v.name.toLowerCase().includes(s.toLowerCase())) || allVenues[0];
  const toit = byName("toit"), social = byName("social"), skyye = byName("skyye") || byName("sky"),
        prost = byName("prost") || byName("brew"), lord = byName("lord") || byName("loft") || allVenues.at(-1)!;

  // Wipe demo-managed rows (rooms/events/tickets/presence). Do NOT delete users.
  await db.delete(roomPresence);
  await db.delete(rooms);
  await db.delete(tickets);
  await db.delete(events);

  // NPCs (idempotent)
  const npcIds = await upsertNpcs();
  console.log(`NPCs ready: ${npcIds.length}`);

  // ============ ROOMS ============
  const r1 = slot(19, 0, 6), r2 = slot(20, 0, 4.5), r3 = slot(18, 30, 4),
        r4 = slot(21, 30, 4.5), r5 = slot(20, 0, 4);
  const insertedRooms = await db.insert(rooms).values([
    { venueId: toit.id,   name: "Friday Vibes @ Toit 🍺",          capacity: 20, startsAt: r1.start, endsAt: r1.end, virtual: true,  premium: false, active: true },
    { venueId: social.id, name: "Indiranagar Social Pre-Game 🎶",  capacity: 15, startsAt: r2.start, endsAt: r2.end, virtual: true,  premium: false, active: true },
    { venueId: skyye.id,  name: "Skyye Rooftop Sunset 🌇",         capacity: 12, startsAt: r3.start, endsAt: r3.end, virtual: false, premium: true,  active: true },
    { venueId: prost.id,  name: "Prost Late Night Lounge 🥂",      capacity: 18, startsAt: r4.start, endsAt: r4.end, virtual: true,  premium: false, active: true },
    { venueId: lord.id,   name: "Loft Saturday Warm-up 🎧",        capacity: 25, startsAt: r5.start, endsAt: r5.end, virtual: true,  premium: false, active: true },
  ]).returning();
  console.log(`Rooms: ${insertedRooms.length}`);

  // ============ ROOM PRESENCE — populate live rooms ============
  // Each room gets 6-10 NPCs with balanced gender ratio, all currently present.
  const presenceRows: { roomId: number; userId: number; joinedAt: Date }[] = [];
  const groups = [
    [0, 1, 2, 6, 7, 8],                  // Toit: 3F 3M = 6
    [2, 3, 4, 8, 9, 10],                 // Social: 3F 3M = 6
    [1, 3, 5, 8, 10, 11, 0, 6],          // Skyye premium: 4F 4M = 8
    [4, 5, 0, 9, 11, 7, 1],              // Prost: 4F 3M = 7
    [0, 2, 4, 5, 6, 7, 10, 11, 9],       // Loft: 4F 5M = 9
  ];
  insertedRooms.forEach((room, idx) => {
    const joined = new Date(Math.max(room.startsAt.getTime(), now.getTime() - 25 * 60 * 1000));
    for (const npcIdx of groups[idx]) {
      presenceRows.push({ roomId: room.id, userId: npcIds[npcIdx], joinedAt: joined });
    }
  });
  await db.insert(roomPresence).values(presenceRows);
  console.log(`Room presences: ${presenceRows.length}`);

  // ============ EVENTS ============
  const insertedEvents = await db.insert(events).values([
    { city: "Bangalore", venueId: toit.id,   title: "Singles Mixer @ Toit",       type: "mixer",      description: "Curated singles night with hosted icebreakers, signature pours and live indie set.", startsAt: tomorrowAt(20, 0),  endsAt: tomorrowAt(23, 30),  price: 799,  capacity: 60,  status: "upcoming" as const, imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80" },
    { city: "Bangalore", venueId: social.id, title: "Indie Night: Live + Match",  type: "live_music", description: "Indie acoustic sets, themed conversation booths, and a soft icebreaker game between sets.", startsAt: daysAhead(2, 19),  endsAt: daysAhead(2, 23),    price: 499,  capacity: 80,  status: "upcoming" as const, imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80" },
    { city: "Bangalore", venueId: skyye.id,  title: "Skyye Rooftop Sundowner",    type: "sundowner",  description: "Golden-hour rooftop with curated playlists, paired tastings, and the Icebreaker Zone open all evening.", startsAt: daysAhead(3, 18),  endsAt: daysAhead(3, 22),    price: 1299, capacity: 40,  status: "upcoming" as const, imageUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80" },
    { city: "Bangalore", venueId: prost.id,  title: "Prost Trivia & Tipples",     type: "trivia",     description: "Mixed-team pub trivia. Get matched into a team of strangers and break the ice round by round.", startsAt: daysAhead(4, 19),  endsAt: daysAhead(4, 22),    price: 349,  capacity: 50,  status: "upcoming" as const, imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&q=80" },
    { city: "Bangalore", venueId: lord.id,   title: "Loft Saturday Night",        type: "party",      description: "Bangalore's premium Saturday night. Dress code: smart casual. Mixology pop-up and surprise live act.", startsAt: daysAhead(5, 21),  endsAt: daysAhead(6, 2),     price: 999,  capacity: 120, status: "upcoming" as const, imageUrl: "https://images.unsplash.com/photo-1571266028243-d220c6e5e1b3?w=1200&q=80" },
    { city: "Bangalore", venueId: toit.id,   title: "Sunday Brunch & Bonds",      type: "brunch",     description: "Easy Sunday brunch with conversation starters and a chill, no-pressure crowd.", startsAt: daysAhead(6, 12),  endsAt: daysAhead(6, 16),    price: 599,  capacity: 45,  status: "upcoming" as const, imageUrl: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&q=80" },
  ]).returning();
  console.log(`Events: ${insertedEvents.length}`);

  // ============ DEMO USER UPGRADES (cubes / season / quests / premium) ============
  const [demoUser] = await db.select().from(users).where(eq(users.phone, "8095411567"));
  if (!demoUser) {
    console.log("Demo user 8095411567 not registered yet — skipping cubes/season/premium boost.");
    console.log("Sign in once with the demo phone and OTP 123456, then re-run this script.");
    process.exit(0);
  }

  // Demo user: auto-verified + onboarded so selfie & onboarding gates don't block the demo.
  await db.update(users)
    .set({ verified: true, name: demoUser.name || "Alex", city: "Bangalore" })
    .where(eq(users.id, demoUser.id));

  // CUBES — top up the demo wallet to 850 and log recent transactions
  await db.update(cubeWallets)
    .set({ balance: 850, totalEarned: 1240, totalSpent: 390, updatedAt: new Date() })
    .where(eq(cubeWallets.userId, demoUser.id));
  await db.delete(cubeTransactions).where(eq(cubeTransactions.userId, demoUser.id));
  await db.insert(cubeTransactions).values([
    { userId: demoUser.id, kind: "earn",  amount: 100, meta: { reason: "season_top_up" },     createdAt: new Date(now.getTime() - 6 * 24 * 3600 * 1000) },
    { userId: demoUser.id, kind: "earn",  amount: 50,  meta: { reason: "check_in", venue: toit.name }, createdAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000) },
    { userId: demoUser.id, kind: "earn",  amount: 25,  meta: { reason: "match" },             createdAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000) },
    { userId: demoUser.id, kind: "spend", amount: 60,  meta: { reason: "drink_gift" },        createdAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000) },
    { userId: demoUser.id, kind: "earn",  amount: 75,  meta: { reason: "quest_complete" },    createdAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000) },
    { userId: demoUser.id, kind: "earn",  amount: 40,  meta: { reason: "check_in", venue: skyye.name }, createdAt: new Date(now.getTime() - 6 * 3600 * 1000) },
  ]);

  // SEASON — close any stale ones, open a fresh active season
  await db.update(seasons).set({ active: false }).where(eq(seasons.active, true));
  const [season] = await db.insert(seasons).values({
    title: "Season 1 — Monsoon Nights",
    startDate: new Date(now.getTime() - 14 * 24 * 3600 * 1000),
    endDate: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
    active: true,
  }).returning();

  // QUESTS — wipe then seed for this season
  await db.delete(questProgress);
  await db.delete(quests);
  const insertedQuests = await db.insert(quests).values([
    { seasonId: season.id, code: "checkin_3",   title: "Check in at 3 venues",        description: "Visit 3 partner venues this week.",   goalType: "checkin",  goalValue: 3, rewardCubes: 75,  rewardXp: 50, active: true },
    { seasonId: season.id, code: "match_5",     title: "Make 5 matches",              description: "Match with 5 new people.",            goalType: "match",    goalValue: 5, rewardCubes: 100, rewardXp: 80, active: true },
    { seasonId: season.id, code: "icebreaker_2",title: "Break 2 conversations",       description: "Complete 2 icebreaker games.",        goalType: "icebreaker", goalValue: 2, rewardCubes: 60, rewardXp: 40, active: true },
    { seasonId: season.id, code: "room_join_3", title: "Join 3 live rooms",           description: "Drop into 3 live rooms this season.", goalType: "room",     goalValue: 3, rewardCubes: 50,  rewardXp: 30, active: true },
    { seasonId: season.id, code: "gift_1",      title: "Send a drink",                description: "Gift someone a drink.",               goalType: "gift",     goalValue: 1, rewardCubes: 40,  rewardXp: 25, active: true },
  ]).returning();

  // QUEST PROGRESS for demo user — mix of in-progress + completed
  const qByCode = Object.fromEntries(insertedQuests.map(q => [q.code, q]));
  await db.insert(questProgress).values([
    { userId: demoUser.id, questId: qByCode["checkin_3"].id,    progress: 2, completedAt: null },
    { userId: demoUser.id, questId: qByCode["match_5"].id,      progress: 3, completedAt: null },
    { userId: demoUser.id, questId: qByCode["icebreaker_2"].id, progress: 2, completedAt: new Date(now.getTime() - 12 * 3600 * 1000) },
    { userId: demoUser.id, questId: qByCode["room_join_3"].id,  progress: 1, completedAt: null },
    { userId: demoUser.id, questId: qByCode["gift_1"].id,       progress: 1, completedAt: new Date(now.getTime() - 24 * 3600 * 1000) },
  ]);

  // LEADERBOARD — demo user near the top, NPCs filling the board
  await db.delete(leaderboards).where(eq(leaderboards.seasonId, season.id));
  const lbRows = [
    { seasonId: season.id, userId: demoUser.id, score: 1840, city: "Bangalore" },
    ...npcIds.map((id, i) => ({ seasonId: season.id, userId: id, score: 2200 - i * 130 + (i % 3) * 20, city: "Bangalore" })),
  ];
  await db.insert(leaderboards).values(lbRows);

  // PREMIUM — active subscription so "God Mode" / premium gates light up
  await db.delete(subscriptions).where(eq(subscriptions.userId, demoUser.id));
  await db.insert(subscriptions).values({
    userId: demoUser.id,
    plan: "godmode_monthly",
    startsAt: new Date(now.getTime() - 7 * 24 * 3600 * 1000),
    endsAt: new Date(now.getTime() + 23 * 24 * 3600 * 1000),
    status: "active" as const,
  });

  // ============ DEMO MATCHES — guarantee a ready-to-chat conversation ============
  // Pair the demo user with the first 2 NPCs (Ananya + Riya). Reciprocal swipes,
  // icebreaker game marked complete, and a couple of seed messages so chat opens hot.
  const matchPartners = npcIds.slice(0, 2);
  for (const partnerId of matchPartners) {
    // Reciprocal swipes
    await db.insert(swipes).values([
      { swiperId: demoUser.id, swipedId: partnerId, liked: true },
      { swiperId: partnerId, swipedId: demoUser.id, liked: true },
    ]).onConflictDoNothing();
    // Match (avoid dupes)
    const [aId, bId] = demoUser.id < partnerId ? [demoUser.id, partnerId] : [partnerId, demoUser.id];
    const existing = await db.select().from(matches)
      .where(and(eq(matches.userAId, aId), eq(matches.userBId, bId))).limit(1);
    let m = existing[0];
    if (!m) {
      const [created] = await db.insert(matches).values({
        userAId: aId, userBId: bId, icebreakerCompleted: true,
      }).returning();
      m = created;
    } else {
      await db.update(matches).set({ icebreakerCompleted: true }).where(eq(matches.id, m.id));
    }
    // Seed a couple of messages from the NPC so the thread isn't empty
    const existingMsgs = await db.select().from(messages).where(eq(messages.matchId, m.id)).limit(1);
    if (existingMsgs.length === 0) {
      await db.insert(messages).values([
        { matchId: m.id, senderId: partnerId, body: "Hey! Loved the icebreaker round 😄", createdAt: new Date(now.getTime() - 30 * 60 * 1000) },
        { matchId: m.id, senderId: partnerId, body: "Free this weekend?",                  createdAt: new Date(now.getTime() - 25 * 60 * 1000) },
      ]);
    }
  }
  console.log(`Demo matches ready: ${matchPartners.length} (ice broken, chat seeded)`);

  console.log("Demo upgrades: wallet=850 cubes, season + 5 quests, premium active, leaderboard seeded.");
  console.log("Demo seed complete.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
