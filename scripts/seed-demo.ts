import { db } from "../db";
import { 
  users, cubeWallets, preferences, checkIns, roomPresence, 
  swipes, matches, messages, leaderboards, seasons, rooms, venues,
  questProgress, quests
} from "../shared/schema";
import { eq, and, isNull } from "drizzle-orm";

const DEMO_USERS = [
  {
    phone: "9900000001",
    name: "Ananya Sharma",
    dob: new Date("1998-07-15"),
    gender: "female" as const,
    city: "Bangalore",
    bio: "Design nerd by day, karaoke queen by night. Will judge your playlist.",
    photos: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80"],
    interests: ["Music", "Art", "Cocktails"],
    verified: true
  },
  {
    phone: "9900000002",
    name: "Riya Patel",
    dob: new Date("1999-03-22"),
    gender: "female" as const,
    city: "Bangalore",
    bio: "Startup founder who knows every rooftop bar in Koramangala. Always down for a good whiskey sour.",
    photos: ["https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80"],
    interests: ["Startups", "Whiskey", "Rooftops"],
    verified: true
  },
  {
    phone: "9900000003",
    name: "Meera Krishnan",
    dob: new Date("1997-11-05"),
    gender: "female" as const,
    city: "Bangalore",
    bio: "Classical dancer meets electronic music. The duality is real.",
    photos: ["https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80"],
    interests: ["Dance", "EDM", "Coffee"],
    verified: false
  },
  {
    phone: "9900000004",
    name: "Priya Desai",
    dob: new Date("2000-01-18"),
    gender: "female" as const,
    city: "Bangalore",
    bio: "Foodie exploring every hidden gem in Bangalore. Biryani is a love language.",
    photos: ["https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80"],
    interests: ["Food", "Travel", "Photography"],
    verified: true
  },
  {
    phone: "9900000005",
    name: "Kavya Reddy",
    dob: new Date("1998-09-30"),
    gender: "female" as const,
    city: "Bangalore",
    bio: "Product manager by day. Mixologist experiments at home. Try my negroni.",
    photos: ["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80"],
    interests: ["Mixology", "Tech", "Yoga"],
    verified: true
  },
  {
    phone: "9900000006",
    name: "Arjun Mehta",
    dob: new Date("1996-05-12"),
    gender: "male" as const,
    city: "Bangalore",
    bio: "Stand-up comedy enthusiast. Will make you laugh or buy you a drink trying.",
    photos: ["https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80"],
    interests: ["Comedy", "Beer", "Cricket"],
    verified: true
  },
  {
    phone: "9900000007",
    name: "Vikram Singh",
    dob: new Date("1995-08-25"),
    gender: "male" as const,
    city: "Bangalore",
    bio: "Music producer. If you hear bass at 2 AM, that's probably me. Sorry, neighbors.",
    photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80"],
    interests: ["Music Production", "Vinyl", "Late Nights"],
    verified: true
  },
  {
    phone: "9900000008",
    name: "Rahul Nair",
    dob: new Date("1997-12-03"),
    gender: "male" as const,
    city: "Bangalore",
    bio: "Architect who appreciates good design — buildings, cocktails, or conversations.",
    photos: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80"],
    interests: ["Architecture", "Design", "Wine"],
    verified: false
  },
  {
    phone: "9900000009",
    name: "Karan Gupta",
    dob: new Date("1998-04-20"),
    gender: "male" as const,
    city: "Bangalore",
    bio: "Engineer turned DJ. My weekend sets at Toit are legendary (according to me).",
    photos: ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80"],
    interests: ["DJing", "Craft Beer", "Running"],
    verified: true
  },
  {
    phone: "9900000010",
    name: "Aditya Rao",
    dob: new Date("1996-02-14"),
    gender: "male" as const,
    city: "Bangalore",
    bio: "VC by day, bar trivia champion by night. Ask me anything about 90s Bollywood.",
    photos: ["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=80"],
    interests: ["Trivia", "Investments", "Bollywood"],
    verified: true
  },
  {
    phone: "9900000011",
    name: "Sneha Iyer",
    dob: new Date("1999-06-08"),
    gender: "female" as const,
    city: "Bangalore",
    bio: "Photographer chasing golden hour and good company. Let's explore a new cafe?",
    photos: ["https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80"],
    interests: ["Photography", "Cafes", "Sunsets"],
    verified: true
  },
  {
    phone: "9900000012",
    name: "Nisha Jain",
    dob: new Date("2000-10-25"),
    gender: "female" as const,
    city: "Bangalore",
    bio: "Fitness coach who parties harder than she trains. Balance is key.",
    photos: ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80"],
    interests: ["Fitness", "Dancing", "Healthy Food"],
    verified: false
  },
  {
    phone: "9900000013",
    name: "Tara Bhat",
    dob: new Date("1997-03-17"),
    gender: "female" as const,
    city: "Bangalore",
    bio: "Writer working on her first novel. The best chapters come after midnight conversations.",
    photos: ["https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80"],
    interests: ["Writing", "Books", "Wine Bars"],
    verified: true
  },
  {
    phone: "9900000014",
    name: "Dev Kapoor",
    dob: new Date("1995-11-30"),
    gender: "male" as const,
    city: "Bangalore",
    bio: "Chef who can cook you anything. My butter chicken has ended arguments.",
    photos: ["https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80"],
    interests: ["Cooking", "Fine Dining", "Travel"],
    verified: true
  },
  {
    phone: "9900000015",
    name: "Zara Khan",
    dob: new Date("1999-08-12"),
    gender: "female" as const,
    city: "Bangalore",
    bio: "Fashion designer with an obsession for streetwear and street food. Contradictions are my brand.",
    photos: ["https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80"],
    interests: ["Fashion", "Street Food", "Art"],
    verified: true
  }
];

async function seedDemo() {
  console.log("🎭 Seeding DEMO mode data...\n");

  try {
    // Get existing venues
    const allVenues = await db.select().from(venues);
    if (allVenues.length === 0) {
      console.error("❌ No venues found. Run the base seed first: npx tsx scripts/seed.ts");
      process.exit(1);
    }
    console.log(`✅ Found ${allVenues.length} venues`);

    // Get existing rooms
    const allRooms = await db.select().from(rooms);
    console.log(`✅ Found ${allRooms.length} rooms`);

    // Update rooms to always be "tonight" with rolling times
    const now = new Date();
    const tonightStart = new Date(now);
    tonightStart.setHours(19, 0, 0, 0);
    if (now.getHours() >= 0 && now.getHours() < 6) {
      tonightStart.setDate(tonightStart.getDate() - 1);
    }
    const tonightEnd = new Date(tonightStart);
    tonightEnd.setHours(23, 59, 0, 0);
    // Ensure endsAt is always in the future (at least 3 hours from now)
    const minEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const actualEnd = tonightEnd > minEnd ? tonightEnd : minEnd;

    for (const room of allRooms) {
      await db.update(rooms)
        .set({ startsAt: tonightStart, endsAt: actualEnd, active: true })
        .where(eq(rooms.id, room.id));
    }
    console.log(`✅ Updated ${allRooms.length} rooms to tonight (rolling times)`);

    // Insert demo users (skip if already exist by phone)
    const insertedUsers: any[] = [];
    for (const u of DEMO_USERS) {
      const [existing] = await db.select().from(users).where(eq(users.phone, u.phone)).limit(1);
      if (existing) {
        insertedUsers.push(existing);
        continue;
      }
      const [created] = await db.insert(users).values(u).returning();
      insertedUsers.push(created);
      
      // Create wallet
      await db.insert(cubeWallets).values({
        userId: created.id,
        balance: created.gender === "female" ? 500 : 300,
        totalEarned: created.gender === "female" ? 500 : 300,
        totalSpent: 0
      });
      
      // Create preferences
      await db.insert(preferences).values({ userId: created.id });
    }
    console.log(`✅ ${insertedUsers.length} demo users ready`);

    // Get the main demo user — the real tester account (phone 8095411567), not a demo user
    const demoPhones = DEMO_USERS.map(u => u.phone);
    const allUsers = await db.select().from(users);
    const mainUser = allUsers.find(u => !demoPhones.includes(u.phone));
    if (!mainUser) {
      console.log("⚠️  No real user account found. Create an account first via the app, then re-run.");
      console.log("   Seeding demo users, check-ins, and rooms anyway...\n");
    } else {
      console.log(`✅ Main user found: ${mainUser.name || mainUser.phone} (id=${mainUser.id})`);
    }

    // Clear stale check-ins and room presence for demo users before re-seeding
    for (const u of insertedUsers) {
      await db.update(checkIns)
        .set({ checkedOutAt: new Date() })
        .where(and(eq(checkIns.userId, u.id), isNull(checkIns.checkedOutAt)));
      await db.update(roomPresence)
        .set({ leftAt: new Date() })
        .where(and(eq(roomPresence.userId, u.id), isNull(roomPresence.leftAt)));
    }

    // Venue check-ins for demo users
    const toitId = allVenues[0]?.id;
    const skyyeId = allVenues[1]?.id;
    const socialId = allVenues[2]?.id;

    // Check in users to venues (fresh)
    const venueAssignments = [
      { users: [0, 1, 2, 5, 6, 10], venueId: toitId },    // 6 people at Toit
      { users: [3, 4, 7, 11, 14], venueId: skyyeId },      // 5 people at Skyye
      { users: [8, 9, 12, 13], venueId: socialId },         // 4 people at Social
    ];

    let checkInCount = 0;
    for (const assignment of venueAssignments) {
      for (const idx of assignment.users) {
        const u = insertedUsers[idx];
        if (!u) continue;
        await db.insert(checkIns).values({
          userId: u.id,
          venueId: assignment.venueId,
          cubesEarned: 10,
          xpEarned: 5
        });
        checkInCount++;
      }
    }
    console.log(`✅ ${checkInCount} venue check-ins created`);

    // Room presence — put users in rooms
    const roomAssignments = [
      { users: [0, 1, 5, 6, 10, 2], roomId: allRooms[0]?.id },     // 6 in room 1 (4F, 2M)
      { users: [3, 4, 7, 14], roomId: allRooms[1]?.id },            // 4 in room 2 (3F, 1M)
      { users: [8, 9, 11, 12, 13], roomId: allRooms[2]?.id },       // 5 in room 3 (2F, 3M)
    ];

    let presenceCount = 0;
    for (const assignment of roomAssignments) {
      if (!assignment.roomId) continue;
      for (const idx of assignment.users) {
        const u = insertedUsers[idx];
        if (!u) continue;
        await db.insert(roomPresence).values({
          roomId: assignment.roomId,
          userId: u.id,
          joinedAt: new Date(Date.now() - Math.random() * 30 * 60000)
        });
        presenceCount++;
      }
    }
    console.log(`✅ ${presenceCount} room presence records created`);

    // Create matches and swipe data for the main user (if exists)
    if (mainUser) {
      // Ensure main user has a wallet
      const [mainWallet] = await db.select().from(cubeWallets).where(eq(cubeWallets.userId, mainUser.id)).limit(1);
      if (!mainWallet) {
        await db.insert(cubeWallets).values({
          userId: mainUser.id,
          balance: 500,
          totalEarned: 500,
          totalSpent: 0
        });
      } else if (mainWallet.balance! < 300) {
        await db.update(cubeWallets)
          .set({ balance: 500, totalEarned: 500 })
          .where(eq(cubeWallets.userId, mainUser.id));
      }

      // Create mutual swipes and matches with 3 demo users
      const matchTargets = [
        { user: insertedUsers[0], venueId: toitId },   // Ananya at Toit
        { user: insertedUsers[1], venueId: toitId },   // Riya at Toit
        { user: insertedUsers[3], venueId: skyyeId },  // Priya at Skyye
      ];

      let matchCount = 0;
      for (const target of matchTargets) {
        if (!target.user) continue;
        
        // Check if match already exists
        const existingMatches = await db.select().from(matches)
          .where(eq(matches.userAId, mainUser.id));
        const existingMatches2 = await db.select().from(matches)
          .where(eq(matches.userBId, mainUser.id));
        const allUserMatches = [...existingMatches, ...existingMatches2];
        const alreadyMatched = allUserMatches.some(m => 
          m.userAId === target.user.id || m.userBId === target.user.id
        );
        
        if (alreadyMatched) continue;

        // Create mutual swipes
        await db.insert(swipes).values({ swiperId: mainUser.id, swipedId: target.user.id, liked: true });
        await db.insert(swipes).values({ swiperId: target.user.id, swipedId: mainUser.id, liked: true });

        // Create match
        const [match] = await db.insert(matches).values({
          userAId: mainUser.id,
          userBId: target.user.id,
          venueId: target.venueId,
          status: "matched"
        }).returning();

        // Seed some messages for the first match
        if (matchCount === 0) {
          await db.insert(messages).values([
            { matchId: match.id, senderId: target.user.id, body: "Hey! I saw you at Toit tonight 👋", meta: {} },
            { matchId: match.id, senderId: mainUser.id, body: "Hey! Yeah their wheat beer is amazing tonight", meta: {} },
            { matchId: match.id, senderId: target.user.id, body: "Omg yes! Have you tried the new pale ale? 🍺", meta: {} },
          ]);
        }

        matchCount++;
      }
      console.log(`✅ ${matchCount} matches created for main user`);

      // Also make swipes from other demo users toward main user (for discover feed)
      for (let i = 4; i < insertedUsers.length; i++) {
        const u = insertedUsers[i];
        if (!u) continue;
        const [existingSwipe] = await db.select().from(swipes)
          .where(and(eq(swipes.swiperId, u.id), eq(swipes.swipedId, mainUser.id)))
          .limit(1);
        if (!existingSwipe) {
          await db.insert(swipes).values({ swiperId: u.id, swipedId: mainUser.id, liked: true });
        }
      }
      console.log(`✅ Incoming swipes created (main user will match on "like")`);
    }

    // Leaderboard entries
    const [currentSeason] = await db.select().from(seasons).where(eq(seasons.active, true)).limit(1);
    if (currentSeason) {
      const leaderboardData = insertedUsers.map((u, i) => ({
        seasonId: currentSeason.id,
        userId: u.id,
        score: Math.floor(500 - i * 30 + Math.random() * 50),
        city: "Bangalore"
      }));

      // Add main user to leaderboard too
      if (mainUser) {
        leaderboardData.push({
          seasonId: currentSeason.id,
          userId: mainUser.id,
          score: 420,
          city: "Bangalore"
        });
      }

      for (const entry of leaderboardData) {
        const [existing] = await db.select().from(leaderboards)
          .where(and(
            eq(leaderboards.seasonId, entry.seasonId),
            eq(leaderboards.userId, entry.userId)
          ))
          .limit(1);
        if (!existing) {
          await db.insert(leaderboards).values(entry);
        }
      }
      console.log(`✅ Leaderboard seeded with ${leaderboardData.length} entries`);
    }

    // Quest progress for main user
    if (mainUser) {
      const allQuests = await db.select().from(quests);
      const progressData = [
        { code: "FIRST_CHECKIN", progress: 1 },
        { code: "FIRST_MATCH", progress: 1 },
        { code: "VENUE_HOPPER", progress: 2 },
        { code: "CHAT_STARTER", progress: 1 },
      ];
      for (const pd of progressData) {
        const quest = allQuests.find(q => q.code === pd.code);
        if (!quest) continue;
        const [existing] = await db.select().from(questProgress)
          .where(and(eq(questProgress.userId, mainUser.id), eq(questProgress.questId, quest.id)))
          .limit(1);
        if (!existing) {
          await db.insert(questProgress).values({
            userId: mainUser.id,
            questId: quest.id,
            progress: pd.progress,
            completedAt: pd.progress >= quest.goalValue ? new Date() : null
          });
        }
      }
      console.log(`✅ Quest progress seeded for main user`);
    }

    // Update demo user XP/levels for realism
    for (let i = 0; i < insertedUsers.length; i++) {
      const xp = Math.floor(50 + Math.random() * 200);
      const level = Math.floor(xp / 100) + 1;
      await db.update(users)
        .set({ xp, level })
        .where(eq(users.id, insertedUsers[i].id));
    }
    console.log(`✅ User XP/levels updated`);

    console.log("\n🎉 DEMO MODE SEEDED SUCCESSFULLY!");
    console.log("\n📊 Summary:");
    console.log(`   • ${insertedUsers.length} demo users with photos & bios`);
    console.log(`   • ${checkInCount} active venue check-ins`);
    console.log(`   • ${presenceCount} room presence records`);
    console.log(`   • Rooms updated to tonight (rolling times)`);
    console.log(`   • Matches, messages, swipes for main user`);
    console.log(`   • Leaderboard populated`);
    console.log(`   • Quest progress seeded`);
    console.log("\n🔑 Demo flow:");
    console.log("   1. Log in with your phone → Go to Venues → Check in to Toit");
    console.log("   2. See 6 people with photos in 'Who's Here'");
    console.log("   3. Tap a user → Gift them a drink");
    console.log("   4. Go to Rooms → See 3 live rooms with real participant counts");
    console.log("   5. Join a room → Swipe on profiles → Match!");
    console.log("   6. Go to Matches → See 3 pre-existing matches with messages");
    console.log("   7. Open a match → Start Icebreaker Game → Responses save to chat");
    console.log("   8. Chat freely → Plan a date");

  } catch (error: any) {
    console.error("❌ Demo seed error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

seedDemo();
