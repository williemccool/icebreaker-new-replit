import type { Express } from "express";
  import { createServer, type Server } from "http";
  import { Server as SocketServer } from "socket.io";
  import { db } from "../db";
  import { 
    users, otpVerifications, preferences, swipes, matches, messages,
    venues, checkIns, rooms, roomPresence, events, tickets,
    cubeWallets, cubeTransactions, quests, questProgress, seasons,
    leaderboards, subscriptions, drinkGifts, dateBookings, crews, crewMembers, badges, userBadges
  } from "@shared/schema";
  import { eq, and, or, desc, sql, gte, lte, isNull } from "drizzle-orm";
  import bcrypt from "bcryptjs";
  import jwt from "jsonwebtoken";
  import { nanoid } from "nanoid";

  const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

  // Middleware to verify JWT token
  export function authMiddleware(req: any, res: any, next: any) {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      req.userId = decoded.userId;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  export function registerRoutes(app: Express): Server {
    const httpServer = createServer(app);
    const io = new SocketServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Socket.IO for real-time features
    const activeUsers = new Map<number, string>();
    
    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);
      
      socket.on("user:online", (userId: number) => {
        activeUsers.set(userId, socket.id);
        socket.join(`user:${userId}`);
      });
      
      socket.on("room:join", async ({ roomId, userId }) => {
        socket.join(`room:${roomId}`);
        
        // Record room presence
        await db.insert(roomPresence).values({
          roomId,
          userId,
          joinedAt: new Date()
        });
        
        // Broadcast to room
        io.to(`room:${roomId}`).emit("room:user_joined", { userId });
        
        // Get current room users
        const presences = await db.select().from(roomPresence)
          .where(and(
            eq(roomPresence.roomId, roomId),
            isNull(roomPresence.leftAt)
          ));
        
        socket.emit("room:current_users", presences);
      });
      
      socket.on("room:leave", async ({ roomId, userId }) => {
        socket.leave(`room:${roomId}`);
        
        // Update room presence
        await db.update(roomPresence)
          .set({ leftAt: new Date() })
          .where(and(
            eq(roomPresence.roomId, roomId),
            eq(roomPresence.userId, userId),
            isNull(roomPresence.leftAt)
          ));
        
        io.to(`room:${roomId}`).emit("room:user_left", { userId });
      });
      
      socket.on("message:send", async (data) => {
        const { matchId, senderId, body } = data;
        
        const [message] = await db.insert(messages).values({
          matchId,
          senderId,
          body,
          meta: {}
        }).returning();
        
        io.to(`match:${matchId}`).emit("message:received", message);
      });
      
      socket.on("disconnect", () => {
        // Remove from active users
        for (const [userId, socketId] of activeUsers.entries()) {
          if (socketId === socket.id) {
            activeUsers.delete(userId);
            break;
          }
        }
      });
    });

    // ============ AUTH ROUTES ============
    
    // Send OTP
    app.post("/api/auth/send-otp", async (req, res) => {
      try {
        const { phone } = req.body;
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        await db.insert(otpVerifications).values({
          phone,
          otp,
          expiresAt,
          verified: false
        });
        
        // TODO: Send actual SMS via Twilio
        console.log(`OTP for ${phone}: ${otp}`);
        
        res.json({ success: true, message: "OTP sent successfully" });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Verify OTP & Register/Login
    app.post("/api/auth/verify-otp", async (req, res) => {
      try {
        const { phone, otp } = req.body;
        
        const [verification] = await db.select().from(otpVerifications)
          .where(and(
            eq(otpVerifications.phone, phone),
            eq(otpVerifications.otp, otp),
            eq(otpVerifications.verified, false),
            gte(otpVerifications.expiresAt, new Date())
          ))
          .limit(1);
        
        if (!verification) {
          return res.status(400).json({ error: "Invalid or expired OTP" });
        }
        
        // Mark as verified
        await db.update(otpVerifications)
          .set({ verified: true })
          .where(eq(otpVerifications.id, verification.id));
        
        // Check if user exists
        let [user] = await db.select().from(users)
          .where(eq(users.phone, phone))
          .limit(1);
        
        const isNewUser = !user;
        
        if (!user) {
          // Create new user
          [user] = await db.insert(users).values({
            phone,
            name: "",
            dob: new Date(),
            gender: "male",
            city: "",
            verified: false
          }).returning();
          
          // Create wallet and preferences
          await db.insert(cubeWallets).values({
            userId: user.id,
            balance: user.gender === "female" ? 200 : 100 // Women get 2x starting cubes
          });
          
          await db.insert(preferences).values({
            userId: user.id
          });
        }
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        
        res.json({ 
          success: true, 
          token,
          user,
          isNewUser
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ USER ROUTES ============
    
    // Get current user
    app.get("/api/user/me", authMiddleware, async (req: any, res) => {
      try {
        const [user] = await db.select().from(users)
          .where(eq(users.id, req.userId))
          .limit(1);
        
        const [wallet] = await db.select().from(cubeWallets)
          .where(eq(cubeWallets.userId, req.userId))
          .limit(1);
        
        const [prefs] = await db.select().from(preferences)
          .where(eq(preferences.userId, req.userId))
          .limit(1);
        
        res.json({ user, wallet, preferences: prefs });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Update user profile
    app.put("/api/user/profile", authMiddleware, async (req: any, res) => {
      try {
        const updates = req.body;
        
        // Convert date strings to Date objects for Drizzle
        if (updates.dob && typeof updates.dob === "string") {
          updates.dob = new Date(updates.dob);
        }
        
        const [updated] = await db.update(users)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(users.id, req.userId))
          .returning();
        
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Update preferences
    app.put("/api/user/preferences", authMiddleware, async (req: any, res) => {
      try {
        const updates = req.body;
        
        const [updated] = await db.update(preferences)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(preferences.userId, req.userId))
          .returning();
        
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ VENUE ROUTES ============
    
    // Get all venues
    app.get("/api/venues", async (req, res) => {
      try {
        const { city, type } = req.query;
        
        let query = db.select().from(venues);
        
        if (city) {
          query = query.where(eq(venues.city, city as string)) as any;
        }
        
        const allVenues = await query;
        
        // Get check-in counts
        const venueList = await Promise.all(allVenues.map(async (venue) => {
          const [count] = await db.select({ count: sql<number>`count(*)` })
            .from(checkIns)
            .where(and(
              eq(checkIns.venueId, venue.id),
              isNull(checkIns.checkedOutAt)
            ));
          
          return {
            ...venue,
            peopleHere: Number(count?.count || 0)
          };
        }));
        
        res.json(venueList);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get venue by ID
    app.get("/api/venues/:id", async (req, res) => {
      try {
        const [venue] = await db.select().from(venues)
          .where(eq(venues.id, parseInt(req.params.id)))
          .limit(1);
        
        if (!venue) {
          return res.status(404).json({ error: "Venue not found" });
        }
        
        // Get people currently checked in
        const checkedInUsers = await db.select({
          user: users,
          checkIn: checkIns
        })
        .from(checkIns)
        .innerJoin(users, eq(checkIns.userId, users.id))
        .where(and(
          eq(checkIns.venueId, venue.id),
          isNull(checkIns.checkedOutAt)
        ));
        
        res.json({ venue, checkedInUsers });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Check in to venue
    app.post("/api/venues/:id/check-in", authMiddleware, async (req: any, res) => {
      try {
        const venueId = parseInt(req.params.id);
        
        // Check if already checked in
        const [existing] = await db.select().from(checkIns)
          .where(and(
            eq(checkIns.userId, req.userId),
            eq(checkIns.venueId, venueId),
            isNull(checkIns.checkedOutAt)
          ))
          .limit(1);
        
        if (existing) {
          return res.status(400).json({ error: "Already checked in" });
        }
        
        const cubesEarned = 10;
        const xpEarned = 5;
        
        const [checkIn] = await db.insert(checkIns).values({
          userId: req.userId,
          venueId,
          cubesEarned,
          xpEarned
        }).returning();
        
        // Update wallet
        await db.update(cubeWallets)
          .set({ 
            balance: sql`balance + ${cubesEarned}`,
            totalEarned: sql`total_earned + ${cubesEarned}`
          })
          .where(eq(cubeWallets.userId, req.userId));
        
        // Add transaction
        await db.insert(cubeTransactions).values({
          userId: req.userId,
          kind: "earn",
          amount: cubesEarned,
          meta: { checkInId: checkIn.id, reason: "venue_checkin" }
        });
        
        // Update XP
        await db.update(users)
          .set({ xp: sql`xp + ${xpEarned}` })
          .where(eq(users.id, req.userId));
        
        res.json({ success: true, checkIn, cubesEarned, xpEarned });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Check out from venue
    app.post("/api/venues/check-out", authMiddleware, async (req: any, res) => {
      try {
        await db.update(checkIns)
          .set({ checkedOutAt: new Date() })
          .where(and(
            eq(checkIns.userId, req.userId),
            isNull(checkIns.checkedOutAt)
          ));
        
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ SWIPE & MATCH ROUTES ============
    
    // Get swipe candidates
    app.get("/api/discover/swipe", authMiddleware, async (req: any, res) => {
      try {
        const limit = 20;
        
        // Get already swiped IDs
        const swipedIds = await db.select({ id: swipes.swipedId })
          .from(swipes)
          .where(eq(swipes.swiperId, req.userId));
        
        const excludeIds = swipedIds.map(s => s.id);
        excludeIds.push(req.userId);
        
        // Get candidates
        const candidates = await db.select().from(users)
          .where(sql`id NOT IN (${excludeIds.join(',')})`)
          .limit(limit);
        
        res.json(candidates);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Swipe on user
    app.post("/api/swipe", authMiddleware, async (req: any, res) => {
      try {
        const { swipedId, liked } = req.body;
        
        // Record swipe
        await db.insert(swipes).values({
          swiperId: req.userId,
          swipedId,
          liked
        });
        
        if (!liked) {
          return res.json({ matched: false });
        }
        
        // Check if other user liked back
        const [reciprocalSwipe] = await db.select().from(swipes)
          .where(and(
            eq(swipes.swiperId, swipedId),
            eq(swipes.swipedId, req.userId),
            eq(swipes.liked, true)
          ))
          .limit(1);
        
        if (reciprocalSwipe) {
          // Create match
          const [match] = await db.insert(matches).values({
            userAId: req.userId,
            userBId: swipedId,
            status: "matched"
          }).returning();
          
          // Award cubes for matching
          const cubesEarned = 5;
          await db.update(cubeWallets)
            .set({ 
              balance: sql`balance + ${cubesEarned}`,
              totalEarned: sql`total_earned + ${cubesEarned}`
            })
            .where(eq(cubeWallets.userId, req.userId));
          
          return res.json({ matched: true, match });
        }
        
        res.json({ matched: false });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get user matches
    app.get("/api/matches", authMiddleware, async (req: any, res) => {
      try {
        const userMatches = await db.select().from(matches)
          .where(or(
            eq(matches.userAId, req.userId),
            eq(matches.userBId, req.userId)
          ));
        
        const matchesWithUsers = await Promise.all(userMatches.map(async (match) => {
          const otherId = match.userAId === req.userId ? match.userBId : match.userAId;
          const [other] = await db.select().from(users)
            .where(eq(users.id, otherId))
            .limit(1);
          
          // Get last message
          const [lastMsg] = await db.select().from(messages)
            .where(eq(messages.matchId, match.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);
          
          return {
            ...match,
            otherUser: other,
            lastMessage: lastMsg
          };
        }));
        
        res.json(matchesWithUsers);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get match messages
    app.get("/api/matches/:id/messages", authMiddleware, async (req: any, res) => {
      try {
        const matchId = parseInt(req.params.id);
        
        const msgs = await db.select().from(messages)
          .where(eq(messages.matchId, matchId))
          .orderBy(messages.createdAt);
        
        res.json(msgs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Send message
    app.post("/api/matches/:id/messages", authMiddleware, async (req: any, res) => {
      try {
        const matchId = parseInt(req.params.id);
        const { body } = req.body;
        
        const [message] = await db.insert(messages).values({
          matchId,
          senderId: req.userId,
          body,
          meta: {}
        }).returning();
        
        res.json(message);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ VIRTUAL ROOMS ROUTES ============
    
    // Get active rooms
    app.get("/api/rooms", async (req, res) => {
      try {
        const { venueId } = req.query;
        
        let query = db.select().from(rooms)
          .where(and(
            eq(rooms.active, true),
            gte(rooms.endsAt, new Date())
          ));
        
        if (venueId) {
          query = query.where(eq(rooms.venueId, parseInt(venueId as string))) as any;
        }
        
        const activeRooms = await query;
        
        // Get participant counts
        const roomsWithCounts = await Promise.all(activeRooms.map(async (room) => {
          const [count] = await db.select({ count: sql<number>`count(*)` })
            .from(roomPresence)
            .where(and(
              eq(roomPresence.roomId, room.id),
              isNull(roomPresence.leftAt)
            ));
          
          return {
            ...room,
            participants: Number(count?.count || 0)
          };
        }));
        
        res.json(roomsWithCounts);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ EVENTS ROUTES ============
    
    // Get events
    app.get("/api/events", async (req, res) => {
      try {
        const { city, type } = req.query;
        
        let query = db.select().from(events)
          .where(gte(events.startsAt, new Date()));
        
        if (city) {
          query = query.where(eq(events.city, city as string)) as any;
        }
        
        const eventList = await query.orderBy(events.startsAt);
        
        res.json(eventList);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Purchase event ticket
    app.post("/api/events/:id/purchase", authMiddleware, async (req: any, res) => {
      try {
        const eventId = parseInt(req.params.id);
        
        const [event] = await db.select().from(events)
          .where(eq(events.id, eventId))
          .limit(1);
        
        if (!event) {
          return res.status(404).json({ error: "Event not found" });
        }
        
        // Check wallet balance
        const [wallet] = await db.select().from(cubeWallets)
          .where(eq(cubeWallets.userId, req.userId))
          .limit(1);
        
        if ((wallet?.balance ?? 0) < (event.price ?? 0)) {
          return res.status(400).json({ error: "Insufficient cubes" });
        }
        
        // Create ticket
        const qrCode = nanoid(16);
        const [ticket] = await db.insert(tickets).values({
          eventId,
          userId: req.userId,
          qrCode,
          pricePaid: event.price ?? 0
        }).returning();
        
        // Deduct from wallet
        if ((event.price ?? 0) > 0) {
          await db.update(cubeWallets)
            .set({ 
              balance: sql`balance - ${event.price}`,
              totalSpent: sql`total_spent + ${event.price}`
            })
            .where(eq(cubeWallets.userId, req.userId));
          
          await db.insert(cubeTransactions).values({
            userId: req.userId,
            kind: "spend",
            amount: event.price,
            meta: { reason: "event_ticket", eventId }
          });
        }
        
        res.json({ success: true, ticket });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ GAMIFICATION ROUTES ============
    
    // Get current season
    app.get("/api/season/current", async (req, res) => {
      try {
        const [season] = await db.select().from(seasons)
          .where(and(
            eq(seasons.active, true),
            lte(seasons.startDate, new Date()),
            gte(seasons.endDate, new Date())
          ))
          .limit(1);
        
        res.json(season || null);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get quests
    app.get("/api/quests", authMiddleware, async (req: any, res) => {
      try {
        const activeQuests = await db.select().from(quests)
          .where(eq(quests.active, true));
        
        // Get user progress
        const questsWithProgress = await Promise.all(activeQuests.map(async (quest) => {
          const [progress] = await db.select().from(questProgress)
            .where(and(
              eq(questProgress.userId, req.userId),
              eq(questProgress.questId, quest.id)
            ))
            .limit(1);
          
          return {
            ...quest,
            progress: progress || { progress: 0, completedAt: null }
          };
        }));
        
        res.json(questsWithProgress);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get leaderboard
    app.get("/api/leaderboard", async (req, res) => {
      try {
        const { city, seasonId } = req.query;
        
        let query = db.select({
          leaderboard: leaderboards,
          user: users
        })
        .from(leaderboards)
        .innerJoin(users, eq(leaderboards.userId, users.id))
        .orderBy(desc(leaderboards.score))
        .limit(100);
        
        if (city) {
          query = query.where(eq(leaderboards.city, city as string)) as any;
        }
        
        if (seasonId) {
          query = query.where(eq(leaderboards.seasonId, parseInt(seasonId as string))) as any;
        }
        
        const results = await query;
        
        res.json(results);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ DRINK GIFTS ROUTES ============
    
    // Send drink gift
    app.post("/api/gifts/send", authMiddleware, async (req: any, res) => {
      try {
        const { recipientId, matchId, drinkName, venueId, cubesCost } = req.body;
        
        // Check wallet
        const [wallet] = await db.select().from(cubeWallets)
          .where(eq(cubeWallets.userId, req.userId))
          .limit(1);
        
        if ((wallet?.balance ?? 0) < cubesCost) {
          return res.status(400).json({ error: "Insufficient cubes" });
        }
        
        const qrCode = nanoid(16);
        
        const [gift] = await db.insert(drinkGifts).values({
          senderId: req.userId,
          recipientId,
          matchId,
          drinkName,
          venueId,
          cubesCost,
          qrCode
        }).returning();
        
        // Deduct cubes
        await db.update(cubeWallets)
          .set({ 
            balance: sql`balance - ${cubesCost}`,
            totalSpent: sql`total_spent + ${cubesCost}`
          })
          .where(eq(cubeWallets.userId, req.userId));
        
        await db.insert(cubeTransactions).values({
          userId: req.userId,
          kind: "spend",
          amount: cubesCost,
          meta: { reason: "drink_gift" }
        });
        
        res.json({ success: true, gift });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Accept drink gift
    app.post("/api/gifts/:id/accept", authMiddleware, async (req: any, res) => {
      try {
        const giftId = parseInt(req.params.id);
        
        const [gift] = await db.update(drinkGifts)
          .set({ accepted: true })
          .where(and(
            eq(drinkGifts.id, giftId),
            eq(drinkGifts.recipientId, req.userId)
          ))
          .returning();
        
        res.json({ success: true, gift });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ DATE BOOKING ROUTES ============
    
    // Propose date
    app.post("/api/dates/propose", authMiddleware, async (req: any, res) => {
      try {
        const { matchId, venueId, bookingDate, location } = req.body;
        
        const qrCode = nanoid(16);
        
        const [booking] = await db.insert(dateBookings).values({
          matchId,
          venueId,
          proposedBy: req.userId,
          bookingDate: new Date(bookingDate),
          location,
          qrCode
        }).returning();
        
        res.json({ success: true, booking });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Confirm date
    app.post("/api/dates/:id/confirm", authMiddleware, async (req: any, res) => {
      try {
        const bookingId = parseInt(req.params.id);
        
        const [booking] = await db.update(dateBookings)
          .set({ confirmed: true })
          .where(eq(dateBookings.id, bookingId))
          .returning();
        
        // Award cubes for confirming date
        const cubesEarned = 20;
        await db.update(cubeWallets)
          .set({ 
            balance: sql`balance + ${cubesEarned}`,
            totalEarned: sql`total_earned + ${cubesEarned}`
          })
          .where(eq(cubeWallets.userId, req.userId));
        
        res.json({ success: true, booking, cubesEarned });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ CREW ROUTES ============
    
    // Create crew
    app.post("/api/crews", authMiddleware, async (req: any, res) => {
      try {
        const { name, bio, photo } = req.body;
        
        const [crew] = await db.insert(crews).values({
          name,
          captainId: req.userId,
          bio,
          photo
        }).returning();
        
        // Add creator as member
        await db.insert(crewMembers).values({
          crewId: crew.id,
          userId: req.userId
        });
        
        res.json({ success: true, crew });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get user's crews
    app.get("/api/crews/my", authMiddleware, async (req: any, res) => {
      try {
        const myCrews = await db.select({
          crew: crews,
          member: crewMembers
        })
        .from(crewMembers)
        .innerJoin(crews, eq(crewMembers.crewId, crews.id))
        .where(eq(crewMembers.userId, req.userId));
        
        res.json(myCrews.map(c => c.crew));
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    return httpServer;
  }
  