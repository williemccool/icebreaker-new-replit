import type { Express, Request, Response, NextFunction } from "express";
  import { createServer, type Server } from "http";
  import { Server as SocketServer } from "socket.io";
  import { db } from "../db";
  import { 
    users, otpVerifications, preferences, swipes, matches, messages,
    venues, checkIns, rooms, roomPresence, events, tickets,
    cubeWallets, cubeTransactions, quests, questProgress, seasons,
    leaderboards, subscriptions, drinkGifts, dateBookings, crews, crewMembers, badges, userBadges,
    reports, blocks, paymentOrders,
    insertReportSchema, insertBlockSchema
  } from "@shared/schema";
  import { getPackById, pickOtherTone, renderRoundPath, validateIcebreakerRound } from "@shared/icebreakerPacks";
  import { eq, and, or, desc, sql, gte, lte, lt, isNull, ne, notInArray, inArray } from "drizzle-orm";
  import bcrypt from "bcryptjs";
  import jwt from "jsonwebtoken";
  import { nanoid } from "nanoid";
  import crypto from "crypto";
  import path from "path";
  import fs from "fs";
  import multer from "multer";
  import rateLimit, { ipKeyGenerator } from "express-rate-limit";
  import { z } from "zod";

  // ============ DEMO CONSTANTS ============
  // Demo credentials must KEEP working in both dev and prod for client showcases.
  // This is the ONLY hardcoded credential and it is scoped to a single known phone.
  export const DEMO_PHONE = "8095411567";
  export const DEMO_OTP = "123456";

  // ============ JWT SECRET — fail-fast in production ============
  const IS_PROD = process.env.NODE_ENV === "production";
  if (IS_PROD && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable must be set in production.");
  }
  const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me-not-for-production";

  // ============ Razorpay (lazy) ============
  let razorpayClient: any = null;
  function getRazorpay(): any | null {
    if (razorpayClient) return razorpayClient;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Razorpay = require("razorpay");
      razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
      return razorpayClient;
    } catch {
      return null;
    }
  }

  // ============ Twilio (lazy) ============
  let twilioClient: any = null;
  function getTwilio(): any | null {
    if (twilioClient) return twilioClient;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require("twilio");
      twilioClient = twilio(sid, token);
      return twilioClient;
    } catch {
      return null;
    }
  }
  async function sendSmsOtp(phone: string, otp: string): Promise<{ sent: boolean; reason?: string }> {
    const client = getTwilio();
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!client || !from) return { sent: false, reason: "twilio_not_configured" };
    try {
      const to = phone.startsWith("+") ? phone : `+91${phone}`;
      await client.messages.create({
        to,
        from,
        body: `Your Icebreaker code is ${otp}. Expires in 10 minutes. Never share this code.`,
      });
      return { sent: true };
    } catch (e: any) {
      console.error("[twilio] send failed:", e?.message || e);
      return { sent: false, reason: e?.message || "twilio_failed" };
    }
  }

  // ============ Rate limiters ============
  const otpSendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many OTP requests. Wait a minute and try again." },
    keyGenerator: (req, res) => (req.body?.phone as string) || ipKeyGenerator(req.ip || "0.0.0.0"),
  });
  const otpVerifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many verification attempts. Wait and try again." },
    keyGenerator: (req, res) => (req.body?.phone as string) || ipKeyGenerator(req.ip || "0.0.0.0"),
  });
  const purchaseLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many purchase attempts. Slow down." },
  });
  const reportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many reports. Please wait." },
  });
  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many uploads. Slow down." },
  });

  // ============ Multer (photo uploads) ============
  const UPLOAD_DIR = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().slice(0, 6) || ".jpg";
        cb(null, `${nanoid(16)}${ext}`);
      },
    }),
    limits: { fileSize: 8 * 1024 * 1024, files: 6 },
    fileFilter: (_req, file, cb) => {
      const ok = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.mimetype);
      cb(ok ? null : new Error("Unsupported image type") as any, ok);
    },
  });

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

  // Keep Live Rooms actually live. Looks for active rooms with ends_at in the
  // past and rolls them forward to today's nightlife window (5pm → 2am next day).
  // If no rooms exist at all, seeds five defaults across the seed venues.
  async function ensureLiveRooms() {
    try {
      const now = new Date();
      const startsAt = new Date(now);
      startsAt.setHours(17, 0, 0, 0);
      const endsAt = new Date(startsAt);
      endsAt.setDate(endsAt.getDate() + 1);
      endsAt.setHours(2, 0, 0, 0);

      const all = await db.select().from(rooms);
      if (all.length === 0) {
        const venueList = await db.select().from(venues).limit(5);
        const defaults = [
          { name: "Friday Vibes 🍺" },
          { name: "Pre-Game Mixer 🎶" },
          { name: "Rooftop Sunset 🌇" },
          { name: "Late Night Lounge 🥂" },
          { name: "Warm-up Session 🎧" },
        ];
        for (let i = 0; i < defaults.length; i++) {
          const venue = venueList[i % Math.max(venueList.length, 1)];
          if (!venue) break;
          await db.insert(rooms).values({
            venueId: venue.id,
            name: `${defaults[i].name} @ ${venue.name}`,
            capacity: 12,
            startsAt,
            endsAt,
            virtual: true,
            premium: false,
            active: true,
          });
        }
        console.log(`[rooms] Seeded ${defaults.length} live rooms.`);
        return;
      }

      // Slide expired rooms forward so demos always show live rooms.
      const expired = all.filter((r) => r.active && r.endsAt && r.endsAt < now);
      if (expired.length > 0) {
        await db
          .update(rooms)
          .set({ startsAt, endsAt })
          .where(and(eq(rooms.active, true), lt(rooms.endsAt, now)));
        console.log(`[rooms] Refreshed ${expired.length} expired rooms.`);
      }
    } catch (e) {
      console.error("[rooms] ensureLiveRooms failed:", e);
    }
  }

  export function registerRoutes(app: Express): Server {
    // Kick off the live-rooms guard on boot, then re-check every 15 min.
    ensureLiveRooms();
    setInterval(ensureLiveRooms, 15 * 60 * 1000);

    const httpServer = createServer(app);
    const io = new SocketServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Require a valid JWT on the Socket.IO handshake. The decoded userId becomes
    // the trusted sender identity for any socket event.
    io.use((socket, next) => {
      try {
        const token =
          (socket.handshake.auth as any)?.token ||
          (socket.handshake.headers as any)?.authorization?.replace(/^Bearer\s+/i, "");
        if (!token) return next(new Error("Unauthorized"));
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        (socket.data as any).userId = decoded.userId;
        next();
      } catch {
        next(new Error("Unauthorized"));
      }
    });

    // Socket.IO for real-time features
    const activeUsers = new Map<number, string>();

    // Ephemeral in-memory ring buffer of recent room chat (no DB persistence).
    // Keeps live rooms feeling fresh without growing the database.
    type RoomChatMsg = { id: string; roomId: number; userId: number; name: string; body: string; at: number };
    const roomChatHistory = new Map<number, RoomChatMsg[]>();
    const ROOM_CHAT_MAX = 50;

    io.on("connection", (socket) => {
      const authedUserId: number | undefined = (socket.data as any)?.userId;

      socket.on("user:online", (userId: number) => {
        const uid = typeof userId === "number" && userId === authedUserId ? userId : authedUserId;
        if (!uid) return;
        activeUsers.set(uid, socket.id);
        socket.join(`user:${uid}`);
      });

      socket.on("room:join", async ({ roomId }: { roomId: number }) => {
        try {
          if (!authedUserId || typeof roomId !== "number") return;
          socket.join(`room:${roomId}`);

          // Upsert presence — close any stale row first, then insert fresh
          await db.update(roomPresence)
            .set({ leftAt: new Date() })
            .where(and(eq(roomPresence.roomId, roomId), eq(roomPresence.userId, authedUserId), isNull(roomPresence.leftAt)));
          await db.insert(roomPresence).values({ roomId, userId: authedUserId, joinedAt: new Date() });

          // Look up user for the activity event
          const [u] = await db.select({ id: users.id, name: users.name, photos: users.photos })
            .from(users).where(eq(users.id, authedUserId)).limit(1);

          io.to(`room:${roomId}`).emit("room:user_joined", { userId: authedUserId, name: u?.name, photo: (u?.photos as any)?.[0] || null });

          // Live count update
          const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
            .from(roomPresence)
            .where(and(eq(roomPresence.roomId, roomId), isNull(roomPresence.leftAt)));
          io.to(`room:${roomId}`).emit("room:count", { roomId, count: Number(count) });

          // Send last messages + presence snapshot back to the joiner
          const history = roomChatHistory.get(roomId) || [];
          socket.emit("room:history", { roomId, messages: history });
        } catch (e) { /* swallow */ }
      });

      socket.on("room:leave", async ({ roomId }: { roomId: number }) => {
        try {
          if (!authedUserId || typeof roomId !== "number") return;
          socket.leave(`room:${roomId}`);
          await db.update(roomPresence)
            .set({ leftAt: new Date() })
            .where(and(eq(roomPresence.roomId, roomId), eq(roomPresence.userId, authedUserId), isNull(roomPresence.leftAt)));

          io.to(`room:${roomId}`).emit("room:user_left", { userId: authedUserId });
          const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
            .from(roomPresence)
            .where(and(eq(roomPresence.roomId, roomId), isNull(roomPresence.leftAt)));
          io.to(`room:${roomId}`).emit("room:count", { roomId, count: Number(count) });
        } catch { /* swallow */ }
      });

      // Live room group chat (ephemeral — broadcast only, ring buffer in memory)
      socket.on("room:message", async ({ roomId, body }: { roomId: number; body: string }) => {
        try {
          if (!authedUserId || typeof roomId !== "number") return;
          const text = typeof body === "string" ? body.trim().slice(0, 500) : "";
          if (!text) return;

          // Must currently be present in the room
          const [present] = await db.select().from(roomPresence)
            .where(and(eq(roomPresence.roomId, roomId), eq(roomPresence.userId, authedUserId), isNull(roomPresence.leftAt)))
            .limit(1);
          if (!present) return;

          const [u] = await db.select({ name: users.name, photos: users.photos })
            .from(users).where(eq(users.id, authedUserId)).limit(1);

          const msg: RoomChatMsg = {
            id: nanoid(10),
            roomId,
            userId: authedUserId,
            name: u?.name || "Someone",
            body: text,
            at: Date.now(),
          };
          const hist = roomChatHistory.get(roomId) || [];
          hist.push(msg);
          while (hist.length > ROOM_CHAT_MAX) hist.shift();
          roomChatHistory.set(roomId, hist);
          io.to(`room:${roomId}`).emit("room:message", { ...msg, photo: (u?.photos as any)?.[0] || null });
        } catch { /* swallow */ }
      });

      // Typing indicator in rooms
      socket.on("room:typing", ({ roomId }: { roomId: number }) => {
        if (!authedUserId || typeof roomId !== "number") return;
        socket.to(`room:${roomId}`).emit("room:typing", { userId: authedUserId });
      });
      
      // Authenticated chat send. Sender identity comes from the socket's JWT, not
      // from the client payload. Membership and icebreaker gate are enforced.
      socket.on("message:send", async (data) => {
        try {
          const authedUserId: number | undefined = (socket.data as any)?.userId;
          if (!authedUserId) return;
          const matchId = Number(data?.matchId);
          const body = typeof data?.body === "string" ? data.body : "";
          if (!matchId || !body) return;

          const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
          if (!match) return;
          if (match.userAId !== authedUserId && match.userBId !== authedUserId) return;
          if (!match.icebreakerCompleted) return;

          const [message] = await db.insert(messages).values({
            matchId,
            senderId: authedUserId,
            body,
            meta: {},
          }).returning();

          io.to(`match:${matchId}`).emit("message:received", message);
        } catch {
          // swallow socket errors
        }
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
    const phoneSchema = z.object({ phone: z.string().regex(/^[0-9+]{8,15}$/, "Invalid phone") });
    app.post("/api/auth/send-otp", otpSendLimiter, async (req, res) => {
      try {
        const parsed = phoneSchema.safeParse(req.body || {});
        if (!parsed.success) return res.status(400).json({ error: "Invalid phone" });
        const { phone } = parsed.data;

        // Demo phone: do NOT call SMS provider — code is fixed and known to demo audience.
        if (phone === DEMO_PHONE) {
          return res.json({ success: true, message: "Demo phone — use code 123456", demo: true });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await db.insert(otpVerifications).values({ phone, otp, expiresAt, verified: false });

        const sms = await sendSmsOtp(phone, otp);
        const response: { success: boolean; message: string; devOtp?: string; smsSent: boolean } = {
          success: true,
          message: sms.sent ? "OTP sent via SMS" : "OTP generated (SMS provider not configured)",
          smsSent: sms.sent,
        };
        // Only expose OTP in dev / non-prod where SMS isn't going out.
        if (!IS_PROD && !sms.sent) {
          response.devOtp = otp;
          console.log(`[dev otp] ${phone}: ${otp}`);
        }
        res.json(response);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Verify OTP & Register/Login
    const verifySchema = z.object({
      phone: z.string().regex(/^[0-9+]{8,15}$/),
      otp: z.string().regex(/^[0-9]{4,8}$/),
    });
    app.post("/api/auth/verify-otp", otpVerifyLimiter, async (req, res) => {
      try {
        const parsed = verifySchema.safeParse(req.body || {});
        if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
        const { phone, otp } = parsed.data;

        let verification: typeof otpVerifications.$inferSelect | undefined;

        // Whitelisted demo bypass: ONLY for the known demo phone, in any environment,
        // and only when the canonical demo OTP is presented. This is intentional and
        // documented so client showcases keep working in production.
        const demoBypass = phone === DEMO_PHONE && otp === DEMO_OTP;

        if (!demoBypass) {
          [verification] = await db.select().from(otpVerifications)
            .where(and(
              eq(otpVerifications.phone, phone),
              eq(otpVerifications.otp, otp),
              eq(otpVerifications.verified, false),
              gte(otpVerifications.expiresAt, new Date())
            ))
            .limit(1);

          // Dev-only fallback: accept the latest unverified OTP for this phone
          // to kill race conditions with auto-fill while developing locally.
          if (!verification && !IS_PROD) {
            [verification] = await db.select().from(otpVerifications)
              .where(and(
                eq(otpVerifications.phone, phone),
                eq(otpVerifications.verified, false),
                gte(otpVerifications.expiresAt, new Date())
              ))
              .orderBy(desc(otpVerifications.id))
              .limit(1);
          }

          if (!verification) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
          }

          await db.update(otpVerifications)
            .set({ verified: true })
            .where(eq(otpVerifications.id, verification.id));
        }
        
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

    // ============ Clerk Exchange ============
    // Takes a Clerk session token (from useAuth().getToken() on the client),
    // verifies it server-side, then finds-or-creates a user keyed by clerkUserId
    // (or email fallback) and issues our existing JWT.
    const clerkExchangeLimiter = rateLimit({
      windowMs: 60_000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => ipKeyGenerator(req.ip || "0.0.0.0"),
    });
    app.post("/api/auth/clerk-exchange", clerkExchangeLimiter, async (req, res) => {
      try {
        const clerkSecret = process.env.CLERK_SECRET_KEY;
        if (!clerkSecret) return res.status(503).json({ error: "Clerk not configured" });
        const { sessionToken } = req.body || {};
        if (!sessionToken || typeof sessionToken !== "string") {
          return res.status(400).json({ error: "Missing sessionToken" });
        }

        const { createClerkClient, verifyToken } = await import("@clerk/backend");
        const clerk = createClerkClient({ secretKey: clerkSecret });

        let payload: any;
        try {
          payload = await verifyToken(sessionToken, { secretKey: clerkSecret });
        } catch (e: any) {
          return res.status(401).json({ error: "Invalid Clerk session" });
        }
        const clerkUserId = payload?.sub as string | undefined;
        if (!clerkUserId) return res.status(401).json({ error: "Invalid Clerk session" });

        const clerkUser = await clerk.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
          || clerkUser.emailAddresses?.[0]?.emailAddress || null;
        const firstName = clerkUser.firstName || "";
        const lastName = clerkUser.lastName || "";
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
        const photo = clerkUser.imageUrl || null;

        // Find by clerkUserId first, then by email
        let [user] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
        if (!user && email) {
          [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (user) {
            if (user.clerkUserId && user.clerkUserId !== clerkUserId) {
              // Email belongs to a different Clerk identity — refuse to re-bind.
              return res.status(409).json({ error: "An account already exists for this email under a different login. Please sign in with your original method." });
            }
            if (!user.clerkUserId) {
              await db.update(users).set({ clerkUserId }).where(eq(users.id, user.id));
            }
          }
        }

        const isNewUser = !user;
        if (!user) {
          try {
            [user] = await db.insert(users).values({
              clerkUserId,
              email: email || undefined,
              name: fullName || "",
              dob: new Date(),
              gender: "male",
              city: "",
              photos: photo ? [photo] : [],
              verified: false,
            }).returning();
            await db.insert(cubeWallets).values({ userId: user.id, balance: 100 });
            await db.insert(preferences).values({ userId: user.id });
          } catch (e: any) {
            // Race: a concurrent exchange created the row first. Re-select by clerkUserId.
            if (e?.code === "23505") {
              [user] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
              if (!user && email) {
                [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
              }
              if (!user) throw e;
            } else {
              throw e;
            }
          }
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.json({ success: true, token, user, isNewUser });
      } catch (error: any) {
        console.error("[clerk-exchange] error:", error);
        res.status(500).json({ error: error.message || "Clerk exchange failed" });
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
    
    // Get wallet balance
    app.get("/api/wallet", authMiddleware, async (req: any, res) => {
      try {
        const [wallet] = await db.select().from(cubeWallets)
          .where(eq(cubeWallets.userId, req.userId))
          .limit(1);
        
        if (!wallet) {
          return res.json({ wallet: { balance: 0, totalEarned: 0, totalSpent: 0 } });
        }
        res.json({ wallet });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Recent cube transactions for the current user
    app.get("/api/cubes/transactions", authMiddleware, async (req: any, res) => {
      try {
        const txns = await db.select().from(cubeTransactions)
          .where(eq(cubeTransactions.userId, req.userId))
          .orderBy(desc(cubeTransactions.createdAt))
          .limit(20);
        res.json(txns);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Current user's active subscription (premium / God Mode)
    app.get("/api/me/subscription", authMiddleware, async (req: any, res) => {
      try {
        const [sub] = await db.select().from(subscriptions)
          .where(and(
            eq(subscriptions.userId, req.userId),
            eq(subscriptions.status, "active"),
            gte(subscriptions.endsAt, new Date())
          ))
          .orderBy(desc(subscriptions.endsAt))
          .limit(1);
        res.json({ subscription: sub || null });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Current user's leaderboard rank in the active season
    app.get("/api/me/rank", authMiddleware, async (req: any, res) => {
      try {
        const [season] = await db.select().from(seasons)
          .where(and(eq(seasons.active, true), lte(seasons.startDate, new Date()), gte(seasons.endDate, new Date())))
          .limit(1);
        if (!season) return res.json({ rank: null, score: 0, total: 0, season: null });
        const [me] = await db.select().from(leaderboards)
          .where(and(eq(leaderboards.seasonId, season.id), eq(leaderboards.userId, req.userId)))
          .limit(1);
        if (!me) return res.json({ rank: null, score: 0, total: 0, season });
        const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
          .from(leaderboards)
          .where(and(eq(leaderboards.seasonId, season.id), sql`${leaderboards.score} > ${me.score}`));
        const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` })
          .from(leaderboards)
          .where(eq(leaderboards.seasonId, season.id));
        res.json({ rank: Number(count) + 1, score: me.score, total: Number(total), season });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ PAYMENTS (Razorpay) ============
    // Create a Razorpay order for a known SKU. Client opens the Razorpay checkout
    // with the returned order_id, then calls /api/payments/verify with the
    // signed response. Entitlement is only granted after signature verification.
    app.post("/api/payments/create-order", purchaseLimiter, authMiddleware, async (req: any, res) => {
      try {
        const { SHOP_CATALOG } = await import("../shared/shop");
        const sku = String(req.body?.sku || "");
        const item = (SHOP_CATALOG as any)[sku];
        if (!item) return res.status(400).json({ error: "Unknown SKU" });
        const amountInPaise = Number(item.priceInPaise) || 0;
        if (amountInPaise <= 0) return res.status(400).json({ error: "Invalid amount for SKU" });

        const rp = getRazorpay();
        if (!rp) {
          return res.status(503).json({
            error: "Razorpay not configured",
            fallback: "use_simulated",
            message: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable real payments.",
          });
        }
        const order = await rp.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${nanoid(10)}`,
          notes: { sku, userId: String(req.userId) },
        });
        await db.insert(paymentOrders).values({
          userId: req.userId,
          sku,
          amountInr: Math.round(amountInPaise / 100),
          razorpayOrderId: order.id,
          status: "created",
        });
        res.json({
          ok: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
          sku,
        });
      } catch (e: any) {
        console.error("[razorpay] create order failed:", e?.message || e);
        res.status(500).json({ error: e?.message || "Order creation failed" });
      }
    });

    // Verify a Razorpay payment + grant entitlement atomically.
    app.post("/api/payments/verify", purchaseLimiter, authMiddleware, async (req: any, res) => {
      try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return res.status(400).json({ error: "Missing payment fields" });
        }
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) return res.status(503).json({ error: "Razorpay not configured" });

        const expected = crypto
          .createHmac("sha256", secret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");
        const sigBuf = Buffer.from(razorpay_signature, "utf8");
        const expBuf = Buffer.from(expected, "utf8");
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          return res.status(400).json({ error: "Signature verification failed" });
        }

        const [order] = await db.select().from(paymentOrders)
          .where(eq(paymentOrders.razorpayOrderId, razorpay_order_id)).limit(1);
        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.userId !== req.userId) return res.status(403).json({ error: "Order does not belong to user" });
        if (order.status === "paid") return res.json({ ok: true, alreadyGranted: true, sku: order.sku });

        await grantSkuEntitlement(req.userId, order.sku, { razorpayPaymentId: razorpay_payment_id });

        await db.update(paymentOrders)
          .set({ status: "paid", razorpayPaymentId: razorpay_payment_id, completedAt: new Date() })
          .where(eq(paymentOrders.id, order.id));

        res.json({ ok: true, sku: order.sku });
      } catch (e: any) {
        console.error("[razorpay] verify failed:", e?.message || e);
        res.status(500).json({ error: e?.message || "Verification failed" });
      }
    });

    // Shared entitlement granter — used by both Razorpay verify and demo fallback
    async function grantSkuEntitlement(userId: number, sku: string, meta: Record<string, any> = {}) {
      const { SHOP_CATALOG } = await import("../shared/shop");
      const item = (SHOP_CATALOG as any)[sku];
      if (!item) throw new Error("Unknown SKU");

      if (item.category === "cubes") {
        const total = (item.cubes || 0) + (item.bonusCubes || 0);
        await db.update(cubeWallets)
          .set({
            balance: sql`${cubeWallets.balance} + ${total}`,
            totalEarned: sql`${cubeWallets.totalEarned} + ${total}`,
            updatedAt: new Date(),
          })
          .where(eq(cubeWallets.userId, userId));
        await db.insert(cubeTransactions).values({
          userId, kind: "earn", amount: total,
          meta: { reason: "purchase", sku, ...meta },
        });
        return { sku, cubesAdded: total };
      }

      if (item.category === "godmode") {
        const days = item.durationDays || 30;
        const endsAt = await db.transaction(async (tx) => {
          const [existing] = await tx.select().from(subscriptions)
            .where(and(
              eq(subscriptions.userId, userId),
              eq(subscriptions.status, "active"),
              gte(subscriptions.endsAt, new Date()),
            ))
            .orderBy(desc(subscriptions.endsAt))
            .limit(1);
          const startsAt = existing ? new Date(existing.endsAt) : new Date();
          const newEndsAt = new Date(startsAt.getTime() + days * 24 * 3600 * 1000);
          await tx.insert(subscriptions).values({
            userId, plan: sku, startsAt, endsAt: newEndsAt, status: "active",
          });
          if (existing) {
            await tx.execute(sql`UPDATE subscriptions SET status = 'expired' WHERE id = ${existing.id}`);
          }
          return newEndsAt;
        });
        return { sku, endsAt };
      }

      if (item.category === "season") {
        const bonus = 200;
        await db.update(cubeWallets)
          .set({
            balance: sql`${cubeWallets.balance} + ${bonus}`,
            totalEarned: sql`${cubeWallets.totalEarned} + ${bonus}`,
            updatedAt: new Date(),
          })
          .where(eq(cubeWallets.userId, userId));
        await db.insert(cubeTransactions).values({
          userId, kind: "earn", amount: bonus,
          meta: { reason: "season_pass", sku, ...meta },
        });
        return { sku, bonusCubes: bonus };
      }
      throw new Error("Unsupported SKU category");
    }

    // Legacy / fallback purchase endpoint — only allowed for the demo user OR when
    // Razorpay isn't configured (so dev keeps working). In production with Razorpay
    // configured, this endpoint refuses non-demo users.
    app.post("/api/purchase", purchaseLimiter, authMiddleware, async (req: any, res) => {
      try {
        const { SHOP_CATALOG } = await import("../shared/shop");
        const { sku } = req.body || {};
        const item = SHOP_CATALOG[sku];
        if (!item) return res.status(400).json({ error: "Unknown SKU" });

        // Guard: if Razorpay IS configured, this fallback path is only allowed
        // for the demo phone so client showcases still work. Real users must
        // pay via /api/payments/create-order + /api/payments/verify.
        if (getRazorpay()) {
          const [me] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, req.userId)).limit(1);
          if (me?.phone !== DEMO_PHONE) {
            return res.status(402).json({ error: "Payment required. Use /api/payments/create-order." });
          }
        }

        // CUBES TOP-UP
        if (item.category === "cubes") {
          const total = (item.cubes || 0) + (item.bonusCubes || 0);
          await db.update(cubeWallets)
            .set({
              balance: sql`${cubeWallets.balance} + ${total}`,
              totalEarned: sql`${cubeWallets.totalEarned} + ${total}`,
              updatedAt: new Date(),
            })
            .where(eq(cubeWallets.userId, req.userId));
          await db.insert(cubeTransactions).values({
            userId: req.userId, kind: "earn", amount: total,
            meta: { reason: "purchase", sku, priceInPaise: item.priceInPaise },
          });
          return res.json({ ok: true, sku, cubesAdded: total });
        }

        // GOD MODE SUBSCRIPTION (atomic)
        if (item.category === "godmode") {
          const days = item.durationDays || 30;
          const endsAt = await db.transaction(async (tx) => {
            const [existing] = await tx.select().from(subscriptions)
              .where(and(
                eq(subscriptions.userId, req.userId),
                eq(subscriptions.status, "active"),
                gte(subscriptions.endsAt, new Date()),
              ))
              .orderBy(desc(subscriptions.endsAt))
              .limit(1);
            const startsAt = existing ? new Date(existing.endsAt) : new Date();
            const newEndsAt = new Date(startsAt.getTime() + days * 24 * 3600 * 1000);
            await tx.insert(subscriptions).values({
              userId: req.userId, plan: sku, startsAt, endsAt: newEndsAt, status: "active",
            });
            if (existing) {
              await tx.execute(sql`UPDATE subscriptions SET status = 'expired' WHERE id = ${existing.id}`);
            }
            return newEndsAt;
          });
          return res.json({ ok: true, sku, endsAt });
        }

        // SEASON PASS — grant a chunk of bonus cubes + flag in tx meta
        if (item.category === "season") {
          const bonus = 200;
          await db.update(cubeWallets)
            .set({
              balance: sql`${cubeWallets.balance} + ${bonus}`,
              totalEarned: sql`${cubeWallets.totalEarned} + ${bonus}`,
              updatedAt: new Date(),
            })
            .where(eq(cubeWallets.userId, req.userId));
          await db.insert(cubeTransactions).values({
            userId: req.userId, kind: "earn", amount: bonus,
            meta: { reason: "season_pass", sku, priceInPaise: item.priceInPaise },
          });
          return res.json({ ok: true, sku, cubesAdded: bonus });
        }

        res.status(400).json({ error: "Unsupported category" });
      } catch (error: any) {
        console.error("[/api/purchase] failed", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get single match by ID
    app.get("/api/matches/:id", authMiddleware, async (req: any, res) => {
      try {
        const matchId = parseInt(req.params.id);
        const [match] = await db.select().from(matches)
          .where(eq(matches.id, matchId))
          .limit(1);
        
        if (!match) {
          return res.status(404).json({ error: "Match not found" });
        }

        if (match.userAId !== req.userId && match.userBId !== req.userId) {
          return res.status(403).json({ error: "Not authorized" });
        }

        const otherId = match.userAId === req.userId ? match.userBId : match.userAId;
        const [otherUser] = await db.select({
          id: users.id,
          name: users.name,
          city: users.city,
          bio: users.bio,
          dob: users.dob,
          gender: users.gender,
          photos: users.photos,
          verified: users.verified
        }).from(users)
          .where(eq(users.id, otherId))
          .limit(1);

        // Get venue name if available
        let venueName = null;
        if (match.venueId) {
          const [venue] = await db.select({ name: venues.name }).from(venues)
            .where(eq(venues.id, match.venueId))
            .limit(1);
          venueName = venue?.name;
        }

        res.json({ match: { ...match, venueName }, otherUser });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get user by ID (public profile - safe subset only)
    app.get("/api/users/:id", authMiddleware, async (req: any, res) => {
      try {
        const userId = parseInt(req.params.id);
        const [user] = await db.select({
          id: users.id,
          name: users.name,
          city: users.city,
          bio: users.bio,
          gender: users.gender,
          photos: users.photos,
          verified: users.verified
        }).from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        res.json({ user });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update user profile
    app.put("/api/user/profile", authMiddleware, async (req: any, res) => {
      try {
        const body = req.body || {};
        // Whitelist mutable profile fields — prevent privilege escalation via
        // arbitrary column updates (e.g. verified, phone, role).
        const ALLOWED = ["name", "dob", "city", "pronouns", "bio", "gender", "photos"] as const;
        const updates: Record<string, any> = {};
        for (const k of ALLOWED) {
          if (body[k] !== undefined) updates[k] = body[k];
        }

        // Enforce 18+ server-side. Reject regardless of client UI.
        if (updates.dob !== undefined) {
          const d = typeof updates.dob === "string" ? new Date(updates.dob) : updates.dob;
          if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
            return res.status(400).json({ error: "Invalid date of birth" });
          }
          const now = new Date();
          let age = now.getFullYear() - d.getFullYear();
          const m = now.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
          if (age < 18) {
            return res.status(403).json({ error: "You must be 18 or older to use Icebreaker." });
          }
          if (age > 120) {
            return res.status(400).json({ error: "Invalid date of birth" });
          }
          updates.dob = d;
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
    
    // Verify selfie (front-camera capture). Stores a hash, marks user verified,
    // and grants the verification reward (50 XP + 1 Cube) on first success.
    app.post("/api/user/verify-selfie", authMiddleware, async (req: any, res) => {
      try {
        const { selfie } = req.body || {};
        if (typeof selfie !== "string" || !selfie.startsWith("data:image/")) {
          return res.status(400).json({ error: "Invalid selfie payload" });
        }
        // Very small sanity check — base64 payload should be non-trivial
        const b64 = selfie.split(",")[1] || "";
        if (b64.length < 1000) {
          return res.status(400).json({ error: "Selfie image too small to verify" });
        }
        const hash = crypto.createHash("sha256").update(b64).digest("hex");

        const [existing] = await db.select().from(users).where(eq(users.id, req.userId)).limit(1);
        const wasVerified = !!existing?.verified;

        const [updated] = await db.update(users)
          .set({ verified: true, selfieHash: hash, updatedAt: new Date() })
          .where(eq(users.id, req.userId))
          .returning();

        if (!wasVerified) {
          await db.update(cubeWallets)
            .set({
              balance: sql`balance + 1`,
              totalEarned: sql`total_earned + 1`,
            })
            .where(eq(cubeWallets.userId, req.userId));
        }

        res.json({ verified: true, user: updated, rewarded: !wasVerified });
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
    app.get("/api/venues", authMiddleware, async (req, res) => {
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
    app.get("/api/venues/:id", authMiddleware, async (req, res) => {
      try {
        const [venue] = await db.select().from(venues)
          .where(eq(venues.id, parseInt(req.params.id)))
          .limit(1);
        
        if (!venue) {
          return res.status(404).json({ error: "Venue not found" });
        }
        
        // Get people currently checked in — scrub PII (no phone/email/dob)
        const checkedInUsers = await db.select({
          user: {
            id: users.id,
            name: users.name,
            city: users.city,
            bio: users.bio,
            gender: users.gender,
            photos: users.photos,
            verified: users.verified,
          },
          checkIn: {
            id: checkIns.id,
            checkedInAt: checkIns.checkedInAt,
            venueId: checkIns.venueId,
          },
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
    

    
    // Helper: get all users this userId has blocked (or been blocked by) so we
    // never expose them to each other anywhere in the app.
    async function getBlockedUserIds(userId: number): Promise<number[]> {
      const rows = await db.select().from(blocks)
        .where(or(eq(blocks.blockerId, userId), eq(blocks.blockedId, userId)));
      const set = new Set<number>();
      for (const r of rows) {
        if (r.blockerId === userId) set.add(r.blockedId);
        else set.add(r.blockerId);
      }
      return Array.from(set);
    }

    // Swipe on user
    const swipeSchema = z.object({
      swipedId: z.number().int().positive(),
      liked: z.boolean(),
    });
    app.post("/api/swipe", purchaseLimiter, authMiddleware, async (req: any, res) => {
      try {
        const parsed = swipeSchema.safeParse(req.body || {});
        if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
        const { swipedId, liked } = parsed.data;

        if (swipedId === req.userId) {
          return res.status(400).json({ error: "Cannot swipe yourself" });
        }
        // Cannot interact with blocked users (either direction)
        const blockedIds = await getBlockedUserIds(req.userId);
        if (blockedIds.includes(swipedId)) {
          return res.status(403).json({ error: "User not available" });
        }

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
          // Check if user is checked into a venue to record match location
          const [activeCheckIn] = await db.select().from(checkIns)
            .where(and(
              eq(checkIns.userId, req.userId),
              isNull(checkIns.checkedOutAt)
            ))
            .limit(1);

          // Create match
          const [match] = await db.insert(matches).values({
            userAId: req.userId,
            userBId: swipedId,
            venueId: activeCheckIn?.venueId || null,
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
    
    // Atomic 3-turn icebreaker conversation. Client submits only the pack id and its
    // two tone picks; the server resolves the conversation text from the canonical pack
    // and derives Person 2's reply tone deterministically. This prevents clients from
    // forging messages attributed to the other user.
    app.post("/api/matches/:id/icebreaker-conversation", authMiddleware, async (req: any, res) => {
      try {
        const matchId = parseInt(req.params.id);
        const { packId, turn1Tone, turn3Tone } = req.body || {};
        const validTones = ["flirty", "subtle", "neutral"];
        if (typeof packId !== "string" || !validTones.includes(turn1Tone) || !validTones.includes(turn3Tone)) {
          return res.status(400).json({ error: "packId, turn1Tone, turn3Tone required" });
        }
        const pack = getPackById(packId);
        if (!pack) return res.status(400).json({ error: "Unknown packId" });

        const result = await db.transaction(async (tx) => {
          const [match] = await tx.select().from(matches).where(eq(matches.id, matchId)).limit(1);
          if (!match) return { code: 404, body: { error: "Match not found" } };
          if (match.userAId !== req.userId && match.userBId !== req.userId) {
            return { code: 403, body: { error: "Not authorized" } };
          }
          if (match.icebreakerCompleted) {
            return { code: 409, body: { error: "Icebreaker already completed" } };
          }
          const otherId = match.userAId === req.userId ? match.userBId : match.userAId;
          const turn2Tone = pickOtherTone(String(matchId), 2, turn1Tone);
          const round = renderRoundPath(pack, turn1Tone, turn2Tone);
          if (!validateIcebreakerRound(round)) {
            return { code: 500, body: { error: "Pack failed validation" } };
          }
          const turn1Body = pack.turn1_options[turn1Tone as keyof typeof pack.turn1_options];
          const turn2Body = pack.turn2_options[turn1Tone as keyof typeof pack.turn2_options][turn2Tone];
          const turn3Body = pack.turn3_options[turn2Tone][turn3Tone as keyof typeof pack.turn1_options];

          // Compare-and-set: only the first concurrent winner flips the flag.
          const claimed = await tx.update(matches)
            .set({ icebreakerCompleted: true })
            .where(and(eq(matches.id, matchId), eq(matches.icebreakerCompleted, false)))
            .returning();
          if (claimed.length === 0) {
            return { code: 409, body: { error: "Icebreaker already completed" } };
          }

          const inserted = await tx.insert(messages).values([
            { matchId, senderId: req.userId, body: turn1Body, meta: { icebreaker: true, turn: 1, packId, tone: turn1Tone } },
            { matchId, senderId: otherId, body: turn2Body, meta: { icebreaker: true, turn: 2, packId, tone: turn2Tone } },
            { matchId, senderId: req.userId, body: turn3Body, meta: { icebreaker: true, turn: 3, packId, tone: turn3Tone } },
          ]).returning();
          return { code: 200, body: { messages: inserted, turn2Tone } };
        });

        return res.status(result.code).json(result.body);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // (Removed) PATCH /api/matches/:id/icebreaker — completion is only granted
    // through POST /api/matches/:id/icebreaker-conversation so the canonical
    // 3-message conversation always exists when chat is unlocked.

    // Get user matches
    app.get("/api/matches", authMiddleware, async (req: any, res) => {
      try {
        const blockedIds = await getBlockedUserIds(req.userId);
        const userMatches = await db.select().from(matches)
          .where(or(
            eq(matches.userAId, req.userId),
            eq(matches.userBId, req.userId)
          ));
        const visibleMatches = userMatches.filter((m) => {
          const otherId = m.userAId === req.userId ? m.userBId : m.userAId;
          return !blockedIds.includes(otherId);
        });

        const matchesWithUsers = await Promise.all(visibleMatches.map(async (match) => {
          const otherId = match.userAId === req.userId ? match.userBId : match.userAId;
          const [other] = await db.select({
            id: users.id,
            name: users.name,
            city: users.city,
            bio: users.bio,
            gender: users.gender,
            photos: users.photos,
            verified: users.verified
          }).from(users)
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
        
        const [match] = await db.select().from(matches)
          .where(eq(matches.id, matchId))
          .limit(1);
        if (!match || (match.userAId !== req.userId && match.userBId !== req.userId)) {
          return res.status(403).json({ error: "Access denied" });
        }
        
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
        
        const [match] = await db.select().from(matches)
          .where(eq(matches.id, matchId))
          .limit(1);
        if (!match || (match.userAId !== req.userId && match.userBId !== req.userId)) {
          return res.status(403).json({ error: "Access denied" });
        }

        const { body } = req.body;

        // Free chat is locked until the icebreaker conversation has been completed via
        // POST /api/matches/:id/icebreaker-conversation. No prefix-based bypass.
        if (!match.icebreakerCompleted) {
          return res.status(403).json({ error: "Complete the icebreaker first" });
        }
        
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
    // Get single room with participants
    app.get("/api/rooms/:id", authMiddleware, async (req: any, res) => {
      try {
        const roomId = parseInt(req.params.id);
        const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
        if (!room) return res.status(404).json({ error: "Room not found" });

        const presences = await db.select().from(roomPresence)
          .where(and(eq(roomPresence.roomId, roomId), isNull(roomPresence.leftAt)));

        const blockedIds = await getBlockedUserIds(req.userId);
        const visibleIds = presences.map(p => p.userId).filter(id => !blockedIds.includes(id));

        const participants = visibleIds.length > 0
          ? await db.select({
              id: users.id,
              name: users.name,
              city: users.city,
              bio: users.bio,
              gender: users.gender,
              photos: users.photos,
              verified: users.verified,
            }).from(users).where(inArray(users.id, visibleIds))
          : [];

        const minsLeft = Math.max(0, Math.round((new Date(room.endsAt).getTime() - Date.now()) / 60000));
        res.json({ room, participants, minsLeft, count: visibleIds.length });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/rooms", authMiddleware, async (req: any, res) => {
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
        
        // Get participant counts and gender ratios
        const roomsWithCounts = await Promise.all(activeRooms.map(async (room) => {
          const presences = await db.select({ gender: users.gender })
            .from(roomPresence)
            .innerJoin(users, eq(roomPresence.userId, users.id))
            .where(and(
              eq(roomPresence.roomId, room.id),
              isNull(roomPresence.leftAt)
            ));
          
          const total = presences.length;
          const femaleCount = presences.filter(p => p.gender === 'female').length;
          
          return {
            ...room,
            participants: total,
            femaleRatio: total > 0 ? femaleCount / total : 0.5
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
    
    // Canonical drink catalogue (server-authoritative pricing — never trust client).
    const DRINK_CATALOG: Record<string, { cubes: number; localPaise: number }> = {
      beer:     { cubes: 150, localPaise: 25000 },
      cocktail: { cubes: 250, localPaise: 40000 },
      mocktail: { cubes: 100, localPaise: 18000 },
      coffee:   { cubes: 80,  localPaise: 15000 },
      shot:     { cubes: 80,  localPaise: 15000 },
    };

    const giftSendSchema = z.object({
      recipientId: z.number().int().positive(),
      drinkName: z.string().min(1).max(40),
      matchId: z.number().int().positive().optional(),
      venueId: z.number().int().positive().optional(),
      note: z.string().max(140).optional(),
    });

    // Send drink gift
    app.post("/api/gifts/send", authMiddleware, async (req: any, res) => {
      try {
        const parsed = giftSendSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Invalid gift payload", details: parsed.error.flatten() });
        }
        const { recipientId, drinkName, matchId, venueId, note } = parsed.data;

        if (recipientId === req.userId) {
          return res.status(400).json({ error: "You can't gift yourself a drink." });
        }

        const drinkKey = drinkName.trim().toLowerCase();
        const drink = DRINK_CATALOG[drinkKey];
        if (!drink) {
          return res.status(400).json({ error: "Unknown drink type" });
        }

        // Block / report guard — don't let blocked relationships gift.
        const blockedIds = await getBlockedUserIds(req.userId);
        if (blockedIds.includes(recipientId)) {
          return res.status(403).json({ error: "You can't gift this user." });
        }

        // Recipient must exist.
        const [recipient] = await db.select().from(users).where(eq(users.id, recipientId)).limit(1);
        if (!recipient) return res.status(404).json({ error: "Recipient not found" });

        // Validate optional context: matchId must include the sender.
        let safeMatchId: number | undefined = matchId;
        if (matchId) {
          const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
          if (!m || (m.userAId !== req.userId && m.userBId !== req.userId)) {
            safeMatchId = undefined;
          }
        }
        let safeVenueId: number | undefined = venueId;
        if (venueId) {
          const [v] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
          if (!v) safeVenueId = undefined;
        }

        const qrCode = nanoid(16);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Atomic conditional debit — only debits when balance >= cost.
        // Prevents concurrent overspend; insufficient balance returns 0 rows.
        const debited = await db
          .update(cubeWallets)
          .set({
            balance: sql`balance - ${drink.cubes}`,
            totalSpent: sql`total_spent + ${drink.cubes}`,
          })
          .where(and(
            eq(cubeWallets.userId, req.userId),
            gte(cubeWallets.balance, drink.cubes),
          ))
          .returning({ balance: cubeWallets.balance });

        if (debited.length === 0) {
          // Either wallet missing or insufficient balance under contention.
          const [w] = await db.select().from(cubeWallets).where(eq(cubeWallets.userId, req.userId)).limit(1);
          return res.status(402).json({ error: "Insufficient cubes", needed: drink.cubes, balance: w?.balance ?? 0 });
        }

        // Create gift + ledger entry. If either fails we refund the cubes.
        try {
          const [gift] = await db.insert(drinkGifts).values({
            senderId: req.userId,
            recipientId,
            matchId: safeMatchId,
            drinkName: drinkKey,
            note: note || null,
            venueId: safeVenueId,
            cubesCost: drink.cubes,
            qrCode,
            expiresAt,
          }).returning();

          await db.insert(cubeTransactions).values({
            userId: req.userId,
            kind: "spend",
            amount: drink.cubes,
            meta: { reason: "drink_gift", giftId: gift.id, recipientId, drink: drinkKey },
          });

          res.json({
            success: true,
            gift: { ...gift, localPaise: drink.localPaise },
          });
        } catch (innerErr: any) {
          // Refund on failure to keep wallet consistent.
          await db.update(cubeWallets)
            .set({
              balance: sql`balance + ${drink.cubes}`,
              totalSpent: sql`total_spent - ${drink.cubes}`,
            })
            .where(eq(cubeWallets.userId, req.userId));
          throw innerErr;
        }
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Gifts received by the current user (pending vouchers).
    app.get("/api/gifts/received", authMiddleware, async (req: any, res) => {
      try {
        const rows = await db
          .select({
            id: drinkGifts.id,
            drinkName: drinkGifts.drinkName,
            note: drinkGifts.note,
            cubesCost: drinkGifts.cubesCost,
            qrCode: drinkGifts.qrCode,
            accepted: drinkGifts.accepted,
            redeemedAt: drinkGifts.redeemedAt,
            expiresAt: drinkGifts.expiresAt,
            createdAt: drinkGifts.createdAt,
            senderId: drinkGifts.senderId,
            senderName: users.name,
            senderPhotos: users.photos,
          })
          .from(drinkGifts)
          .innerJoin(users, eq(users.id, drinkGifts.senderId))
          .where(eq(drinkGifts.recipientId, req.userId))
          .orderBy(desc(drinkGifts.createdAt))
          .limit(50);
        res.json(rows);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Gifts sent by the current user.
    app.get("/api/gifts/sent", authMiddleware, async (req: any, res) => {
      try {
        const rows = await db
          .select({
            id: drinkGifts.id,
            drinkName: drinkGifts.drinkName,
            note: drinkGifts.note,
            cubesCost: drinkGifts.cubesCost,
            qrCode: drinkGifts.qrCode,
            accepted: drinkGifts.accepted,
            redeemedAt: drinkGifts.redeemedAt,
            expiresAt: drinkGifts.expiresAt,
            createdAt: drinkGifts.createdAt,
            recipientId: drinkGifts.recipientId,
            recipientName: users.name,
            recipientPhotos: users.photos,
          })
          .from(drinkGifts)
          .innerJoin(users, eq(users.id, drinkGifts.recipientId))
          .where(eq(drinkGifts.senderId, req.userId))
          .orderBy(desc(drinkGifts.createdAt))
          .limit(50);
        res.json(rows);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Accept drink gift
    app.post("/api/gifts/:id/accept", authMiddleware, async (req: any, res) => {
      try {
        const giftId = parseInt(req.params.id);
        if (Number.isNaN(giftId)) return res.status(400).json({ error: "Invalid id" });

        const [gift] = await db.update(drinkGifts)
          .set({ accepted: true })
          .where(and(
            eq(drinkGifts.id, giftId),
            eq(drinkGifts.recipientId, req.userId)
          ))
          .returning();

        if (!gift) return res.status(404).json({ error: "Gift not found" });
        res.json({ success: true, gift });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Redeem at bar (one-shot). Validates QR + expiry + recipient.
    app.post("/api/gifts/redeem", authMiddleware, async (req: any, res) => {
      try {
        const { qrCode } = req.body || {};
        if (typeof qrCode !== "string" || !qrCode) {
          return res.status(400).json({ error: "Missing QR code" });
        }
        // Single atomic conditional update — guarantees one-shot redemption
        // even under concurrent requests.
        const now = new Date();
        const [updated] = await db.update(drinkGifts)
          .set({ redeemedAt: now, accepted: true })
          .where(and(
            eq(drinkGifts.qrCode, qrCode),
            eq(drinkGifts.recipientId, req.userId),
            isNull(drinkGifts.redeemedAt),
            or(isNull(drinkGifts.expiresAt), gte(drinkGifts.expiresAt, now)),
          ))
          .returning();

        if (!updated) {
          // Distinguish reasons for clearer client messaging.
          const [existing] = await db.select().from(drinkGifts).where(eq(drinkGifts.qrCode, qrCode)).limit(1);
          if (!existing) return res.status(404).json({ error: "Voucher not found" });
          if (existing.recipientId !== req.userId) return res.status(403).json({ error: "Not your voucher" });
          if (existing.redeemedAt) return res.status(409).json({ error: "Already redeemed", redeemedAt: existing.redeemedAt });
          return res.status(410).json({ error: "Voucher expired" });
        }
        res.json({ success: true, gift: updated });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ============ DATE BOOKING ROUTES ============
    
    const proposeDateSchema = z.object({
      matchId: z.number().int().positive(),
      venueId: z.number().int().positive(),
      bookingDate: z.string().min(1),
      location: z.string().max(200).optional(),
      safetyCheck: z.boolean().optional(),
    });

    // Propose a date — validates that the proposer is in the match
    // and that venue exists, then upserts a single active booking per match.
    app.post("/api/dates/propose", authMiddleware, async (req: any, res) => {
      try {
        const parsed = proposeDateSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Invalid date payload", details: parsed.error.flatten() });
        }
        const { matchId, venueId, bookingDate, location } = parsed.data;

        const when = new Date(bookingDate);
        if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
          return res.status(400).json({ error: "Date must be in the future" });
        }

        const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
        if (!match) return res.status(404).json({ error: "Match not found" });
        if (match.userAId !== req.userId && match.userBId !== req.userId) {
          return res.status(403).json({ error: "Not your match" });
        }

        const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
        if (!venue) return res.status(404).json({ error: "Venue not found" });

        const qrCode = nanoid(16);
        const [booking] = await db.insert(dateBookings).values({
          matchId,
          venueId,
          proposedBy: req.userId,
          bookingDate: when,
          location: location ?? venue.name,
          qrCode,
        }).returning();

        res.json({ success: true, booking });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // List bookings for a given match (only members can see).
    app.get("/api/dates/match/:matchId", authMiddleware, async (req: any, res) => {
      try {
        const matchId = parseInt(req.params.matchId);
        if (Number.isNaN(matchId)) return res.status(400).json({ error: "Invalid match id" });

        const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
        if (!match) return res.status(404).json({ error: "Match not found" });
        if (match.userAId !== req.userId && match.userBId !== req.userId) {
          return res.status(403).json({ error: "Not your match" });
        }

        const list = await db
          .select({
            id: dateBookings.id,
            matchId: dateBookings.matchId,
            venueId: dateBookings.venueId,
            proposedBy: dateBookings.proposedBy,
            bookingDate: dateBookings.bookingDate,
            location: dateBookings.location,
            qrCode: dateBookings.qrCode,
            confirmed: dateBookings.confirmed,
            createdAt: dateBookings.createdAt,
            venueName: venues.name,
            venueImage: venues.imageUrl,
            venueArea: venues.area,
          })
          .from(dateBookings)
          .leftJoin(venues, eq(venues.id, dateBookings.venueId))
          .where(eq(dateBookings.matchId, matchId))
          .orderBy(desc(dateBookings.createdAt));

        res.json(list);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Confirm date — only the OTHER side may confirm.
    app.post("/api/dates/:id/confirm", authMiddleware, async (req: any, res) => {
      try {
        const bookingId = parseInt(req.params.id);
        if (Number.isNaN(bookingId)) return res.status(400).json({ error: "Invalid id" });

        const [booking] = await db.select().from(dateBookings).where(eq(dateBookings.id, bookingId)).limit(1);
        if (!booking) return res.status(404).json({ error: "Booking not found" });
        if (booking.proposedBy === req.userId) {
          return res.status(403).json({ error: "Only the other side can accept" });
        }
        const [match] = await db.select().from(matches).where(eq(matches.id, booking.matchId)).limit(1);
        if (!match || (match.userAId !== req.userId && match.userBId !== req.userId)) {
          return res.status(403).json({ error: "Not your match" });
        }
        if (booking.confirmed) {
          return res.json({ success: true, booking, cubesEarned: 0, already: true });
        }

        const [updated] = await db.update(dateBookings)
          .set({ confirmed: true })
          .where(eq(dateBookings.id, bookingId))
          .returning();

        // Award cubes to BOTH sides — confirmer + proposer.
        const cubesEarned = 20;
        await db.update(cubeWallets)
          .set({ balance: sql`balance + ${cubesEarned}`, totalEarned: sql`total_earned + ${cubesEarned}` })
          .where(inArray(cubeWallets.userId, [req.userId, booking.proposedBy]));

        await db.insert(cubeTransactions).values([
          { userId: req.userId,        kind: "earn", amount: cubesEarned, meta: { reason: "date_confirmed", bookingId } },
          { userId: booking.proposedBy, kind: "earn", amount: cubesEarned, meta: { reason: "date_confirmed", bookingId } },
        ]);

        res.json({ success: true, booking: updated, cubesEarned });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Decline date — either side may decline.
    app.post("/api/dates/:id/decline", authMiddleware, async (req: any, res) => {
      try {
        const bookingId = parseInt(req.params.id);
        if (Number.isNaN(bookingId)) return res.status(400).json({ error: "Invalid id" });

        const [booking] = await db.select().from(dateBookings).where(eq(dateBookings.id, bookingId)).limit(1);
        if (!booking) return res.status(404).json({ error: "Booking not found" });
        const [match] = await db.select().from(matches).where(eq(matches.id, booking.matchId)).limit(1);
        if (!match || (match.userAId !== req.userId && match.userBId !== req.userId)) {
          return res.status(403).json({ error: "Not your match" });
        }
        await db.delete(dateBookings).where(eq(dateBookings.id, bookingId));
        res.json({ success: true });
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

    // ============ REPORTS & BLOCKS ============
    const reportBodySchema = z.object({
      reportedUserId: z.number().int().positive().optional(),
      contentType: z.enum(["user", "message", "photo", "room"]),
      contentId: z.string().min(1).max(120).optional(),
      reason: z.string().min(3).max(500),
    });
    app.post("/api/reports", reportLimiter, authMiddleware, async (req: any, res) => {
      try {
        const parsed = reportBodySchema.safeParse(req.body || {});
        if (!parsed.success) return res.status(400).json({ error: "Invalid report payload" });
        const { reportedUserId, contentType, contentId, reason } = parsed.data;
        const [row] = await db.insert(reports).values({
          reporterId: req.userId,
          reportedUserId: reportedUserId || null,
          contentType,
          contentId: contentId || null,
          reason,
          status: "pending",
        }).returning();
        res.json({ ok: true, report: row });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/api/blocks", authMiddleware, async (req: any, res) => {
      try {
        const rows = await db.select().from(blocks).where(eq(blocks.blockerId, req.userId));
        res.json(rows);
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    const blockBodySchema = z.object({ blockedId: z.number().int().positive() });
    app.post("/api/blocks", authMiddleware, async (req: any, res) => {
      try {
        const parsed = blockBodySchema.safeParse(req.body || {});
        if (!parsed.success) return res.status(400).json({ error: "Invalid block payload" });
        const { blockedId } = parsed.data;
        if (blockedId === req.userId) return res.status(400).json({ error: "Cannot block yourself" });
        const [existing] = await db.select().from(blocks)
          .where(and(eq(blocks.blockerId, req.userId), eq(blocks.blockedId, blockedId))).limit(1);
        if (existing) return res.json({ ok: true, block: existing, alreadyBlocked: true });
        const [row] = await db.insert(blocks).values({ blockerId: req.userId, blockedId }).returning();
        res.json({ ok: true, block: row });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    app.delete("/api/blocks/:blockedId", authMiddleware, async (req: any, res) => {
      try {
        const blockedId = parseInt(req.params.blockedId);
        await db.delete(blocks)
          .where(and(eq(blocks.blockerId, req.userId), eq(blocks.blockedId, blockedId)));
        res.json({ ok: true });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    // ============ PHOTO UPLOAD ============
    // Accepts up to 6 images, appends URLs to users.photos, returns the new list.
    app.post("/api/me/photos", uploadLimiter, authMiddleware, upload.array("photos", 6), async (req: any, res) => {
      try {
        const files = (req.files as Express.Multer.File[]) || [];
        if (!files.length) return res.status(400).json({ error: "No files uploaded" });
        const urls = files.map(f => `/uploads/${path.basename(f.path)}`);
        const [me] = await db.select({ photos: users.photos }).from(users).where(eq(users.id, req.userId)).limit(1);
        const existing: string[] = Array.isArray(me?.photos) ? (me!.photos as any) : [];
        const merged = [...existing, ...urls].slice(0, 6);
        await db.update(users).set({ photos: merged, updatedAt: new Date() }).where(eq(users.id, req.userId));
        res.json({ ok: true, photos: merged, added: urls });
      } catch (e: any) {
        console.error("[upload] failed:", e?.message || e);
        res.status(500).json({ error: e.message || "Upload failed" });
      }
    });

    app.delete("/api/me/photos", authMiddleware, async (req: any, res) => {
      try {
        const url = String(req.body?.url || "");
        if (!url) return res.status(400).json({ error: "url required" });
        const [me] = await db.select({ photos: users.photos }).from(users).where(eq(users.id, req.userId)).limit(1);
        const existing: string[] = Array.isArray(me?.photos) ? (me!.photos as any) : [];
        const next = existing.filter(p => p !== url);
        await db.update(users).set({ photos: next, updatedAt: new Date() }).where(eq(users.id, req.userId));
        // Best-effort: remove local file if it lives in /uploads
        if (url.startsWith("/uploads/")) {
          const localPath = path.join(process.cwd(), url);
          fs.promises.unlink(localPath).catch(() => {});
        }
        res.json({ ok: true, photos: next });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    return httpServer;
  }
  