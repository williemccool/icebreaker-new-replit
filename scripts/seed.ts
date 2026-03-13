import { db } from "../db";
import { venues, rooms, events, seasons, quests, badges } from "../shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Seed partner venues (Bangalore)
    const insertedVenues = await db.insert(venues).values([
      {
        name: "Toit Brewpub",
        type: "Microbrewery",
        address: "298, 100 Feet Road, Indiranagar, Bangalore",
        area: "Indiranagar",
        city: "Bangalore",
        partner: true,
        perks: ["First drink free on check-in", "10% off food for Icebreaker users", "Priority seating on weekends"],
        description: "Bangalore's favorite microbrewery serving handcrafted beers in a vibrant setting.",
        lat: "12.9716",
        lng: "77.6412"
      },
      {
        name: "Skyye Urban Bar & Kitchen",
        type: "Rooftop Bar",
        address: "UB City Mall, 24, Vittal Mallya Road, Bengaluru",
        area: "UB City",
        city: "Bangalore",
        partner: true,
        perks: ["Free entry with Icebreaker app", "Happy Hour 5–7 PM", "Complimentary welcome drink"],
        description: "Rooftop bar with panoramic city views, craft cocktails and live DJ sets.",
        lat: "12.9719",
        lng: "77.5987"
      },
      {
        name: "Social Koramangala",
        type: "Community Bar",
        address: "118, 6th B Cross Rd, Koramangala, Bengaluru",
        area: "Koramangala",
        city: "Bangalore",
        partner: true,
        perks: ["Skip the queue with app", "Co-working access 9 AM–5 PM", "15% off cocktails"],
        description: "Where work meets play. Vibrant all-day hangout with great food and cocktails.",
        lat: "12.9340",
        lng: "77.6169"
      },
      {
        name: "The Humming Tree",
        type: "Live Music Venue",
        address: "12th Main, Indiranagar, Bengaluru",
        area: "Indiranagar",
        city: "Bangalore",
        partner: true,
        perks: ["Guest list priority", "Drink tokens on check-in", "Meet artist backstage"],
        description: "Bangalore's premier live music venue hosting local and international artists.",
        lat: "12.9784",
        lng: "77.6408"
      },
      {
        name: "High Ultra Lounge",
        type: "Nightclub",
        address: "UB City Mall, 4th Floor, Bengaluru",
        area: "UB City",
        city: "Bangalore",
        partner: false,
        perks: ["Members-only section access", "Discounted cover charge"],
        description: "The city's most iconic rooftop nightclub with world-class DJs.",
        lat: "12.9720",
        lng: "77.5990"
      }
    ]).returning();

    console.log(`✅ ${insertedVenues.length} venues seeded`);

    // Seed a current season
    const now = new Date();
    const seasonEnd = new Date(now);
    seasonEnd.setDate(seasonEnd.getDate() + 42); // 6 weeks

    const [season] = await db.insert(seasons).values({
      title: "Season 1: Bangalore Ignite",
      startDate: now,
      endDate: seasonEnd,
      active: true
    }).returning();

    console.log("✅ Season 1 created");

    // Seed quests
    await db.insert(quests).values([
      {
        seasonId: season.id,
        code: "FIRST_CHECKIN",
        title: "First Night Out",
        description: "Check in to your first partner venue",
        goalType: "checkin_count",
        goalValue: 1,
        rewardCubes: 50,
        rewardXp: 10,
        active: true
      },
      {
        seasonId: season.id,
        code: "FIRST_MATCH",
        title: "Breaking the Ice",
        description: "Get your very first match",
        goalType: "match_count",
        goalValue: 1,
        rewardCubes: 100,
        rewardXp: 20,
        active: true
      },
      {
        seasonId: season.id,
        code: "VENUE_HOPPER",
        title: "Venue Hopper",
        description: "Check in to 3 different venues",
        goalType: "unique_venue_checkins",
        goalValue: 3,
        rewardCubes: 150,
        rewardXp: 30,
        active: true
      },
      {
        seasonId: season.id,
        code: "SOCIAL_BUTTERFLY",
        title: "Social Butterfly",
        description: "Check in to 5 different venues",
        goalType: "unique_venue_checkins",
        goalValue: 5,
        rewardCubes: 300,
        rewardXp: 60,
        active: true
      },
      {
        seasonId: season.id,
        code: "CHAT_STARTER",
        title: "Conversation Starter",
        description: "Send your first message to a match",
        goalType: "messages_sent",
        goalValue: 1,
        rewardCubes: 30,
        rewardXp: 5,
        active: true
      },
      {
        seasonId: season.id,
        code: "EVENT_GOER",
        title: "Event Goer",
        description: "Attend your first Icebreaker event",
        goalType: "events_attended",
        goalValue: 1,
        rewardCubes: 200,
        rewardXp: 50,
        active: true
      }
    ]);

    console.log("✅ Quests seeded");

    // Seed badges
    await db.insert(badges).values([
      { code: "EARLY_ADOPTER", name: "Early Adopter", description: "Joined Icebreaker during the launch week" },
      { code: "VENUE_EXPLORER", name: "Venue Explorer", description: "Checked in at 5+ different venues" },
      { code: "MATCH_MAKER", name: "Match Maker", description: "Made 10+ matches" },
      { code: "CREW_CAPTAIN", name: "Crew Captain", description: "Created a crew and recruited 3+ members" },
      { code: "CERTIFIED_SAFE", name: "Certified Safe", description: "Verified identity with selfie check" },
      { code: "NIGHT_OWL", name: "Night Owl", description: "Checked in after midnight 5 times" },
      { code: "CUBE_HOARDER", name: "Cube Hoarder", description: "Accumulated 1000+ Cubes" }
    ]);

    console.log("✅ Badges seeded");

    // Seed virtual rooms (tonight's sessions)
    const tonight = new Date(now);
    tonight.setHours(20, 0, 0, 0);
    const tonightEnd = new Date(tonight);
    tonightEnd.setHours(23, 59, 0, 0);

    if (insertedVenues.length > 0) {
      await db.insert(rooms).values([
        {
          venueId: insertedVenues[0].id,
          name: "Friday Vibes @ Toit 🍺",
          capacity: 20,
          startsAt: tonight,
          endsAt: tonightEnd,
          virtual: true,
          premium: false,
          active: true
        },
        {
          venueId: insertedVenues[1].id,
          name: "Rooftop Sunset Session ✨",
          capacity: 15,
          startsAt: tonight,
          endsAt: tonightEnd,
          virtual: true,
          premium: true,
          active: true
        },
        {
          venueId: insertedVenues[2].id,
          name: "Koramangala Crew Night 🎉",
          capacity: 12,
          startsAt: tonight,
          endsAt: tonightEnd,
          virtual: true,
          premium: false,
          active: true
        }
      ]);
      console.log("✅ Virtual rooms seeded");

      // Seed upcoming events
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(19, 0, 0, 0);
      const nextWeekEnd = new Date(nextWeek);
      nextWeekEnd.setHours(23, 0, 0, 0);

      const nextWeek2 = new Date(now);
      nextWeek2.setDate(nextWeek2.getDate() + 14);
      nextWeek2.setHours(19, 0, 0, 0);
      const nextWeek2End = new Date(nextWeek2);
      nextWeek2End.setHours(23, 0, 0, 0);

      await db.insert(events).values([
        {
          city: "Bangalore",
          venueId: insertedVenues[0].id,
          title: "Speed Dating Night — Indiranagar Edition",
          type: "Speed Dating",
          description: "Meet 10+ singles in a fun, structured evening. Hosted by our team with icebreaker games, speed rounds, and cocktail hour. Zero awkwardness guaranteed!",
          startsAt: nextWeek,
          endsAt: nextWeekEnd,
          price: 0,
          capacity: 40,
          status: "upcoming"
        },
        {
          city: "Bangalore",
          venueId: insertedVenues[3].id,
          title: "Singles Night — Live Music Mixer",
          type: "Mixer",
          description: "Live music, great vibes, and the chance to meet someone special. Our team hosts activities between sets to keep the energy high.",
          startsAt: nextWeek2,
          endsAt: nextWeek2End,
          price: 299,
          capacity: 60,
          status: "upcoming"
        }
      ]);

      console.log("✅ Events seeded");
    }

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   • ${insertedVenues.length} partner venues (Bangalore)`);
    console.log("   • 1 active season");
    console.log("   • 6 quests");
    console.log("   • 7 badges");
    console.log("   • 3 virtual rooms (tonight)");
    console.log("   • 2 upcoming events");

  } catch (error: any) {
    console.error("❌ Seeding error:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

seed();
