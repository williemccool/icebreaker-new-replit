// Idempotent database seed for Icebreaker.
//
// Run with:  pnpm db:seed   (requires DATABASE_URL)
//
// Safe to run repeatedly: venues/events/seasons are matched by a stable name,
// quests/badges by their unique `code` (ON CONFLICT DO NOTHING). Re-running
// never creates duplicates. Live rooms are seeded by the API server on boot
// (ensureLiveRooms) from the venues created here, so we don't insert rooms.

import { eq } from "drizzle-orm";
import { db, pool, venues, events, seasons, quests, badges } from "../src/index";

async function ensureVenue(v: typeof venues.$inferInsert): Promise<number> {
  const [existing] = await db.select({ id: venues.id }).from(venues).where(eq(venues.name, v.name)).limit(1);
  if (existing) return existing.id;
  const [row] = await db.insert(venues).values(v).returning({ id: venues.id });
  return row.id;
}

async function ensureSeason(s: typeof seasons.$inferInsert): Promise<number> {
  const [existing] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.title, s.title)).limit(1);
  if (existing) return existing.id;
  const [row] = await db.insert(seasons).values(s).returning({ id: seasons.id });
  return row.id;
}

async function ensureEvent(e: typeof events.$inferInsert): Promise<void> {
  const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.title, e.title)).limit(1);
  if (!existing) await db.insert(events).values(e);
}

async function seed() {
  console.log("🌱 Seeding Icebreaker database…");

  // ---- Venues (Bangalore) -------------------------------------------------
  const venueSeed: (typeof venues.$inferInsert)[] = [
    {
      name: "Toit Brewpub", type: "Microbrewery",
      address: "298, 100 Feet Road, Indiranagar, Bangalore", area: "Indiranagar", city: "Bangalore",
      partner: true, perks: ["First drink free on check-in", "10% off food", "Priority weekend seating"],
      description: "Bangalore's favourite microbrewery with handcrafted beers.",
      imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80",
      lat: "12.9716", lng: "77.6412",
    },
    {
      name: "Skyye Lounge", type: "Rooftop Bar",
      address: "UB City Mall, Vittal Mallya Road, Bengaluru", area: "UB City", city: "Bangalore",
      partner: true, perks: ["Free entry with app", "Happy Hour 5–7 PM", "Welcome drink"],
      description: "Rooftop bar with panoramic city views and live DJ sets.",
      imageUrl: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80",
      lat: "12.9719", lng: "77.5987",
    },
    {
      name: "Social Koramangala", type: "Community Bar",
      address: "118, 6th B Cross Rd, Koramangala, Bengaluru", area: "Koramangala", city: "Bangalore",
      partner: true, perks: ["Buy 1 Get 1 cocktails", "Co-working by day"],
      description: "High-energy community bar — equal parts cafe, bar and workspace.",
      imageUrl: "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800&q=80",
      lat: "12.9352", lng: "77.6245",
    },
    {
      name: "Third Wave Coffee", type: "Cafe",
      address: "Indiranagar 12th Main, Bengaluru", area: "Indiranagar", city: "Bangalore",
      partner: false, perks: ["10% off for members"],
      description: "Specialty coffee roasters — a calm spot for daytime meetups.",
      imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80",
      lat: "12.9784", lng: "77.6408",
    },
    {
      name: "Pebble The Jungle", type: "Nightclub",
      address: "Golf Course Rd, Sadashivanagar, Bengaluru", area: "Sadashivanagar", city: "Bangalore",
      partner: true, perks: ["Stag entry with app", "Ladies night Wednesdays"],
      description: "Open-air nightclub set in a leafy hillside garden.",
      imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80",
      lat: "13.0068", lng: "77.5810",
    },
  ];
  const venueIds: number[] = [];
  for (const v of venueSeed) venueIds.push(await ensureVenue(v));
  console.log(`✅ ${venueIds.length} venues ready`);

  // ---- Season -------------------------------------------------------------
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const seasonEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const seasonId = await ensureSeason({
    title: "Season 1 · Bangalore Nights",
    startDate: seasonStart, endDate: seasonEnd, active: true,
  });
  console.log("✅ Active season ready");

  // ---- Quests (goalType must match gamification service hooks) ------------
  const questSeed: (typeof quests.$inferInsert)[] = [
    { seasonId, code: "complete_profile", title: "First Impressions", description: "Complete your profile.", goalType: "profile_complete", goalValue: 1, rewardCubes: 25, rewardXp: 50, active: true },
    { seasonId, code: "add_photos",       title: "Picture Perfect",   description: "Add a profile photo.",   goalType: "upload_photo",    goalValue: 1, rewardCubes: 15, rewardXp: 20, active: true },
    { seasonId, code: "first_checkins",   title: "Out & About",       description: "Check in to 3 venues.",  goalType: "check_in",        goalValue: 3, rewardCubes: 40, rewardXp: 60, active: true },
    { seasonId, code: "send_likes",       title: "Making Moves",      description: "Like 10 people.",        goalType: "send_like",       goalValue: 10, rewardCubes: 30, rewardXp: 40, active: true },
    { seasonId, code: "get_matches",      title: "Sparks Fly",        description: "Get 3 matches.",         goalType: "match",           goalValue: 3, rewardCubes: 50, rewardXp: 75, active: true },
    { seasonId, code: "chatterbox",       title: "Chatterbox",        description: "Send 20 messages.",      goalType: "message",         goalValue: 20, rewardCubes: 30, rewardXp: 40, active: true },
    { seasonId, code: "room_regular",     title: "Room Regular",      description: "Join 3 live rooms.",     goalType: "room_join",       goalValue: 3, rewardCubes: 25, rewardXp: 35, active: true },
  ];
  await db.insert(quests).values(questSeed).onConflictDoNothing({ target: quests.code });
  console.log(`✅ ${questSeed.length} quests ready`);

  // ---- Badges (code must match gamification service awardBadge calls) -----
  const badgeSeed: (typeof badges.$inferInsert)[] = [
    { code: "profile_complete", name: "Newcomer",   description: "Completed your profile." },
    { code: "first_photo",      name: "Picture Perfect", description: "Added your first photo." },
    { code: "explorer",         name: "Explorer",   description: "Checked in to a venue." },
    { code: "first_like",       name: "Smooth Operator", description: "Sent your first like." },
    { code: "first_match",      name: "Matchmaker", description: "Got your first match." },
    { code: "socialite",        name: "Socialite",  description: "Joined a live room." },
    { code: "generous",         name: "Generous",   description: "Sent a drink that got redeemed." },
  ];
  await db.insert(badges).values(badgeSeed).onConflictDoNothing({ target: badges.code });
  console.log(`✅ ${badgeSeed.length} badges ready`);

  // ---- Events -------------------------------------------------------------
  const inDays = (d: number, h = 20) => { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(h, 0, 0, 0); return t; };
  const eventSeed: (typeof events.$inferInsert)[] = [
    { city: "Bangalore", venueId: venueIds[1], title: "Rooftop Singles Mixer", type: "Mixer", description: "Meet new people over sunset cocktails.", startsAt: inDays(3), endsAt: inDays(3, 23), price: 0, capacity: 60, status: "upcoming", imageUrl: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80" },
    { city: "Bangalore", venueId: venueIds[0], title: "Trivia & Brews Night", type: "Game Night", description: "Team trivia with craft beer on tap.", startsAt: inDays(6), endsAt: inDays(6, 23), price: 200, capacity: 40, status: "upcoming", imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80" },
  ];
  for (const e of eventSeed) await ensureEvent(e);
  console.log(`✅ ${eventSeed.length} events ready`);

  console.log("\n🎉 Seed complete.");
}

seed()
  .then(async () => { await pool.end(); process.exit(0); })
  .catch(async (err) => { console.error("❌ Seed failed:", err); await pool.end().catch(() => {}); process.exit(1); });
