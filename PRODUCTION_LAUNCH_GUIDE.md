# 🚀 Icebreaker — Production Launch Guide

> The complete, ordered checklist for taking Icebreaker from this repo to a
> 100-venue public launch. Last updated after the production-hardening pass
> (June 2026). Code items are **done**; everything below is the operational
> path that only the owner can complete.

---

## ✅ What is already done (code-complete, CI green)

| Area | Status |
|---|---|
| Demo/prod gating | All fake content (seed bots, auto-matching, demo rooms, bot icebreaker auto-play) behind `SEED_DEMO_DATA`; defaults **off** in production. `isBot` defaults to `false`. |
| Admin venue/room API | `GET/POST/PATCH/DELETE /api/admin/venues` and `/api/admin/rooms`, gated by `ADMIN_USER_IDS`. Soft-disable via `venues.active`; FK-guarded deletes (409 → deactivate instead); room time-window validation. |
| Payments | Razorpay signature verification, order ownership, idempotent grants, server-authoritative pricing. Purchase endpoint **fails closed** in prod — no free entitlements if config is missing. |
| PII protection | Leaderboard auth-required + scrubbed; public profiles scrubbed; no phone/email/dob/hashes ever leave the API. |
| Error hygiene | All ~62 raw `error.message` leaks replaced with a safe `serverError()` helper (logs internally, returns generic message). |
| Security headers | `helmet` with hardened defaults (CSP, HSTS, nosniff); CORP relaxed only for `/uploads` images. |
| Body limits | JSON capped at 1 MB; selfie-verification route gets a dedicated 8 MB parser; photo uploads multer-capped at 8 MB. |
| Push notifications | Device-token registry + Expo push; registers on login, unregisters on logout; deep-links to chat; offline recipients pushed on new messages. |
| Account deletion | `DELETE /api/user/me` full cascade + in-app flow with confirmation. |
| Tests & CI | 24 tests (11 unit + 13 integration) run in CI against a real Postgres service container. Integration tests cover auth guards, swipe/match idempotency, prod no-bot semantics, IDOR, admin CRUD, PII scrubbing, body limits. |
| Mobile polish | Mode tabs hidden for v1, city header removed, login logo placement, edit-profile save fixed (validation + error surfacing). |

---

## Phase 1 — Backend deployment

1. **Pick a host** (Railway / Render / Fly.io / a VPS) with managed **Postgres**.
2. **Run under a supervisor** — Docker `restart: always`, pm2, or systemd. The
   server intentionally exits on uncaught exceptions and must auto-restart.
3. **Apply the schema** against the production database:
   ```bash
   DATABASE_URL=<prod-url> pnpm db:push
   ```
   This creates/updates: `venues.active`, `device_tokens`, `users.is_bot`
   default `false`, FK cascade rules.
4. **HTTPS** termination (host-provided or reverse proxy). The HSTS header is
   already sent by the API.
5. **Start command**: build with `node build.mjs` (or `pnpm build`) in
   `artifacts/api-server`, run `node dist/index.mjs`.

## Phase 2 — Environment variables

### Required

| Variable | Value / purpose |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Production Postgres connection string |
| `JWT_SECRET` | Long random secret. **The server refuses to boot in prod without it.** |
| `ADMIN_USER_IDS` | Comma-separated user IDs allowed to manage venues/rooms and view reports |
| `TWILIO_ACCOUNT_SID` | Twilio credentials — real OTP SMS. Without these, phone login cannot work in production. |
| `TWILIO_AUTH_TOKEN` | ↑ |
| `TWILIO_PHONE_NUMBER` | Sender number (India: requires DLT registration — **start early, approval takes days**) |
| `RAZORPAY_KEY_ID` | Live-mode key for purchases |
| `RAZORPAY_KEY_SECRET` | ↑ |

### Storage (photos) — required

The default local-disk provider writes to the server's filesystem and **loses
all user photos on redeploy**. Configure object storage:

| Variable | Value |
|---|---|
| `STORAGE_PROVIDER` | `s3` |
| `S3_BUCKET` | Bucket name |
| `S3_REGION` | e.g. `ap-south-1` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credentials |
| `S3_ENDPOINT` | Only for non-AWS (Cloudflare R2, DigitalOcean Spaces) |
| `S3_PUBLIC_BASE_URL` | Public/CDN base URL for serving images |
| `S3_FORCE_PATH_STYLE` | `true` for R2/MinIO-style endpoints |
| `S3_KEY_PREFIX` | Optional key prefix, e.g. `uploads/` |

### Recommended

| Variable | Purpose |
|---|---|
| `SENTRY_DSN` | Error reporting (hook already wired — errors are captured via `captureError`) |
| `PUBLIC_BASE_URL` | The API's public URL (used for absolute links) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist — only needed if you ship the web build |
| `LOG_LEVEL` | `info` |
| `JWT_EXPIRES_IN` | Token lifetime (sensible default exists) |
| `CLERK_SECRET_KEY` | Only if enabling Google sign-in via Clerk |

### Must stay UNSET in production

| Variable | Why |
|---|---|
| `SEED_DEMO_DATA` | Leaving it unset keeps **all** fake users/bots/demo rooms out of production |
| `ENABLE_DEMO_AUTH` | Leaving it unset disables the demo phone/OTP bypass |

## Phase 3 — Mobile app configuration

1. **Bundle ID** — replace `com.icebreaker.mobile` in `app.json`
   (iOS `bundleIdentifier`, Android `package`) with your real reverse-domain
   ID. Must match your Apple Developer and Google Play accounts.
2. **EAS project** — run `eas init` to set `extra.eas.projectId`.
   ⚠️ **Without this, push notifications are silently disabled**
   (`getExpoPushTokenAsync` returns nothing). Then test push end-to-end on a
   physical device.
3. **API URL** — set `EXPO_PUBLIC_API_BASE_URL` in the `production` profile of
   `eas.json` to your deployed API URL.
4. **Legal URLs** — set `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`,
   `EXPO_PUBLIC_COMMUNITY_URL` (defaults are example.com placeholders).
5. **Assets** — produce a real 1024×1024 icon, a dedicated splash screen, and
   an adaptive-icon foreground (currently one `icon.png` is reused for all).
6. **Build**:
   ```bash
   eas build --profile production --platform all
   ```

## Phase 4 — Legal & store submission

1. **Privacy policy** — `PRIVACY_POLICY.md` (repo root) is a draft. Host it at
   a public URL, link it in-app and in both store listings, and have a lawyer
   review it. India: DPDP Act compliance. 18+ is already enforced server-side
   (DOB validation rejects under-18).
2. **Terms of Service + Community Guidelines** pages (hosted, linked via the
   env vars above).
3. **Google Play data-safety form** and **Apple App Privacy labels** — declare:
   phone number, photos, location, push tokens, purchase history.
4. **Dating-app category requirements** — both stores require working
   block/report (✅ built) and a moderation process
   (`GET /api/admin/reports` exists — assign a human to review it).
5. **Age rating** questionnaires — 17+ (Apple) / Mature (Google).
6. **App Tracking Transparency** (iOS) — only needed if tracking SDKs are
   added later; none are present today.

## Phase 5 — Operations before opening the doors

1. **Create your real account** in production (real phone OTP), find your user
   ID, and set it in `ADMIN_USER_IDS`.
2. **Create the 100 venues + room schedules** via the admin API:
   - `POST /api/admin/venues` — `{ name, type, address, area, city, lat?, lng? }`
   - `POST /api/admin/rooms` — `{ venueId, name, capacity?, startsAt, endsAt }`
     (validates `endsAt > startsAt` and that the venue exists)
   - Deactivate instead of delete: `PATCH /api/admin/venues/:id` with
     `{ "active": false }` (delete is FK-guarded and returns 409 once a venue
     has rooms/check-ins/events).
3. **Database backups** — enable host-managed snapshots; point-in-time
   recovery if available.
4. **Razorpay live mode** — complete KYC, switch keys to live, set the payout
   account.
5. **Moderation workflow** — decide who reviews reports and how often;
   document the takedown/ban procedure.
6. **Uptime monitoring** — point UptimeRobot (or similar) at
   `https://<api>/api/healthz`.
7. **Replace seed Unsplash imagery** if demo data is ever enabled anywhere
   public-facing (not needed if `SEED_DEMO_DATA` stays off).

## Phase 6 — Launch-day smoke test

Run on a **real device with the production build** against the production API:

- [ ] Real phone number → receives real SMS OTP → logs in
- [ ] Edit profile + upload a photo → persists after app restart (proves S3 works)
- [ ] Check into a venue → swipe → match with a second test account → chat works
- [ ] Push notification arrives while the app is closed → tap deep-links into chat
- [ ] Buy the smallest cube pack with a real ₹99 payment → cubes credited
      (refund yourself afterwards via the Razorpay dashboard)
- [ ] Block + report a user → report appears in `GET /api/admin/reports`
- [ ] Delete account → data gone; same number can re-register cleanly
- [ ] `GET /api/healthz` returns ok; uptime monitor is green
- [ ] Confirm no demo data: venue list shows only YOUR venues; no bot profiles
      appear in swipe decks

## Priority order (start these first)

1. **Twilio + India DLT sender registration** — approval takes days; the
   single longest lead-time item.
2. **S3 bucket + storage env vars** — the only remaining thing that can
   silently *lose user data*.
3. **Apple/Google developer accounts + bundle ID** — store review queues add
   days too.
4. Everything else in phase order.

---

## Quick reference — admin API

All endpoints require a JWT of a user listed in `ADMIN_USER_IDS`
(`Authorization: Bearer <token>`). Non-admins get 403; unauthenticated 401.

```
GET    /api/admin/venues             list all venues (incl. inactive)
POST   /api/admin/venues             create  { name, type, address, area, city, lat?, lng? }
PATCH  /api/admin/venues/:id         update any subset, incl. { active: false }
DELETE /api/admin/venues/:id         hard delete (409 if rooms/check-ins/events exist)

GET    /api/admin/rooms?venueId=N    list rooms (optionally for one venue)
POST   /api/admin/rooms              create  { venueId, name, capacity?, startsAt, endsAt }
PATCH  /api/admin/rooms/:id          update
DELETE /api/admin/rooms/:id          hard delete

GET    /api/admin/reports            moderation queue
```

## Quick reference — run locally (demo)

```
DB    : .demo-db → node start-db.mjs            (Postgres on 5433)
API   : artifacts/api-server → built dist on 8080 with ENABLE_DEMO_AUTH=true
Expo  : artifacts/icebreaker-mobile → Metro on 8081
Login : phone 8095411567 · OTP 123456
Tests : artifacts/api-server → pnpm test  (24 pass with DB; integration tests
        self-skip without one)
```
