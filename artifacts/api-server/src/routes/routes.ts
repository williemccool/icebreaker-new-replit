import type { Express, Request, Response, NextFunction } from "express";
  import { createServer, type Server } from "http";
  import { Server as SocketServer, type DefaultEventsMap } from "socket.io";
  import { db } from "@workspace/db";
  import { 
    users, otpVerifications, preferences, swipes, matches, messages,
    venues, checkIns, rooms, roomPresence, events, tickets,
    cubeWallets, cubeTransactions, quests, questProgress, seasons,
    leaderboards, subscriptions, drinkGifts, dateBookings, crews, crewMembers, badges, userBadges,
    reports, blocks, paymentOrders, deviceTokens,
    insertReportSchema, insertBlockSchema
  } from "@workspace/db";
  import { getPackById, pickOtherTone, pickPackForMatch, turnOptions, TOTAL_TURNS, type Tone } from "../icebreakerPacks";
  import {
    onProfileCompleted, onPhotoUploaded, onCheckIn, onFirstLike,
    onMatchCreated, onMessageSent, onRoomJoined, onGiftRedeemed,
  } from "../services/gamification";
  import { eq, and, or, desc, sql, gte, lte, lt, isNull, ne, notInArray, inArray } from "drizzle-orm";
  import bcrypt from "bcryptjs";
  import jwt from "jsonwebtoken";
  import { nanoid } from "nanoid";
  import crypto from "crypto";
  import multer from "multer";
  import rateLimit, { ipKeyGenerator } from "express-rate-limit";
  import { z } from "zod";
  import { socketCorsOrigin } from "../lib/cors";
  import { getPhotoStorage } from "../services/storage";
  import { verifyRazorpaySignature } from "../lib/payments";
  import { sendExpoPush } from "../lib/push";

  // ============ DEMO CONSTANTS ============
  // Demo credentials are scoped to a single known phone. They are gated behind
  // ENABLE_DEMO_AUTH so they can power client showcases without shipping an OTP
  // bypass to real production by default.
  export const DEMO_PHONE = "8095411567";
  export const DEMO_OTP = "123456";

  // ============ JWT SECRET — fail-fast in production ============
  const IS_PROD = process.env.NODE_ENV === "production";
  if (IS_PROD && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable must be set in production.");
  }
  const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me-not-for-production";
  // Access tokens expire so a leaked token isn't valid forever. No refresh flow
  // yet, so 7d balances security with not logging users out mid-session.
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
  function signToken(userId: number): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  }

  // Demo auth (OTP bypass for DEMO_PHONE): on by default in dev, OFF by default
  // in production unless ENABLE_DEMO_AUTH=true is explicitly set.
  const DEMO_AUTH_ENABLED = IS_PROD
    ? process.env.ENABLE_DEMO_AUTH === "true"
    : process.env.ENABLE_DEMO_AUTH !== "false";
  if (DEMO_AUTH_ENABLED) {
    console.warn(`[auth] DEMO AUTH ENABLED — phone ${DEMO_PHONE} bypasses OTP. Set ENABLE_DEMO_AUTH=false to disable.`);
  }

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
  // Files are buffered in memory and then handed to the configured storage
  // provider (local disk in dev, S3-compatible object storage in prod), so the
  // route never assumes the local filesystem is the source of truth.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 6 },
    fileFilter: (_req, file, cb) => {
      const ok = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.mimetype);
      // @types/multer types the error arg as `null` only; cast is required.
      cb(ok ? null : (new Error("Unsupported image type") as any), ok);
    },
  });

  // Middleware to verify JWT token
  export function authMiddleware(req: any, res: any, next: any) {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      res.status(401).json({ error: "No token provided" }); return;
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      req.userId = decoded.userId;
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid token" }); return;
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

  // Seed realistic demo participants so the demo user sees people to swipe on.
  // Uses a phone prefix "SEED_" to identify seeds; idempotent on every restart.
  async function ensureDemoParticipants() {
    try {
      const SEEDS = [
        { phone: "SEED_001", name: "Priya Sharma",  gender: "female", city: "Bangalore", bio: "Loves live music and rooftop sunsets", dob: new Date("1998-03-12"), photos: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80"] },
        { phone: "SEED_002", name: "Aditya Rao",    gender: "male",   city: "Bangalore", bio: "Weekend trekker, foodie, startup nerd", dob: new Date("1996-07-22"), photos: ["https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80"] },
        { phone: "SEED_003", name: "Nisha Verma",   gender: "female", city: "Bangalore", bio: "Dancing till 3am is self-care",         dob: new Date("2000-01-05"), photos: ["https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80"] },
        { phone: "SEED_004", name: "Karan Mehta",   gender: "male",   city: "Bangalore", bio: "Craft beer enthusiast, dog dad",         dob: new Date("1995-11-18"), photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80"] },
        { phone: "SEED_005", name: "Ananya Iyer",   gender: "female", city: "Bangalore", bio: "Jazz, chai, and good conversation",      dob: new Date("1999-06-30"), photos: ["https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80"] },
        { phone: "SEED_006", name: "Rohan Das",     gender: "male",   city: "Bangalore", bio: "DJ by night, designer by day",           dob: new Date("1997-09-14"), photos: ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80"] },
        { phone: "SEED_007", name: "Meera Pillai",  gender: "female", city: "Bangalore", bio: "Reading, running, raving",               dob: new Date("2001-04-02"), photos: ["https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80"] },
        { phone: "SEED_008", name: "Vikram Singh",  gender: "male",   city: "Bangalore", bio: "Surfer catching Bengaluru vibes",         dob: new Date("1994-12-08"), photos: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80"] },
        { phone: "SEED_009", name: "Divya Nair",    gender: "female", city: "Bangalore", bio: "Laugh loud, dream louder",               dob: new Date("1999-08-19"), photos: ["https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80"] },
        { phone: "SEED_010", name: "Arjun Bose",    gender: "male",   city: "Bangalore", bio: "Midnight snacks and long chats",          dob: new Date("1996-02-27"), photos: ["https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80"] },
      ] as const;

      const seedIds: number[] = [];
      for (const seed of SEEDS) {
        const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, seed.phone)).limit(1);
        if (existing) {
          await db.update(users).set({ photos: seed.photos, verified: true }).where(eq(users.id, existing.id));
          seedIds.push(existing.id);
        } else {
          const [created] = await db.insert(users).values({
            phone: seed.phone,
            name: seed.name,
            gender: seed.gender as any,
            city: seed.city,
            bio: seed.bio,
            dob: seed.dob,
            verified: true,
            photos: seed.photos,
          }).returning({ id: users.id });
          await db.insert(cubeWallets).values({ userId: created.id, balance: 150 });
          await db.insert(preferences).values({ userId: created.id });
          seedIds.push(created.id);
        }
      }

      // Make sure every active room has all seed users present.
      const activeRooms = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.active, true));
      for (const room of activeRooms) {
        const existing = await db.select({ userId: roomPresence.userId })
          .from(roomPresence)
          .where(and(eq(roomPresence.roomId, room.id), isNull(roomPresence.leftAt)));
        const presentIds = new Set(existing.map(p => p.userId));
        for (const uid of seedIds) {
          if (!presentIds.has(uid)) {
            await db.insert(roomPresence).values({ roomId: room.id, userId: uid });
          }
        }
      }
      console.log(`[demo] Ensured ${seedIds.length} seed participants across ${activeRooms.length} rooms.`);
    } catch (e) {
      console.error("[demo] ensureDemoParticipants failed:", e);
    }
  }

  export function registerRoutes(app: Express): Server {
    // Kick off the live-rooms guard on boot, then re-check every 15 min.
    ensureLiveRooms();
    setInterval(ensureLiveRooms, 15 * 60 * 1000);
    // Seed demo participants once on boot (idempotent).
    ensureLiveRooms().then(() => ensureDemoParticipants());

    const httpServer = createServer(app);
    // Typed socket.data so the authenticated userId is strongly typed everywhere
    // (no `as any` on every access). Event maps stay default/loose.
    interface IcebreakerSocketData { userId?: number }
    const io = new SocketServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, IcebreakerSocketData>(httpServer, {
      cors: {
        origin: socketCorsOrigin,
        methods: ["GET", "POST"]
      }
    });

    // Require a valid JWT on the Socket.IO handshake. The decoded userId becomes
    // the trusted sender identity for any socket event.
    io.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");
        if (!token) return next(new Error("Unauthorized"));
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        socket.data.userId = decoded.userId;
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
      const authedUserId: number | undefined = socket.data?.userId;

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

          // Gamification: reward joining a live room.
          await onRoomJoined(authedUserId).catch(() => {});

          // Look up user for the activity event
          const [u] = await db.select({ id: users.id, name: users.name, photos: users.photos })
            .from(users).where(eq(users.id, authedUserId)).limit(1);

          io.to(`room:${roomId}`).emit("room:user_joined", { userId: authedUserId, name: u?.name, photo: (u?.photos as string[] | null)?.[0] || null });

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
          io.to(`room:${roomId}`).emit("room:message", { ...msg, photo: (u?.photos as string[] | null)?.[0] || null });
        } catch { /* swallow */ }
      });

      // Typing indicator in rooms
      socket.on("room:typing", ({ roomId }: { roomId: number }) => {
        if (!authedUserId || typeof roomId !== "number") return;
        socket.to(`room:${roomId}`).emit("room:typing", { userId: authedUserId });
      });

      // Join a 1:1 match room so both participants receive live "message:received"
      // broadcasts. Membership is verified against the JWT identity.
      socket.on("match:join", async ({ matchId }: { matchId: number }) => {
        try {
          if (!authedUserId || typeof matchId !== "number") return;
          const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
          if (!m || (m.userAId !== authedUserId && m.userBId !== authedUserId)) return;
          socket.join(`match:${matchId}`);
        } catch { /* swallow */ }
      });
      socket.on("match:leave", ({ matchId }: { matchId: number }) => {
        if (typeof matchId === "number") socket.leave(`match:${matchId}`);
      });
      // Typing indicator inside a 1:1 chat.
      socket.on("match:typing", ({ matchId }: { matchId: number }) => {
        if (!authedUserId || typeof matchId !== "number") return;
        socket.to(`match:${matchId}`).emit("match:typing", { matchId, userId: authedUserId });
      });
      
      // Authenticated chat send. Sender identity comes from the socket's JWT, not
      // from the client payload. Membership and icebreaker gate are enforced.
      socket.on("message:send", async (data) => {
        try {
          const authedUserId: number | undefined = socket.data?.userId;
          if (!authedUserId) return;
          const matchId = Number(data?.matchId);
          // Cap message length so a single payload can't bloat the DB / be abused.
          const body = typeof data?.body === "string" ? data.body.trim().slice(0, 2000) : "";
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

          await onMessageSent(authedUserId).catch(() => {});

          io.to(`match:${matchId}`).emit("message:received", message);

          // Push the recipient if they're not currently connected.
          const recipientId = match.userAId === authedUserId ? match.userBId : match.userAId;
          void notifyOfflineMessage(recipientId, authedUserId, body);
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
        if (!parsed.success) { res.status(400).json({ error: "Invalid phone" }); return; }
        const { phone } = parsed.data;

        // Demo phone: do NOT call SMS provider — code is fixed and known to demo audience.
        if (DEMO_AUTH_ENABLED && phone === DEMO_PHONE) {
          res.json({ success: true, message: "Demo phone — use code 123456", demo: true }); return;
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
        if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
        const { phone, otp } = parsed.data;

        let verification: typeof otpVerifications.$inferSelect | undefined;

        // Whitelisted demo bypass: ONLY for the known demo phone, in any environment,
        // and only when the canonical demo OTP is presented. This is intentional and
        // documented so client showcases keep working in production.
        const demoBypass = DEMO_AUTH_ENABLED && phone === DEMO_PHONE && otp === DEMO_OTP;

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
            res.status(400).json({ error: "Invalid or expired OTP" }); return;
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
          // Create new user. A user who authenticates is a real player, not a bot.
          [user] = await db.insert(users).values({
            phone,
            name: "",
            dob: new Date(),
            gender: "male",
            city: "",
            verified: false,
            isBot: false
          }).returning();
          
          // Create wallet and preferences
          await db.insert(cubeWallets).values({
            userId: user.id,
            balance: user.gender === "female" ? 200 : 100 // Women get 2x starting cubes
          });
          
          await db.insert(preferences).values({
            userId: user.id
          });
        } else if (user.isBot) {
          // Existing profile just authenticated for the first time — promote to a real player.
          await db.update(users).set({ isBot: false }).where(eq(users.id, user.id));
          user = { ...user, isBot: false };
        }
        
        const token = signToken(user.id);
        
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
        if (!clerkSecret) { res.status(503).json({ error: "Clerk not configured" }); return; }
        const { sessionToken } = req.body || {};
        if (!sessionToken || typeof sessionToken !== "string") {
          res.status(400).json({ error: "Missing sessionToken" }); return;
        }

        const { createClerkClient, verifyToken } = await import("@clerk/backend");
        const clerk = createClerkClient({ secretKey: clerkSecret });

        let payload: any;
        try {
          payload = await verifyToken(sessionToken, { secretKey: clerkSecret });
        } catch (e: any) {
          res.status(401).json({ error: "Invalid Clerk session" }); return;
        }
        const clerkUserId = payload?.sub as string | undefined;
        if (!clerkUserId) { res.status(401).json({ error: "Invalid Clerk session" }); return; }

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
              res.status(409).json({ error: "An account already exists for this email under a different login. Please sign in with your original method." }); return;
            }
            if (!user.clerkUserId) {
              await db.update(users).set({ clerkUserId }).where(eq(users.id, user.id));
            }
            if (user.isBot) {
              await db.update(users).set({ isBot: false }).where(eq(users.id, user.id));
              user = { ...user, isBot: false };
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
              isBot: false,
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

        const token = signToken(user.id);
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

    // Permanently delete the authenticated user's account and all associated data.
    // Apple and Google both REQUIRE in-app account deletion for apps that offer
    // account creation. FK onDelete rules (see lib/db schema) cascade-remove the
    // user's matches, messages, swipes, wallet, transactions, reports, blocks,
    // gifts, bookings, etc.; nullable references (event host, report reviewer) are
    // set null so unrelated records survive.
    app.delete("/api/user/me", authMiddleware, async (req: any, res) => {
      try {
        const [existing] = await db.select({ id: users.id, photos: users.photos })
          .from(users).where(eq(users.id, req.userId)).limit(1);
        if (!existing) { res.status(404).json({ error: "User not found" }); return; }

        // Best-effort: remove uploaded photos from object storage before the row
        // is gone. Storage cleanup failure must never block account deletion.
        try {
          const photos = Array.isArray(existing.photos) ? (existing.photos as string[]) : [];
          if (photos.length > 0) {
            const store = getPhotoStorage();
            await Promise.all(photos.map((url) => store.delete(url).catch(() => {})));
          }
        } catch { /* ignore storage cleanup errors */ }

        await db.delete(users).where(eq(users.id, req.userId));
        res.json({ ok: true, deleted: true });
      } catch (error: any) {
        console.error("[/api/user/me DELETE] failed", error);
        res.status(500).json({ error: "Failed to delete account" });
      }
    });

    // Register an Expo push token for the current device. Idempotent on the
    // token: re-registering the same token just re-points it at this user.
    app.post("/api/me/push-token", authMiddleware, async (req: any, res) => {
      try {
        const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
        const platform = typeof req.body?.platform === "string" ? req.body.platform.slice(0, 20) : null;
        if (!token) { res.status(400).json({ error: "token required" }); return; }
        await db.insert(deviceTokens)
          .values({ userId: req.userId, token, platform })
          .onConflictDoUpdate({
            target: deviceTokens.token,
            set: { userId: req.userId, platform, updatedAt: new Date() },
          });
        res.json({ ok: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Unregister a push token (on logout). With no body token, drops all of the
    // user's tokens.
    app.delete("/api/me/push-token", authMiddleware, async (req: any, res) => {
      try {
        const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
        if (token) {
          await db.delete(deviceTokens)
            .where(and(eq(deviceTokens.token, token), eq(deviceTokens.userId, req.userId)));
        } else {
          await db.delete(deviceTokens).where(eq(deviceTokens.userId, req.userId));
        }
        res.json({ ok: true });
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
          res.json({ wallet: { balance: 0, totalEarned: 0, totalSpent: 0 } }); return;
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
        if (!season) { res.json({ rank: null, score: 0, total: 0, season: null }); return; }
        const [me] = await db.select().from(leaderboards)
          .where(and(eq(leaderboards.seasonId, season.id), eq(leaderboards.userId, req.userId)))
          .limit(1);
        if (!me) { res.json({ rank: null, score: 0, total: 0, season }); return; }
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
        const { SHOP_CATALOG } = await import("../shop");
        const sku = String(req.body?.sku || "");
        const item = SHOP_CATALOG[sku];
        if (!item) { res.status(400).json({ error: "Unknown SKU" }); return; }
        const amountInPaise = Number(item.priceInPaise) || 0;
        if (amountInPaise <= 0) { res.status(400).json({ error: "Invalid amount for SKU" }); return; }

        const rp = getRazorpay();
        if (!rp) { res.status(503).json({
            error: "Razorpay not configured",
            fallback: "use_simulated",
            message: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable real payments.",
          }); return; }
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
          res.status(400).json({ error: "Missing payment fields" }); return;
        }
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) { res.status(503).json({ error: "Razorpay not configured" }); return; }

        if (!verifyRazorpaySignature({
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          secret,
        })) {
          res.status(400).json({ error: "Signature verification failed" }); return;
        }

        const [order] = await db.select().from(paymentOrders)
          .where(eq(paymentOrders.razorpayOrderId, razorpay_order_id)).limit(1);
        if (!order) { res.status(404).json({ error: "Order not found" }); return; }
        if (order.userId !== req.userId) { res.status(403).json({ error: "Order does not belong to user" }); return; }
        if (order.status === "paid") { res.json({ ok: true, alreadyGranted: true, sku: order.sku }); return; }

        // Atomic: grant entitlement AND flip the order to paid in one transaction.
        // If either fails, both roll back, so a retried verify re-grants exactly
        // once (and the status check above makes a successful verify idempotent).
        await db.transaction(async (tx) => {
          await grantSkuEntitlement(tx, req.userId, order.sku, { razorpayPaymentId: razorpay_payment_id });
          await tx.update(paymentOrders)
            .set({ status: "paid", razorpayPaymentId: razorpay_payment_id, completedAt: new Date() })
            .where(eq(paymentOrders.id, order.id));
        });

        res.json({ ok: true, sku: order.sku });
      } catch (e: any) {
        console.error("[razorpay] verify failed:", e?.message || e);
        res.status(500).json({ error: e?.message || "Verification failed" });
      }
    });

    // Executor type accepted by grantSkuEntitlement — the transaction handle
    // passed into db.transaction(). Forcing every grant to run inside a caller
    // transaction keeps the wallet balance, the ledger row, and (for payments)
    // the order-status flip atomic — so a mid-write failure can't desync them
    // or allow a replayed verify to double-grant.
    type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

    // Shared entitlement granter — used by both Razorpay verify and demo fallback.
    // MUST be called inside a db.transaction(); the caller owns the transaction.
    async function grantSkuEntitlement(tx: DbTx, userId: number, sku: string, meta: Record<string, any> = {}) {
      const { SHOP_CATALOG } = await import("../shop");
      const item = SHOP_CATALOG[sku];
      if (!item) throw new Error("Unknown SKU");

      if (item.category === "cubes") {
        const total = (item.cubes || 0) + (item.bonusCubes || 0);
        await tx.update(cubeWallets)
          .set({
            balance: sql`${cubeWallets.balance} + ${total}`,
            totalEarned: sql`${cubeWallets.totalEarned} + ${total}`,
            updatedAt: new Date(),
          })
          .where(eq(cubeWallets.userId, userId));
        await tx.insert(cubeTransactions).values({
          userId, kind: "earn", amount: total,
          meta: { reason: "purchase", sku, ...meta },
        });
        return { sku, cubesAdded: total };
      }

      if (item.category === "godmode") {
        const days = item.durationDays || 30;
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
        return { sku, endsAt: newEndsAt };
      }

      if (item.category === "season") {
        const bonus = 200;
        await tx.update(cubeWallets)
          .set({
            balance: sql`${cubeWallets.balance} + ${bonus}`,
            totalEarned: sql`${cubeWallets.totalEarned} + ${bonus}`,
            updatedAt: new Date(),
          })
          .where(eq(cubeWallets.userId, userId));
        await tx.insert(cubeTransactions).values({
          userId, kind: "earn", amount: bonus,
          meta: { reason: "season_pass", sku, ...meta },
        });
        return { sku, cubesAdded: bonus, bonusCubes: bonus };
      }
      throw new Error("Unsupported SKU category");
    }

    // Best-effort push when a chat message is sent. Skips the notification if the
    // recipient is currently connected (the socket already delivered it live).
    // Never throws — a push failure must not affect message delivery.
    async function notifyOfflineMessage(recipientId: number, senderId: number, body: string) {
      try {
        if (activeUsers.has(recipientId)) return;
        const tokens = await db.select({ token: deviceTokens.token })
          .from(deviceTokens).where(eq(deviceTokens.userId, recipientId));
        if (tokens.length === 0) return;
        const [sender] = await db.select({ name: users.name })
          .from(users).where(eq(users.id, senderId)).limit(1);
        await sendExpoPush(tokens.map((t) => t.token), {
          title: sender?.name ? `New message from ${sender.name}` : "New message",
          body: body.slice(0, 120),
          data: { type: "message", senderId },
        });
      } catch { /* best effort */ }
    }

    // Legacy / fallback purchase endpoint — only allowed for the demo user OR when
    // Razorpay isn't configured (so dev keeps working). In production with Razorpay
    // configured, this endpoint refuses non-demo users.
    app.post("/api/purchase", purchaseLimiter, authMiddleware, async (req: any, res) => {
      try {
        const { SHOP_CATALOG } = await import("../shop");
        const { sku } = req.body || {};
        const item = SHOP_CATALOG[sku];
        if (!item) { res.status(400).json({ error: "Unknown SKU" }); return; }

        // Guard: if Razorpay IS configured, this fallback path is only allowed
        // for the demo phone so client showcases still work. Real users must
        // pay via /api/payments/create-order + /api/payments/verify.
        if (getRazorpay()) {
          const [me] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, req.userId)).limit(1);
          if (me?.phone !== DEMO_PHONE) {
            res.status(402).json({ error: "Payment required. Use /api/payments/create-order." }); return;
          }
        }

        // Grant the entitlement atomically via the shared granter.
        const result = await db.transaction((tx) =>
          grantSkuEntitlement(tx, req.userId, sku, { priceInPaise: item.priceInPaise }),
        );
        res.json({ ok: true, ...result });
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
          res.status(404).json({ error: "Match not found" }); return;
        }

        if (match.userAId !== req.userId && match.userBId !== req.userId) {
          res.status(403).json({ error: "Not authorized" }); return;
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
          res.status(404).json({ error: "User not found" }); return;
        }
        res.json({ user });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Shared profile upsert handler. Wired to BOTH POST and PUT /api/user/profile
    // so the mobile onboarding screen (POST) and any profile-edit screen (PUT)
    // hit the same validated code path. The user row always exists by this point
    // (created at auth), so this is an update of the logged-in user's own row.
    async function handleProfileUpsert(req: any, res: any) {
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
            res.status(400).json({ error: "Invalid date of birth" }); return;
          }
          const now = new Date();
          let age = now.getFullYear() - d.getFullYear();
          const m = now.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
          if (age < 18) {
            res.status(403).json({ error: "You must be 18 or older to use Icebreaker." }); return;
          }
          if (age > 120) {
            res.status(400).json({ error: "Invalid date of birth" }); return;
          }
          updates.dob = d;
        }

        const [updated] = await db.update(users)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(users.id, req.userId))
          .returning();

        // Award the "profile completed" milestone once name + dob + gender are set.
        if (updated?.name && updated?.dob && updated?.gender) {
          await onProfileCompleted(req.userId).catch(() => {});
        }

        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
    // Update user profile — POST (onboarding) and PUT (edit) share one handler.
    app.post("/api/user/profile", authMiddleware, handleProfileUpsert);
    app.put("/api/user/profile", authMiddleware, handleProfileUpsert);
    
    // Verify selfie (front-camera capture). Stores a hash, marks user verified,
    // and grants the verification reward (50 XP + 1 Cube) on first success.
    app.post("/api/user/verify-selfie", authMiddleware, async (req: any, res) => {
      try {
        const { selfie } = req.body || {};
        if (typeof selfie !== "string" || !selfie.startsWith("data:image/")) {
          res.status(400).json({ error: "Invalid selfie payload" }); return;
        }
        // Very small sanity check — base64 payload should be non-trivial
        const b64 = selfie.split(",")[1] || "";
        if (b64.length < 1000) {
          res.status(400).json({ error: "Selfie image too small to verify" }); return;
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
          res.status(404).json({ error: "Venue not found" }); return;
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

        // Deduplicate — keep only the most recent open check-in per user
        const seen = new Set<number>();
        const uniqueCheckedInUsers = checkedInUsers.filter(row => {
          if (seen.has(row.user.id)) return false;
          seen.add(row.user.id);
          return true;
        });

        res.json({ venue, checkedInUsers: uniqueCheckedInUsers });
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
          res.json({ success: true, checkIn: existing, cubesEarned: 0, xpEarned: 0, alreadyCheckedIn: true }); return;
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
        
        // Award XP via gamification (recomputes level, leaderboard, quests, badges).
        await onCheckIn(req.userId, xpEarned).catch(() => {});

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
        if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
        const { swipedId, liked } = parsed.data;

        if (swipedId === req.userId) {
          res.status(400).json({ error: "Cannot swipe yourself" }); return;
        }
        // Cannot interact with blocked users (either direction)
        const blockedIds = await getBlockedUserIds(req.userId);
        if (blockedIds.includes(swipedId)) {
          res.status(403).json({ error: "User not available" }); return;
        }

        // Record swipe
        await db.insert(swipes).values({
          swiperId: req.userId,
          swipedId,
          liked
        });

        if (!liked) {
          res.json({ matched: false }); return;
        }

        // Gamification: reward likes (first-like milestone + quest progress).
        await onFirstLike(req.userId).catch(() => {});
        
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

          // Gamification: both sides progress on the "match" milestone/quest.
          await Promise.all([
            onMatchCreated(req.userId).catch(() => {}),
            onMatchCreated(swipedId).catch(() => {}),
          ]);

          res.json({ matched: true, match }); return;
        }
        
        res.json({ matched: false });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // ===================== TURN-BASED ICEBREAKER =====================
    // The icebreaker is a true async, 3-turn exchange between the two matched users:
    //   Turn 1 → initiator picks a tone (their opener)
    //   Turn 2 → the OTHER user picks a tone (their reply, branched off turn 1)
    //   Turn 3 → the initiator picks a closing tone (branched off turn 2)
    // Chat unlocks only after turn 3. Each turn is stored as a message whose meta
    // carries { icebreaker, turn, tone, packId }, so the conversation state is fully
    // derivable from the messages table — no extra schema needed.
    //
    // Demo/seed profiles (users.isBot = true) never open the app, so the server
    // auto-plays their turn (deterministically) to keep the flow moving. A profile
    // stops being a bot the moment a real person authenticates into it.
    const VALID_TONES = ["flirty", "subtle", "neutral"] as const;

    async function userIsBot(tx: any, userId: number): Promise<boolean> {
      const [u] = await tx.select({ isBot: users.isBot }).from(users).where(eq(users.id, userId)).limit(1);
      return u?.isBot === true;
    }

    // Pull only the icebreaker messages for a match, ordered by turn.
    function extractIcebreakerTurns(allMsgs: any[]) {
      return allMsgs
        .filter((m) => m?.meta && (m.meta as any).icebreaker === true)
        .sort((a, b) => ((a.meta as any).turn || 0) - ((b.meta as any).turn || 0));
    }

    // Resolve the canonical message body for a given turn, using the committed
    // tone path. `tones` is 0-indexed (tones[0] = turn-1 tone …).
    function resolveTurnBody(pack: any, turn: number, tones: (Tone | undefined)[]): string {
      const opts = turnOptions(pack, turn, tones);
      const tone = tones[turn - 1];
      return opts && tone ? opts[tone] : "";
    }

    // Who plays a given turn? Initiator plays the odd turns (1/3/5), the other
    // user plays the even turns (2/4/6) — three messages each across 6 turns.
    function playerForTurn(turn: number, initiatorId: number | null, userAId: number, userBId: number): number | null {
      if (initiatorId == null) return null;
      if (turn % 2 === 1) return initiatorId;
      return initiatorId === userAId ? userBId : userAId;
    }

    // Build the public state object the clients render from.
    function buildIcebreakerState(match: any, iceTurns: any[], viewerId: number, packId: string | null, otherUser: any) {
      const initiatorId = iceTurns[0]?.senderId ?? null;
      const completed = match.icebreakerCompleted || iceTurns.length >= TOTAL_TURNS;
      const currentTurn = completed ? null : iceTurns.length + 1;
      let currentTurnUserId: number | null = null;
      if (currentTurn != null) {
        currentTurnUserId =
          currentTurn === 1 ? null : playerForTurn(currentTurn, initiatorId, match.userAId, match.userBId);
      }
      // On turn 1 (not started) anyone may start, so it's the viewer's turn.
      const yourTurn = completed ? false : currentTurn === 1 ? true : currentTurnUserId === viewerId;
      return {
        status: completed ? "completed" : iceTurns.length === 0 ? "not_started" : "in_progress",
        packId,
        initiatorId,
        currentTurn,
        currentTurnUserId,
        yourTurn,
        isInitiator: initiatorId != null ? initiatorId === viewerId : null,
        turns: iceTurns.map((m) => ({
          turn: (m.meta as any).turn,
          tone: (m.meta as any).tone,
          senderId: m.senderId,
          body: m.body,
          mine: m.senderId === viewerId,
        })),
        otherUser,
      };
    }

    // GET current icebreaker state for a match.
    app.get("/api/matches/:id/icebreaker", authMiddleware, async (req: any, res) => {
      try {
        const matchId = parseInt(req.params.id);
        const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
        if (!match) { res.status(404).json({ error: "Match not found" }); return; }
        if (match.userAId !== req.userId && match.userBId !== req.userId) {
          res.status(403).json({ error: "Not authorized" }); return;
        }
        const otherId = match.userAId === req.userId ? match.userBId : match.userAId;
        const [otherUser] = await db.select({
          id: users.id, name: users.name, photos: users.photos, verified: users.verified,
        }).from(users).where(eq(users.id, otherId)).limit(1);

        const allMsgs = await db.select().from(messages).where(eq(messages.matchId, matchId));
        const iceTurns = extractIcebreakerTurns(allMsgs);

        // packId: stored on turn 1 once started, otherwise computed deterministically so
        // the client can render turn-1 options before anyone has committed.
        let packId: string | null = iceTurns[0]?.meta?.packId ?? null;
        if (!packId) {
          let venueName: string | undefined;
          if (match.venueId) {
            const [venue] = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, match.venueId)).limit(1);
            venueName = venue?.name ?? undefined;
          }
          packId = pickPackForMatch(String(matchId), venueName).id;
        }

        res.json(buildIcebreakerState(match, iceTurns, req.userId, packId, otherUser));
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Submit the caller's tone pick for whatever turn is currently theirs. The server
    // derives the turn from existing state (prevents forging/duplicate turns), resolves
    // the canonical body, then auto-plays any subsequent bot turn(s).
    app.post("/api/matches/:id/icebreaker-turn", authMiddleware, async (req: any, res) => {
      try {
        const matchId = parseInt(req.params.id);
        const { tone } = req.body || {};
        if (!VALID_TONES.includes(tone)) {
          res.status(400).json({ error: "Valid tone required" }); return;
        }

        const result = await db.transaction(async (tx) => {
          // Lock the match row so concurrent turn submissions serialize.
          const [match] = await tx.select().from(matches).where(eq(matches.id, matchId)).for("update").limit(1);
          if (!match) return { code: 404, body: { error: "Match not found" } };
          if (match.userAId !== req.userId && match.userBId !== req.userId) {
            return { code: 403, body: { error: "Not authorized" } };
          }
          if (match.icebreakerCompleted) {
            return { code: 409, body: { error: "Icebreaker already completed" } };
          }

          const allMsgs = await tx.select().from(messages).where(eq(messages.matchId, matchId));
          let iceTurns = extractIcebreakerTurns(allMsgs);
          const nextTurn = iceTurns.length + 1;
          if (nextTurn > TOTAL_TURNS) return { code: 409, body: { error: "Icebreaker already completed" } };

          const initiatorId = iceTurns[0]?.senderId ?? null;
          const expectedPlayer = nextTurn === 1 ? req.userId : playerForTurn(nextTurn, initiatorId, match.userAId, match.userBId);
          if (expectedPlayer !== req.userId) {
            return { code: 403, body: { error: "Not your turn" } };
          }

          // Determine the pack. Once started, it's locked to turn 1's pack. For a fresh
          // game the server picks the canonical pack deterministically (ignoring any
          // client-provided packId) so both players always see the same pack.
          let packId: string | undefined = iceTurns[0]?.meta?.packId;
          if (!packId) {
            let venueName: string | undefined;
            if (match.venueId) {
              const [venue] = await tx.select({ name: venues.name }).from(venues).where(eq(venues.id, match.venueId)).limit(1);
              venueName = venue?.name ?? undefined;
            }
            packId = pickPackForMatch(String(matchId), venueName).id;
          }
          const pack = getPackById(packId);
          if (!pack) return { code: 400, body: { error: "Unknown packId" } };

          // Track the committed tone path (0-indexed), then add the human's pick.
          const tones: (Tone | undefined)[] = iceTurns.map((m: any) => m.meta?.tone as Tone | undefined);
          tones[nextTurn - 1] = tone;

          // Insert the human's turn.
          const humanBody = resolveTurnBody(pack, nextTurn, tones);
          await tx.insert(messages).values({
            matchId, senderId: req.userId, body: humanBody,
            meta: { icebreaker: true, turn: nextTurn, packId, tone },
          });

          // Auto-play any following bot turns until it's a human's turn or we're done.
          let played = nextTurn;
          const finalInitiatorId = initiatorId ?? req.userId; // turn 1 just set the initiator
          while (played < TOTAL_TURNS) {
            const upcoming = played + 1;
            const upcomingPlayer = playerForTurn(upcoming, finalInitiatorId, match.userAId, match.userBId)!;
            if (!(await userIsBot(tx, upcomingPlayer))) break;
            // Bot's tone branches off the immediately-preceding turn's tone.
            const botTone = pickOtherTone(String(matchId), upcoming, (tones[upcoming - 2] || "neutral") as Tone);
            tones[upcoming - 1] = botTone;
            const botBody = resolveTurnBody(pack, upcoming, tones);
            await tx.insert(messages).values({
              matchId, senderId: upcomingPlayer, body: botBody,
              meta: { icebreaker: true, turn: upcoming, packId, tone: botTone },
            });
            played = upcoming;
          }

          // If all six turns now exist, unlock the chat.
          if (played >= TOTAL_TURNS) {
            await tx.update(matches).set({ icebreakerCompleted: true }).where(eq(matches.id, matchId));
          }

          // Re-read for an authoritative response.
          const refreshed = await tx.select().from(messages).where(eq(messages.matchId, matchId));
          const [freshMatch] = await tx.select().from(matches).where(eq(matches.id, matchId)).limit(1);
          const otherId = match.userAId === req.userId ? match.userBId : match.userAId;
          const [otherUser] = await tx.select({
            id: users.id, name: users.name, photos: users.photos, verified: users.verified,
          }).from(users).where(eq(users.id, otherId)).limit(1);
          const state = buildIcebreakerState(freshMatch, extractIcebreakerTurns(refreshed), req.userId, packId, otherUser);
          return { code: 200, body: state };
        });

        res.status(result.code).json(result.body); return;
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

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
          res.status(403).json({ error: "Access denied" }); return;
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
          res.status(403).json({ error: "Access denied" }); return;
        }

        // Validate + cap the message body so a single payload can't bloat the DB.
        const body = typeof req.body?.body === "string" ? req.body.body.trim().slice(0, 2000) : "";
        if (!body) { res.status(400).json({ error: "Message body required" }); return; }

        // Free chat is locked until the icebreaker conversation has been completed via
        // POST /api/matches/:id/icebreaker-conversation. No prefix-based bypass.
        if (!match.icebreakerCompleted) {
          res.status(403).json({ error: "Complete the icebreaker first" }); return;
        }

        const [message] = await db.insert(messages).values({
          matchId,
          senderId: req.userId,
          body,
          meta: {}
        }).returning();

        await onMessageSent(req.userId).catch(() => {});

        // Broadcast to both participants in the match room so the recipient sees
        // the message live without polling. (Socket-sent messages emit the same
        // event; clients dedupe by message id.)
        io.to(`match:${matchId}`).emit("message:received", message);

        // Push the recipient if they're not currently connected.
        const recipientId = match.userAId === req.userId ? match.userBId : match.userAId;
        void notifyOfflineMessage(recipientId, req.userId, body);

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
        if (!room) { res.status(404).json({ error: "Room not found" }); return; }

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
        
        const conditions: any[] = [eq(rooms.active, true), gte(rooms.endsAt, new Date())];
        if (venueId) conditions.push(eq(rooms.venueId, parseInt(venueId as string)));
        const activeRooms = await db.select().from(rooms).where(and(...conditions));
        
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
        
        const evtConditions: any[] = [gte(events.startsAt, new Date())];
        if (city) evtConditions.push(eq(events.city, city as string));
        const eventList = await db.select().from(events).where(and(...evtConditions)).orderBy(events.startsAt);
        
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
          res.status(404).json({ error: "Event not found" }); return;
        }
        
        // Check wallet balance
        const [wallet] = await db.select().from(cubeWallets)
          .where(eq(cubeWallets.userId, req.userId))
          .limit(1);
        
        if ((wallet?.balance ?? 0) < (event.price ?? 0)) {
          res.status(400).json({ error: "Insufficient cubes" }); return;
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
            amount: event.price ?? 0,
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
          res.status(400).json({ error: "Invalid gift payload", details: parsed.error.flatten() }); return;
        }
        const { recipientId, drinkName, matchId, venueId, note } = parsed.data;

        if (recipientId === req.userId) {
          res.status(400).json({ error: "You can't gift yourself a drink." }); return;
        }

        const drinkKey = drinkName.trim().toLowerCase();
        const drink = DRINK_CATALOG[drinkKey];
        if (!drink) {
          res.status(400).json({ error: "Unknown drink type" }); return;
        }

        // Block / report guard — don't let blocked relationships gift.
        const blockedIds = await getBlockedUserIds(req.userId);
        if (blockedIds.includes(recipientId)) {
          res.status(403).json({ error: "You can't gift this user." }); return;
        }

        // Recipient must exist.
        const [recipient] = await db.select().from(users).where(eq(users.id, recipientId)).limit(1);
        if (!recipient) { res.status(404).json({ error: "Recipient not found" }); return; }

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
          res.status(402).json({ error: "Insufficient cubes", needed: drink.cubes, balance: w?.balance ?? 0 }); return;
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
        if (Number.isNaN(giftId)) { res.status(400).json({ error: "Invalid id" }); return; }

        const [gift] = await db.update(drinkGifts)
          .set({ accepted: true })
          .where(and(
            eq(drinkGifts.id, giftId),
            eq(drinkGifts.recipientId, req.userId)
          ))
          .returning();

        if (!gift) { res.status(404).json({ error: "Gift not found" }); return; }
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
          res.status(400).json({ error: "Missing QR code" }); return;
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
          if (!existing) { res.status(404).json({ error: "Voucher not found" }); return; }
          if (existing.recipientId !== req.userId) { res.status(403).json({ error: "Not your voucher" }); return; }
          if (existing.redeemedAt) { res.status(409).json({ error: "Already redeemed", redeemedAt: existing.redeemedAt }); return; }
          res.status(410).json({ error: "Voucher expired" }); return;
        }
        await onGiftRedeemed(req.userId).catch(() => {});
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
          res.status(400).json({ error: "Invalid date payload", details: parsed.error.flatten() }); return;
        }
        const { matchId, venueId, bookingDate, location } = parsed.data;

        const when = new Date(bookingDate);
        if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
          res.status(400).json({ error: "Date must be in the future" }); return;
        }

        const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
        if (!match) { res.status(404).json({ error: "Match not found" }); return; }
        if (match.userAId !== req.userId && match.userBId !== req.userId) {
          res.status(403).json({ error: "Not your match" }); return;
        }

        const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
        if (!venue) { res.status(404).json({ error: "Venue not found" }); return; }

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
        if (Number.isNaN(matchId)) { res.status(400).json({ error: "Invalid match id" }); return; }

        const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
        if (!match) { res.status(404).json({ error: "Match not found" }); return; }
        if (match.userAId !== req.userId && match.userBId !== req.userId) {
          res.status(403).json({ error: "Not your match" }); return;
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
        if (Number.isNaN(bookingId)) { res.status(400).json({ error: "Invalid id" }); return; }

        const [booking] = await db.select().from(dateBookings).where(eq(dateBookings.id, bookingId)).limit(1);
        if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
        if (booking.proposedBy === req.userId) {
          res.status(403).json({ error: "Only the other side can accept" }); return;
        }
        const [match] = await db.select().from(matches).where(eq(matches.id, booking.matchId)).limit(1);
        if (!match || (match.userAId !== req.userId && match.userBId !== req.userId)) {
          res.status(403).json({ error: "Not your match" }); return;
        }
        if (booking.confirmed) {
          res.json({ success: true, booking, cubesEarned: 0, already: true }); return;
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
        if (Number.isNaN(bookingId)) { res.status(400).json({ error: "Invalid id" }); return; }

        const [booking] = await db.select().from(dateBookings).where(eq(dateBookings.id, bookingId)).limit(1);
        if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
        const [match] = await db.select().from(matches).where(eq(matches.id, booking.matchId)).limit(1);
        if (!match || (match.userAId !== req.userId && match.userBId !== req.userId)) {
          res.status(403).json({ error: "Not your match" }); return;
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
      description: z.string().max(2000).optional(),
    });
    app.post("/api/reports", reportLimiter, authMiddleware, async (req: any, res) => {
      try {
        const parsed = reportBodySchema.safeParse(req.body || {});
        if (!parsed.success) { res.status(400).json({ error: "Invalid report payload" }); return; }
        const { reportedUserId, contentType, contentId, reason, description } = parsed.data;
        // The reports table has no dedicated columns for the content target, so we
        // persist the full context in `evidence` (jsonb) — nothing is dropped.
        const [row] = await db.insert(reports).values({
          reporterId: req.userId,
          targetUserId: reportedUserId ?? req.userId,
          reason,
          evidence: [{ contentType, contentId: contentId ?? null, description: description ?? null, at: new Date().toISOString() }],
          status: "pending",
        }).returning();
        res.json({ ok: true, report: row });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    // Lightweight moderation queue. Restricted to admin user IDs configured via
    // ADMIN_USER_IDS (comma-separated). Returns pending reports with reporter +
    // target context so a human can act on them. No admin configured = 403.
    const ADMIN_IDS = new Set(
      (process.env.ADMIN_USER_IDS || "").split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)),
    );
    app.get("/api/admin/reports", authMiddleware, async (req: any, res) => {
      try {
        if (!ADMIN_IDS.has(req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
        const status = typeof req.query.status === "string" ? req.query.status : "pending";
        const rows = await db.select().from(reports)
          .where(eq(reports.status, status as any))
          .orderBy(desc(reports.createdAt))
          .limit(200);
        res.json({ reports: rows });
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
        if (!parsed.success) { res.status(400).json({ error: "Invalid block payload" }); return; }
        const { blockedId } = parsed.data;
        if (blockedId === req.userId) { res.status(400).json({ error: "Cannot block yourself" }); return; }
        const [existing] = await db.select().from(blocks)
          .where(and(eq(blocks.blockerId, req.userId), eq(blocks.blockedId, blockedId))).limit(1);
        if (existing) { res.json({ ok: true, block: existing, alreadyBlocked: true }); return; }
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
        if (!files.length) { res.status(400).json({ error: "No files uploaded" }); return; }
        const store = getPhotoStorage();
        const urls = await Promise.all(files.map(f =>
          store.save({ buffer: f.buffer, originalname: f.originalname, mimetype: f.mimetype })
        ));
        const [me] = await db.select({ photos: users.photos }).from(users).where(eq(users.id, req.userId)).limit(1);
        const existing: string[] = Array.isArray(me?.photos) ? (me!.photos as string[]) : [];
        const merged = [...existing, ...urls].slice(0, 6);
        await db.update(users).set({ photos: merged, updatedAt: new Date() }).where(eq(users.id, req.userId));
        await onPhotoUploaded(req.userId, urls.length).catch(() => {});
        res.json({ ok: true, photos: merged, added: urls });
      } catch (e: any) {
        console.error("[upload] failed:", e?.message || e);
        res.status(500).json({ error: e.message || "Upload failed" });
      }
    });

    app.delete("/api/me/photos", authMiddleware, async (req: any, res) => {
      try {
        const url = String(req.body?.url || "");
        if (!url) { res.status(400).json({ error: "url required" }); return; }
        const [me] = await db.select({ photos: users.photos }).from(users).where(eq(users.id, req.userId)).limit(1);
        const existing: string[] = Array.isArray(me?.photos) ? (me!.photos as string[]) : [];
        const next = existing.filter(p => p !== url);
        await db.update(users).set({ photos: next, updatedAt: new Date() }).where(eq(users.id, req.userId));
        // Best-effort: remove the underlying object from whichever provider holds it.
        await getPhotoStorage().delete(url).catch(() => {});
        res.json({ ok: true, photos: next });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    return httpServer;
  }
  