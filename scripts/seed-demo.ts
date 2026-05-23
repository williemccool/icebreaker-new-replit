import { db } from "../db";
import { venues, rooms, events, roomPresence, tickets } from "../shared/schema";
import { eq } from "drizzle-orm";

const now = new Date();
const todayAt = (h: number, m = 0) => {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
  return d;
};
// Slot returns a {start, end} pair that always satisfies start < end, rolling
// both forward to tomorrow together if start is already past.
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

// Safety: this script wipes ALL rooms/events/tickets. Refuse to run in
// production unless explicitly forced with SEED_WIPE=1.
if (process.env.NODE_ENV === "production" && process.env.SEED_WIPE !== "1") {
  console.error("Refusing to wipe rooms/events/tickets in production. Set SEED_WIPE=1 to override.");
  process.exit(1);
}

async function main() {
  const allVenues = await db.select().from(venues);
  if (allVenues.length === 0) {
    console.error("No venues found. Seed venues first.");
    process.exit(1);
  }
  const byName = (s: string) => allVenues.find((v) => v.name.toLowerCase().includes(s.toLowerCase())) || allVenues[0];

  const toit = byName("toit");
  const social = byName("social");
  const skyye = byName("skyye") || byName("sky");
  const prost = byName("prost") || byName("brew");
  const lord = byName("lord") || byName("loft") || allVenues[allVenues.length - 1];

  // Clear stale rooms/events so this is repeatable
  await db.delete(roomPresence);
  await db.delete(rooms);
  await db.delete(tickets);
  await db.delete(events);

  // ============ ROOMS — live or starting soon ============
  const r1 = slot(19, 0, 6);
  const r2 = slot(20, 0, 4.5);
  const r3 = slot(18, 30, 4);
  const r4 = slot(21, 30, 4.5);
  const r5 = slot(20, 0, 4); // may roll to tomorrow if past
  const roomsSeed = [
    { venueId: toit.id, name: "Friday Vibes @ Toit 🍺", capacity: 20, startsAt: r1.start, endsAt: r1.end, virtual: true, premium: false, active: true },
    { venueId: social.id, name: "Indiranagar Social Pre-Game 🎶", capacity: 15, startsAt: r2.start, endsAt: r2.end, virtual: true, premium: false, active: true },
    { venueId: skyye.id, name: "Skyye Rooftop Sunset 🌇", capacity: 12, startsAt: r3.start, endsAt: r3.end, virtual: false, premium: true, active: true },
    { venueId: prost.id, name: "Prost Late Night Lounge 🥂", capacity: 18, startsAt: r4.start, endsAt: r4.end, virtual: true, premium: false, active: true },
    { venueId: lord.id, name: "Loft Saturday Warm-up 🎧", capacity: 25, startsAt: r5.start, endsAt: r5.end, virtual: true, premium: false, active: true },
  ];
  const insertedRooms = await db.insert(rooms).values(roomsSeed).returning();
  console.log(`Inserted ${insertedRooms.length} rooms`);

  // ============ EVENTS — upcoming this week ============
  const eventsSeed = [
    {
      city: "Bangalore",
      venueId: toit.id,
      title: "Singles Mixer @ Toit",
      type: "mixer",
      description: "Curated singles night with hosted icebreakers, signature pours and live indie set. Limited entry, premium crowd.",
      startsAt: tomorrowAt(20, 0),
      endsAt: tomorrowAt(23, 30),
      price: 799,
      capacity: 60,
      status: "upcoming" as const,
      imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80",
    },
    {
      city: "Bangalore",
      venueId: social.id,
      title: "Indie Night: Live + Match",
      type: "live_music",
      description: "Indie acoustic sets, themed conversation booths, and a soft icebreaker game between sets.",
      startsAt: daysAhead(2, 19),
      endsAt: daysAhead(2, 23),
      price: 499,
      capacity: 80,
      status: "upcoming" as const,
      imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80",
    },
    {
      city: "Bangalore",
      venueId: skyye.id,
      title: "Skyye Rooftop Sundowner",
      type: "sundowner",
      description: "Golden-hour rooftop with curated playlists, paired tastings, and the Icebreaker Zone open all evening.",
      startsAt: daysAhead(3, 18),
      endsAt: daysAhead(3, 22),
      price: 1299,
      capacity: 40,
      status: "upcoming" as const,
      imageUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80",
    },
    {
      city: "Bangalore",
      venueId: prost.id,
      title: "Prost Trivia & Tipples",
      type: "trivia",
      description: "Mixed-team pub trivia. Get matched into a team of strangers and break the ice round by round.",
      startsAt: daysAhead(4, 19),
      endsAt: daysAhead(4, 22),
      price: 349,
      capacity: 50,
      status: "upcoming" as const,
      imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&q=80",
    },
    {
      city: "Bangalore",
      venueId: lord.id,
      title: "Loft Saturday Night",
      type: "party",
      description: "Bangalore's premium Saturday night. Dress code: smart casual. Mixology pop-up and surprise live act.",
      startsAt: daysAhead(5, 21),
      endsAt: daysAhead(6, 2),
      price: 999,
      capacity: 120,
      status: "upcoming" as const,
      imageUrl: "https://images.unsplash.com/photo-1571266028243-d220c6e5e1b3?w=1200&q=80",
    },
    {
      city: "Bangalore",
      venueId: toit.id,
      title: "Sunday Brunch & Bonds",
      type: "brunch",
      description: "Easy Sunday brunch with conversation starters and a chill, no-pressure crowd.",
      startsAt: daysAhead(6, 12),
      endsAt: daysAhead(6, 16),
      price: 599,
      capacity: 45,
      status: "upcoming" as const,
      imageUrl: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&q=80",
    },
  ];
  const insertedEvents = await db.insert(events).values(eventsSeed).returning();
  console.log(`Inserted ${insertedEvents.length} events`);

  console.log("Demo seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
