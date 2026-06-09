# Icebreaker

Venue-first social/dating app: discover venues, check in, meet checked-in people, join live rooms, match, play a 6-turn icebreaker (three messages each), then chat. Includes a Cubes economy, seasons/quests/badges, drink gifts, date bookings, and safety/reporting. Stack: Expo (mobile) + Express/Socket.IO API + Postgres/Drizzle.

## Run & Operate

- `pnpm install` — install workspace deps (pnpm only)
- `pnpm --filter @workspace/db run push` — apply the DB schema to `DATABASE_URL`
- `pnpm db:seed` — seed venues/events/season/quests/badges (idempotent; safe to re-run)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/icebreaker-mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm test` — run unit tests (recursive)
- `pnpm run build` — typecheck + build all packages

### First-run on a fresh deploy

```
pnpm install
pnpm --filter @workspace/db run push   # create tables (needs DATABASE_URL)
pnpm db:seed                           # populate venues/season/quests/badges
pnpm --filter @workspace/api-server run dev
```

The API server also seeds demo participants and refreshes live rooms on boot
(`ensureLiveRooms` / `ensureDemoParticipants`), which depend on venues existing —
so run `pnpm db:seed` before/around first boot.

## Environment variables

API server (`artifacts/api-server`):
- `DATABASE_URL` (required) — Postgres connection string
- `JWT_SECRET` (required in production) — token signing secret
- `JWT_EXPIRES_IN` (optional, default `7d`) — access-token lifetime
- `ENABLE_DEMO_AUTH` — `true`/`false`. Demo phone OTP bypass. Defaults ON in dev, OFF in production. Logs a warning when enabled.
- `SEED_DEMO_DATA` — `true`/`false`. Master switch for ALL fabricated content: seed bot profiles, their venue check-ins / room presence, auto-created "live" rooms, bots liking back to form matches, and bots auto-playing the icebreaker. Defaults ON in dev, **OFF in production** (must explicitly set `=true` to enable in prod). **Never enable in production** — showing fake people/matches to real users is a trust/legal/store-rejection risk. Logs a loud warning when enabled.
- `ALLOWED_ORIGINS` — comma-separated CORS allowlist (Express + Socket.IO). Empty in prod = same-origin only; empty in dev = allow all.
- `ADMIN_USER_IDS` — comma-separated user IDs with admin access. Gates the moderation queue (`GET /api/admin/reports`) and the venue/room management API (`/api/admin/venues`, `/api/admin/rooms` — create/update/list/delete). Required in production to operate venues and schedule rooms.
- `STORAGE_PROVIDER` — `local` (default) or `s3`. Photo storage backend.
  - local: `PUBLIC_BASE_URL` (optional) to return absolute `/uploads` URLs.
  - s3: `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (optional, for R2/GCS/Replit), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` (optional), `S3_KEY_PREFIX`, `S3_FORCE_PATH_STYLE`. Requires `@aws-sdk/client-s3` installed.
- Optional integrations: `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`, `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_PHONE_NUMBER`, `CLERK_SECRET_KEY`.

Mobile app (`artifacts/icebreaker-mobile`, see `.env.example`):
- `EXPO_PUBLIC_API_BASE_URL` — backend base URL. Required for native/EAS builds.
- `EXPO_PUBLIC_DOMAIN` — Replit preview fallback only (auto-injected by the run command).
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — optional, enables Clerk sign-in.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
