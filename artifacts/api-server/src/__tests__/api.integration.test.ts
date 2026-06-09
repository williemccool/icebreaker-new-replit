// Integration tests for the critical API paths: auth guards, swipe/match,
// admin venue/room management, and PII scrubbing.
//
// They boot the REAL express app + routes against a REAL Postgres
// (DATABASE_URL, defaulting to the local demo DB on 5433). If no database is
// reachable, every test is skipped — so `pnpm test` still passes on machines
// without Postgres. CI provides a service container so they always run there.
//
// Demo behaviors (SEED_DEMO_DATA / ENABLE_DEMO_AUTH) are forced OFF so these
// tests exercise production semantics: no seed bots, no auto-matching.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// ---- Environment MUST be set before the app/db modules are imported ----
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5433/icebreaker";
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-test-secret";
process.env.SEED_DEMO_DATA = "false";
process.env.ENABLE_DEMO_AUTH = "false";

const JWT_SECRET = process.env.JWT_SECRET!;
// Unique-per-run tag. Phones are varchar(15) UNIQUE, so this must stay short
// enough that `${RUN}_${suffix}` fits in 15 chars WITHOUT truncation (truncation
// would collapse all test users onto one phone and violate the unique index).
const RUN = `t${Date.now().toString(36).slice(-7)}${Math.floor(Math.random() * 36).toString(36)}`; // 9 chars

// DB availability must be known at test-REGISTRATION time (the `skip` option is
// read when `test()` is called, before any `before()` hook runs), so the probe
// happens here with top-level await.
let dbAvailable = false;
let pool: any = null;
let db: any = null;
let schema: any = null;
try {
  const mod = await import("@workspace/db");
  pool = mod.pool;
  db = mod.db;
  schema = mod;
  await pool.query("select 1");
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

let base = "";
let server: any = null;

let userA = 0, userB = 0, adminId = 0, botId = 0;
let tokenA = "", tokenB = "", tokenAdmin = "";

function sign(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, body: json ?? text, headers: res.headers };
}

before(async () => {
  if (!dbAvailable) return;

  // Create deterministic test users (unique phones per run).
  const { users } = schema;
  const mk = async (suffix: string, extra: Record<string, unknown> = {}) => {
    const phone = `${RUN}_${suffix}`;
    if (phone.length > 15) throw new Error(`test phone too long for varchar(15): ${phone}`);
    const [row] = await db.insert(users).values({
      phone,
      name: `T_${suffix}`,
      dob: new Date("1995-01-01"),
      gender: "female",
      city: "Testville",
      isBot: false,
      ...extra,
    }).returning({ id: users.id });
    return row.id as number;
  };
  userA = await mk("a");
  userB = await mk("b");
  adminId = await mk("adm");
  botId = await mk("bot", { isBot: true });

  tokenA = sign(userA);
  tokenB = sign(userB);
  tokenAdmin = sign(adminId);

  // The routes module reads ADMIN_USER_IDS at import time — set it BEFORE the
  // dynamic import below. This is why the import is not at the top of the file.
  process.env.ADMIN_USER_IDS = String(adminId);

  const { registerRoutes } = await import("../routes/routes");
  const { default: app } = await import("../app");
  server = registerRoutes(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  try {
    if (dbAvailable && pool) {
      // Remove everything this run created. Swipes/matches cascade from users.
      await pool.query(`DELETE FROM matches WHERE user_a_id IN (SELECT id FROM users WHERE phone LIKE $1) OR user_b_id IN (SELECT id FROM users WHERE phone LIKE $1)`, [`${RUN}%`]);
      await pool.query(`DELETE FROM users WHERE phone LIKE $1`, [`${RUN}%`]);
    }
  } catch { /* best-effort cleanup */ }
  try { server?.closeAllConnections?.(); server?.close(); } catch { /* ignore */ }
  try { await pool?.end(); } catch { /* ignore */ }
});

const opts = () => ({ skip: !dbAvailable && "database not reachable — skipping integration tests" as any });

// ---------- health & security headers ----------

test("healthz responds ok with helmet security headers", opts(), async () => {
  const r = await api("GET", "/api/healthz");
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "ok");
  // helmet defaults
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.ok(r.headers.get("content-security-policy"), "expected CSP header");
  assert.equal(r.headers.get("x-powered-by"), null, "x-powered-by must be hidden");
});

// ---------- auth guards ----------

test("protected route rejects missing and invalid tokens", opts(), async () => {
  assert.equal((await api("GET", "/api/user/me")).status, 401);
  assert.equal((await api("GET", "/api/user/me", undefined, "garbage.token.here")).status, 401);
});

test("send-otp validates phone format", opts(), async () => {
  const r = await api("POST", "/api/auth/send-otp", { phone: "not-a-phone" });
  assert.equal(r.status, 400);
});

test("verify-otp rejects wrong/unknown OTP (and demo bypass is OFF)", opts(), async () => {
  const r = await api("POST", "/api/auth/verify-otp", { phone: "8095411567", otp: "123456" });
  assert.equal(r.status, 400, "demo OTP must NOT work when ENABLE_DEMO_AUTH=false");
});

// ---------- swipe & match ----------

test("cannot swipe yourself", opts(), async () => {
  const r = await api("POST", "/api/swipe", { swipedId: userA, liked: true }, tokenA);
  assert.equal(r.status, 400);
});

test("mutual like creates exactly one match; re-swipe is idempotent", opts(), async () => {
  const first = await api("POST", "/api/swipe", { swipedId: userB, liked: true }, tokenA);
  assert.equal(first.status, 200);
  assert.equal(first.body.matched, false, "one-sided like must not match");

  const reciprocal = await api("POST", "/api/swipe", { swipedId: userA, liked: true }, tokenB);
  assert.equal(reciprocal.status, 200);
  assert.equal(reciprocal.body.matched, true, "mutual like must match");
  const matchId = reciprocal.body.match?.id;
  assert.ok(matchId, "match id expected");

  // Re-swiping must not 500 (unique-index upsert) and must not duplicate the match.
  const again = await api("POST", "/api/swipe", { swipedId: userB, liked: true }, tokenA);
  assert.equal(again.status, 200);
  assert.equal(again.body.matched, true);
  assert.equal(again.body.match?.id, matchId, "must return the same match, not a duplicate");
});

test("bots do NOT auto-like-back when demo data is disabled (prod semantics)", opts(), async () => {
  const r = await api("POST", "/api/swipe", { swipedId: botId, liked: true }, tokenA);
  assert.equal(r.status, 200);
  assert.equal(r.body.matched, false, "bot must not reciprocate outside demo mode");
});

test("match access is membership-checked (no IDOR)", opts(), async () => {
  const matches = await api("GET", "/api/matches", undefined, tokenA);
  assert.equal(matches.status, 200);
  const mine = (Array.isArray(matches.body) ? matches.body : matches.body.matches || [])
    .find((m: any) => true);
  if (mine?.id) {
    const stranger = await api("GET", `/api/matches/${mine.id}`, undefined, tokenAdmin);
    assert.equal(stranger.status, 403, "non-member must not read someone else's match");
  }
});

// ---------- admin venue/room API ----------

test("admin endpoints: 401 unauthenticated, 403 non-admin", opts(), async () => {
  assert.equal((await api("GET", "/api/admin/venues")).status, 401);
  assert.equal((await api("GET", "/api/admin/venues", undefined, tokenA)).status, 403);
});

test("admin venue+room lifecycle with validation and FK guard", opts(), async () => {
  // create venue
  const cv = await api("POST", "/api/admin/venues", {
    name: `IT Venue ${RUN}`, type: "bar", address: "1 Test St", area: "Testside", city: "Testville",
  }, tokenAdmin);
  assert.equal(cv.status, 201);
  const venueId = cv.body.venue.id;

  // invalid payload rejected
  assert.equal((await api("POST", "/api/admin/venues", { name: "" }, tokenAdmin)).status, 400);

  // deactivate → hidden from public list, visible to admin
  const up = await api("PATCH", `/api/admin/venues/${venueId}`, { active: false }, tokenAdmin);
  assert.equal(up.status, 200);
  assert.equal(up.body.venue.active, false);
  const pub = await api("GET", "/api/venues", undefined, tokenA);
  assert.equal(pub.status, 200);
  assert.ok(!pub.body.some((v: any) => v.id === venueId), "inactive venue must be hidden publicly");
  const adminList = await api("GET", "/api/admin/venues", undefined, tokenAdmin);
  assert.ok(adminList.body.venues.some((v: any) => v.id === venueId), "admin must still see it");

  // room: bad time window rejected; unknown venue rejected
  const now = Date.now();
  const startsAt = new Date(now + 3600e3).toISOString();
  const endsAt = new Date(now + 7200e3).toISOString();
  assert.equal((await api("POST", "/api/admin/rooms", { venueId, name: "bad", startsAt: endsAt, endsAt: startsAt }, tokenAdmin)).status, 400);
  assert.equal((await api("POST", "/api/admin/rooms", { venueId: 99999999, name: "x", startsAt, endsAt }, tokenAdmin)).status, 400);

  // valid room
  const cr = await api("POST", "/api/admin/rooms", { venueId, name: `IT Room ${RUN}`, capacity: 20, startsAt, endsAt }, tokenAdmin);
  assert.equal(cr.status, 201);
  const roomId = cr.body.room.id;

  // venue delete blocked while room exists
  assert.equal((await api("DELETE", `/api/admin/venues/${venueId}`, undefined, tokenAdmin)).status, 409);

  // room then venue delete succeed
  assert.equal((await api("DELETE", `/api/admin/rooms/${roomId}`, undefined, tokenAdmin)).status, 200);
  assert.equal((await api("DELETE", `/api/admin/venues/${venueId}`, undefined, tokenAdmin)).status, 200);
});

// ---------- PII scrubbing ----------

const SENSITIVE = ["phone", "email", "dob", "passwordHash", "selfieHash", "clerkUserId", "password_hash", "selfie_hash", "clerk_user_id"];

test("leaderboard requires auth and never exposes sensitive fields", opts(), async () => {
  assert.equal((await api("GET", "/api/leaderboard")).status, 401);
  const r = await api("GET", "/api/leaderboard", undefined, tokenA);
  assert.equal(r.status, 200);
  for (const row of r.body) {
    const leaked = Object.keys(row.user || {}).filter((k) => SENSITIVE.includes(k));
    assert.deepEqual(leaked, [], `leaderboard leaked: ${leaked.join(",")}`);
  }
});

test("public user profile is scrubbed", opts(), async () => {
  const r = await api("GET", `/api/users/${userB}`, undefined, tokenA);
  assert.equal(r.status, 200);
  const leaked = Object.keys(r.body.user || {}).filter((k) => SENSITIVE.includes(k));
  assert.deepEqual(leaked, [], `profile leaked: ${leaked.join(",")}`);
});

// ---------- error hygiene ----------

test("oversized JSON body is rejected, not crashed on", opts(), async () => {
  const big = "x".repeat(2 * 1024 * 1024); // 2 MB > 1 MB cap
  const r = await api("POST", "/api/auth/send-otp", { phone: "1234567890", junk: big });
  assert.equal(r.status, 413);
});
