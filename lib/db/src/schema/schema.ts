import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, decimal, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
  import { createInsertSchema, createSelectSchema } from "drizzle-zod";
  import { relations } from "drizzle-orm";

  // Enums
  export const genderEnum = pgEnum('gender', ['male', 'female', 'non_binary', 'other']);
  export const matchStatusEnum = pgEnum('match_status', ['matched', 'blocked']);
  export const reportStatusEnum = pgEnum('report_status', ['pending', 'reviewed', 'resolved', 'dismissed']);
  export const eventStatusEnum = pgEnum('event_status', ['upcoming', 'ongoing', 'completed', 'cancelled']);
  export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'cancelled', 'expired']);
  export const cubeTransactionKindEnum = pgEnum('cube_transaction_kind', ['earn', 'spend']);
  export const comfortModeEnum = pgEnum('comfort_mode', ['everyone', 'verified_only', 'friends_of_friends']);
  export const visibilityModeEnum = pgEnum('visibility_mode', ['venues_only', 'citywide']);
  export const messageFirstEnum = pgEnum('message_first', ['everyone', 'people_i_like', 'matches_only']);

  // Users table
  export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 15 }).unique(),
    email: varchar("email", { length: 255 }).unique(),
    clerkUserId: varchar("clerk_user_id", { length: 100 }).unique(),
    name: varchar("name", { length: 100 }).notNull(),
    dob: timestamp("dob").notNull(),
    gender: genderEnum("gender").notNull(),
    pronouns: varchar("pronouns", { length: 50 }),
    city: varchar("city", { length: 100 }).notNull(),
    langs: jsonb("langs").default([]),
    bio: text("bio"),
    interests: jsonb("interests").default([]),
    photos: jsonb("photos").default([]),
    verified: boolean("verified").default(false),
    isBot: boolean("is_bot").default(true),
    selfieHash: text("selfie_hash"),
    passwordHash: text("password_hash"),
    swipesUsedToday: integer("swipes_used_today").default(0),
    lastSwipeReset: timestamp("last_swipe_reset"),
    level: integer("level").default(1),
    xp: integer("xp").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  }, (t) => [
    index("users_city_idx").on(t.city),
    index("users_is_bot_idx").on(t.isBot),
  ]);

  // Preferences table
  export const preferences = pgTable("preferences", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).unique().notNull(),
    ageMin: integer("age_min").default(18),
    ageMax: integer("age_max").default(35),
    distanceKm: integer("distance_km").default(50),
    interests: jsonb("interests").default([]),
    intent: varchar("intent", { length: 50 }),
    showInVirtualRooms: boolean("show_in_virtual_rooms").default(true),
    comfortMode: comfortModeEnum("comfort_mode").default('everyone'),
    visibilityMode: visibilityModeEnum("visibility_mode").default('citywide'),
    messageFirst: messageFirstEnum("message_first").default('everyone'),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  });

  // Matches table
  export const matches = pgTable("matches", {
    id: serial("id").primaryKey(),
    userAId: integer("user_a_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    userBId: integer("user_b_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    venueId: integer("venue_id").references(() => venues.id),
    status: matchStatusEnum("status").default('matched'),
    icebreakerCompleted: boolean("icebreaker_completed").default(false),
    createdAt: timestamp("created_at").defaultNow()
  }, (t) => [
    index("matches_user_a_idx").on(t.userAId),
    index("matches_user_b_idx").on(t.userBId),
  ]);

  // Messages table
  export const messages = pgTable("messages", {
    id: serial("id").primaryKey(),
    matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }).notNull(),
    senderId: integer("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    body: text("body").notNull(),
    meta: jsonb("meta").default({}),
    createdAt: timestamp("created_at").defaultNow()
  }, (t) => [
    index("messages_match_idx").on(t.matchId),
    index("messages_match_created_idx").on(t.matchId, t.createdAt),
    index("messages_sender_idx").on(t.senderId),
  ]);

  // Swipes table
  export const swipes = pgTable("swipes", {
    id: serial("id").primaryKey(),
    swiperId: integer("swiper_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    swipedId: integer("swiped_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    liked: boolean("liked").notNull(),
    createdAt: timestamp("created_at").defaultNow()
  }, (t) => [
    index("swipes_swiper_idx").on(t.swiperId),
    index("swipes_swiped_idx").on(t.swipedId),
    uniqueIndex("swipes_swiper_swiped_uq").on(t.swiperId, t.swipedId),
  ]);

  // Venues table
  export const venues = pgTable("venues", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    address: text("address").notNull(),
    area: varchar("area", { length: 100 }).notNull(),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    partner: boolean("partner").default(false),
    perks: jsonb("perks").default([]),
    qrScheme: varchar("qr_scheme", { length: 100 }),
    city: varchar("city", { length: 100 }).notNull(),
    imageUrl: text("image_url"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow()
  });

  // Check-ins table
  export const checkIns = pgTable("check_ins", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    venueId: integer("venue_id").references(() => venues.id).notNull(),
    checkedInAt: timestamp("checked_in_at").defaultNow(),
    checkedOutAt: timestamp("checked_out_at"),
    cubesEarned: integer("cubes_earned").default(10),
    xpEarned: integer("xp_earned").default(5)
  }, (t) => [
    index("check_ins_user_idx").on(t.userId),
    index("check_ins_venue_active_idx").on(t.venueId, t.checkedOutAt),
  ]);

  // Rooms table
  export const rooms = pgTable("rooms", {
    id: serial("id").primaryKey(),
    venueId: integer("venue_id").references(() => venues.id),
    name: varchar("name", { length: 200 }).notNull(),
    capacity: integer("capacity").default(12),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    virtual: boolean("virtual").default(true),
    premium: boolean("premium").default(false),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow()
  });

  // Room presence table
  export const roomPresence = pgTable("room_presence", {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").references(() => rooms.id).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    joinedAt: timestamp("joined_at").defaultNow(),
    leftAt: timestamp("left_at")
  }, (t) => [
    index("room_presence_room_active_idx").on(t.roomId, t.leftAt),
    index("room_presence_user_idx").on(t.userId),
  ]);

  // Events table
  export const events = pgTable("events", {
    id: serial("id").primaryKey(),
    city: varchar("city", { length: 100 }).notNull(),
    venueId: integer("venue_id").references(() => venues.id),
    title: varchar("title", { length: 200 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    price: integer("price").default(0),
    capacity: integer("capacity").notNull(),
    hostId: integer("host_id").references(() => users.id, { onDelete: "set null" }),
    status: eventStatusEnum("status").default('upcoming'),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow()
  });

  // Tickets table
  export const tickets = pgTable("tickets", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").references(() => events.id).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    qrCode: varchar("qr_code", { length: 100 }).unique().notNull(),
    checkedInAt: timestamp("checked_in_at"),
    pricePaid: integer("price_paid").notNull(),
    currency: varchar("currency", { length: 3 }).default('INR'),
    createdAt: timestamp("created_at").defaultNow()
  });

  // Cube wallet table
  export const cubeWallets = pgTable("cube_wallets", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).unique().notNull(),
    balance: integer("balance").default(0),
    totalEarned: integer("total_earned").default(0),
    totalSpent: integer("total_spent").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  });

  // Cube transactions table
  export const cubeTransactions = pgTable("cube_transactions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    kind: cubeTransactionKindEnum("kind").notNull(),
    amount: integer("amount").notNull(),
    meta: jsonb("meta").default({}),
    createdAt: timestamp("created_at").defaultNow()
  }, (t) => [
    index("cube_transactions_user_idx").on(t.userId),
  ]);

  // Seasons table
  export const seasons = pgTable("seasons", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow()
  });

  // Quests table
  export const quests = pgTable("quests", {
    id: serial("id").primaryKey(),
    seasonId: integer("season_id").references(() => seasons.id),
    code: varchar("code", { length: 50 }).unique().notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    goalType: varchar("goal_type", { length: 50 }).notNull(),
    goalValue: integer("goal_value").notNull(),
    rewardCubes: integer("reward_cubes").notNull(),
    rewardXp: integer("reward_xp").default(0),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow()
  });

  // Quest progress table
  export const questProgress = pgTable("quest_progress", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    questId: integer("quest_id").references(() => quests.id).notNull(),
    progress: integer("progress").default(0),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow()
  }, (t) => [
    uniqueIndex("quest_progress_user_quest_uq").on(t.userId, t.questId),
  ]);

  // Leaderboards table
  export const leaderboards = pgTable("leaderboards", {
    id: serial("id").primaryKey(),
    seasonId: integer("season_id").references(() => seasons.id).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    score: integer("score").default(0),
    city: varchar("city", { length: 100 }),
    updatedAt: timestamp("updated_at").defaultNow()
  }, (t) => [
    index("leaderboards_season_score_idx").on(t.seasonId, t.score),
  ]);

  // Subscriptions table
  export const subscriptions = pgTable("subscriptions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    plan: varchar("plan", { length: 50 }).notNull(),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    status: subscriptionStatusEnum("status").default('active'),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 200 }),
    createdAt: timestamp("created_at").defaultNow()
  });

  // Boosts table
  export const boosts = pgTable("boosts", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    createdAt: timestamp("created_at").defaultNow()
  });

  // Reports table
  export const reports = pgTable("reports", {
    id: serial("id").primaryKey(),
    reporterId: integer("reporter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    targetUserId: integer("target_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    reason: varchar("reason", { length: 100 }).notNull(),
    evidence: jsonb("evidence").default([]),
    status: reportStatusEnum("status").default('pending'),
    reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow()
  }, (t) => [
    index("reports_status_idx").on(t.status),
    index("reports_target_idx").on(t.targetUserId),
  ]);

  // Blocks table — one-way user blocks
  export const blocks = pgTable("blocks", {
    id: serial("id").primaryKey(),
    blockerId: integer("blocker_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    blockedId: integer("blocked_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  }, (t) => [
    index("blocks_blocker_idx").on(t.blockerId),
    index("blocks_blocked_idx").on(t.blockedId),
    uniqueIndex("blocks_blocker_blocked_uq").on(t.blockerId, t.blockedId),
  ]);

  // Payment orders table — Razorpay order tracking
  export const paymentOrders = pgTable("payment_orders", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    sku: varchar("sku", { length: 100 }).notNull(),
    amountInr: integer("amount_inr").notNull(),
    razorpayOrderId: varchar("razorpay_order_id", { length: 100 }).unique(),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
    status: varchar("status", { length: 30 }).default('created').notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  }, (t) => [
    index("payment_orders_user_idx").on(t.userId),
  ]);

  // Date bookings table
  export const dateBookings = pgTable("date_bookings", {
    id: serial("id").primaryKey(),
    matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }).notNull(),
    venueId: integer("venue_id").references(() => venues.id).notNull(),
    proposedBy: integer("proposed_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
    bookingDate: timestamp("booking_date").notNull(),
    location: varchar("location", { length: 200 }),
    qrCode: varchar("qr_code", { length: 100 }).unique().notNull(),
    confirmed: boolean("confirmed").default(false),
    redeemedAt: timestamp("redeemed_at"),
    createdAt: timestamp("created_at").defaultNow()
  }, (t) => [
    index("date_bookings_match_idx").on(t.matchId),
  ]);

  // Drink gifts table
  export const drinkGifts = pgTable("drink_gifts", {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    recipientId: integer("recipient_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    matchId: integer("match_id").references(() => matches.id, { onDelete: "set null" }),
    drinkName: varchar("drink_name", { length: 100 }).notNull(),
    note: text("note"),
    venueId: integer("venue_id").references(() => venues.id),
    accepted: boolean("accepted").default(false),
    redeemedAt: timestamp("redeemed_at"),
    expiresAt: timestamp("expires_at"),
    qrCode: varchar("qr_code", { length: 100 }).unique(),
    cubesCost: integer("cubes_cost").notNull(),
    createdAt: timestamp("created_at").defaultNow()
  }, (t) => [
    index("drink_gifts_recipient_idx").on(t.recipientId),
    index("drink_gifts_sender_idx").on(t.senderId),
  ]);

  // Crews table
  export const crews = pgTable("crews", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    captainId: integer("captain_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    bio: text("bio"),
    photo: text("photo"),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow()
  });

  // Crew members table
  export const crewMembers = pgTable("crew_members", {
    id: serial("id").primaryKey(),
    crewId: integer("crew_id").references(() => crews.id).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    joinedAt: timestamp("joined_at").defaultNow()
  });

  // OTP verification table
  export const otpVerifications = pgTable("otp_verifications", {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 15 }).notNull(),
    otp: varchar("otp", { length: 6 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    verified: boolean("verified").default(false),
    createdAt: timestamp("created_at").defaultNow()
  }, (t) => [
    index("otp_verifications_phone_idx").on(t.phone),
  ]);

  // Badges table
  export const badges = pgTable("badges", {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 50 }).unique().notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    createdAt: timestamp("created_at").defaultNow()
  });

  // User badges table
  export const userBadges = pgTable("user_badges", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    badgeId: integer("badge_id").references(() => badges.id).notNull(),
    earnedAt: timestamp("earned_at").defaultNow()
  }, (t) => [
    uniqueIndex("user_badges_user_badge_uq").on(t.userId, t.badgeId),
  ]);

  // Device push tokens — one row per registered device (Expo push token).
  export const deviceTokens = pgTable("device_tokens", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    token: text("token").notNull(),
    platform: varchar("platform", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  }, (t) => [
    uniqueIndex("device_tokens_token_uq").on(t.token),
    index("device_tokens_user_idx").on(t.userId),
  ]);

  // Zod schemas
  export const insertUserSchema = createInsertSchema(users);
  export const selectUserSchema = createSelectSchema(users);
  export const insertPreferenceSchema = createInsertSchema(preferences);
  export const insertMatchSchema = createInsertSchema(matches);
  export const insertMessageSchema = createInsertSchema(messages);
  export const insertSwipeSchema = createInsertSchema(swipes);
  export const insertVenueSchema = createInsertSchema(venues);
  export const insertCheckInSchema = createInsertSchema(checkIns);
  export const insertRoomSchema = createInsertSchema(rooms);
  export const insertEventSchema = createInsertSchema(events);
  export const insertTicketSchema = createInsertSchema(tickets);
  export const insertSeasonSchema = createInsertSchema(seasons);
  export const insertQuestSchema = createInsertSchema(quests);
  export const insertReportSchema = createInsertSchema(reports);
  export const insertDateBookingSchema = createInsertSchema(dateBookings);
  export const insertDrinkGiftSchema = createInsertSchema(drinkGifts);
  export const insertCrewSchema = createInsertSchema(crews);
  export const insertOtpSchema = createInsertSchema(otpVerifications);
  export const insertBadgeSchema = createInsertSchema(badges);
  export const insertBlockSchema = createInsertSchema(blocks);
  export const insertPaymentOrderSchema = createInsertSchema(paymentOrders);
  export const insertDeviceTokenSchema = createInsertSchema(deviceTokens);
  