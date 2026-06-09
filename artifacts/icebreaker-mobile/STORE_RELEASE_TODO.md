# App Store / Play Store readiness — TODO

Config that's already in place:

- `app.json` → iOS `bundleIdentifier` and Android `package` set to `com.icebreaker.mobile` (change to your real reverse-domain ID before submitting).
- `app.json` → Android `adaptiveIcon` configured.
- `eas.json` → `development` / `preview` / `production` build profiles, each with an `EXPO_PUBLIC_API_BASE_URL` env (replace the example domains).

Backend now in place (production-hardening pass):

- [x] **Account deletion (full).** `DELETE /api/user/me` (cascade) + mobile
      "Delete account" flow in Settings with confirmation → sign out.
- [x] **Push notifications (full).** Backend device-token table + endpoints +
      Expo push helper; mobile client registers the Expo token on login,
      unregisters on logout, and deep-links into the chat on tap
      (`lib/push.ts`, wired in `AuthContext`/`_layout`). Offline recipients get
      pushed on new messages.
- [x] **Settings wired.** Notifications toggle now (un)registers push; Legal links
      open the configured URLs (`LEGAL_URLS` in `lib/config.ts`).
- [x] **Privacy policy (draft).** See `PRIVACY_POLICY.md` at the repo root. Host it
      at a public URL and link it, then have a lawyer review.

Backend hardening (done):

- [x] **Security headers (helmet)** with hardened defaults; CORP relaxed so
      `/uploads` images render in the Expo web build.
- [x] **Body-size limits.** JSON capped at 1 MB globally; `/api/user/verify-selfie`
      gets a dedicated 8 MB parser for its base64 payload. Photo uploads remain
      multer-capped at 8 MB.
- [x] **Integration tests** (api-server `src/__tests__/api.integration.test.ts`):
      13 tests covering auth guards, OTP validation, swipe/match (incl. re-swipe
      idempotency and prod no-bot semantics), match IDOR, admin venue/room
      lifecycle + FK guards, leaderboard/profile PII scrubbing, and the body
      limit. They self-skip without a database; CI now runs them against a
      Postgres service container (`pnpm db:push` then `pnpm test`).

Still required before a public store release:

- [ ] **Set the EAS `projectId`** (`extra.eas.projectId` in app config) so
      `getExpoPushTokenAsync` returns real tokens; without it push registration
      is a no-op. Then test push end-to-end on a physical device.
- [ ] **Real icon/splash assets.** Currently `icon.png` is reused for icon, splash and adaptive foreground. Produce a proper 1024×1024 icon and a dedicated splash/adaptive foreground.
- [ ] **Set real legal URLs** via `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_COMMUNITY_URL` (defaults point at example.com placeholders).
- [ ] **Host the privacy policy URL** and link it in both store listings and in-app Settings.
- [ ] **Data-safety / App Privacy disclosures.** Declare collected data (phone, photos, location, usage). The app uses location (`expo-location`), camera/photos (`expo-image-picker`), phone number, and push tokens.
- [ ] **App Tracking Transparency** (iOS) if any tracking SDKs are added.
- [x] **Demo data gated for production.** All fabricated content (seed bot
      profiles, their check-ins/room presence, auto-created "live" rooms, bot
      auto-matching, bot icebreaker auto-play) is behind `SEED_DEMO_DATA`, which
      defaults OFF in production. `isBot` column now defaults to `false` so a
      "bot" is explicit opt-in. **Production deploy must leave `SEED_DEMO_DATA`
      unset/false and `ENABLE_DEMO_AUTH` unset/false.**
- [x] **Production venue/room management API.** Admin-only CRUD (gated by
      `ADMIN_USER_IDS`): `GET/POST/PATCH/DELETE /api/admin/venues` and
      `/api/admin/rooms` (+ `?venueId=` filter on room list). Venues support
      soft enable/disable via `active`; public discovery only shows active
      venues. Rooms validate `endsAt > startsAt` and venue existence. Hard
      DELETE is FK-guarded (venue with rooms/check-ins/events → 409; deactivate
      instead). Set `ADMIN_USER_IDS` (comma-separated user IDs) in prod env.
      NOTE: no UI yet (API only); partner-scoped access (owners managing only
      their venues) is a future extension — currently one trusted admin role.
- [ ] Replace demo/seed Unsplash imagery for production.
- [ ] Run `pnpm db:push` so the new `device_tokens` table, indexes, and FK cascade rules reach the database.
