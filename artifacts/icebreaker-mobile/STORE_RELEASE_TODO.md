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

Still required before a public store release:

- [ ] **Set the EAS `projectId`** (`extra.eas.projectId` in app config) so
      `getExpoPushTokenAsync` returns real tokens; without it push registration
      is a no-op. Then test push end-to-end on a physical device.
- [ ] **Real icon/splash assets.** Currently `icon.png` is reused for icon, splash and adaptive foreground. Produce a proper 1024×1024 icon and a dedicated splash/adaptive foreground.
- [ ] **Set real legal URLs** via `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_COMMUNITY_URL` (defaults point at example.com placeholders).
- [ ] **Host the privacy policy URL** and link it in both store listings and in-app Settings.
- [ ] **Data-safety / App Privacy disclosures.** Declare collected data (phone, photos, location, usage). The app uses location (`expo-location`), camera/photos (`expo-image-picker`), phone number, and push tokens.
- [ ] **App Tracking Transparency** (iOS) if any tracking SDKs are added.
- [ ] Replace demo/seed Unsplash imagery and the `ENABLE_DEMO_AUTH` bypass for production.
- [ ] Run `pnpm db:push` so the new `device_tokens` table, indexes, and FK cascade rules reach the database.
