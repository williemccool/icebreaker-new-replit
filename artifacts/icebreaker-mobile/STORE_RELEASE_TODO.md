# App Store / Play Store readiness — TODO

Config that's already in place:

- `app.json` → iOS `bundleIdentifier` and Android `package` set to `com.icebreaker.mobile` (change to your real reverse-domain ID before submitting).
- `app.json` → Android `adaptiveIcon` configured.
- `eas.json` → `development` / `preview` / `production` build profiles, each with an `EXPO_PUBLIC_API_BASE_URL` env (replace the example domains).

Backend now in place (production-hardening pass):

- [x] **Account deletion (backend).** `DELETE /api/user/me` removes the user and all
      associated data; FK `onDelete: cascade` rules in the schema handle children.
      _Still needs the mobile "Delete account" button in Settings to call it._
- [x] **Push notifications (backend).** Device-token table + `POST`/`DELETE
      /api/me/push-token` endpoints + Expo push helper (`lib/push.ts`); new chat
      messages push the recipient when they're offline.
      _Still needs the mobile client (see below)._
- [x] **Privacy policy (draft).** See `PRIVACY_POLICY.md` at the repo root. Host it
      at a public URL and link it, then have a lawyer review.

Still required before a public store release:

- [ ] **Mobile push client.** Add `expo-notifications`, request permission, get the
      Expo push token, and `POST /api/me/push-token` on login (and `DELETE` on
      logout). Handle notification taps to deep-link into the chat.
- [ ] **Mobile "Delete account" flow.** Add a confirmation screen in Settings that
      calls `DELETE /api/user/me`, then clears the local token and signs out.
- [ ] **Real icon/splash assets.** Currently `icon.png` is reused for icon, splash and adaptive foreground. Produce a proper 1024×1024 icon and a dedicated splash/adaptive foreground.
- [ ] **Host the privacy policy URL** and link it in both store listings and in-app Settings.
- [ ] **Data-safety / App Privacy disclosures.** Declare collected data (phone, photos, location, usage). The app uses location (`expo-location`), camera/photos (`expo-image-picker`), phone number, and push tokens.
- [ ] **App Tracking Transparency** (iOS) if any tracking SDKs are added.
- [ ] Replace demo/seed Unsplash imagery and the `ENABLE_DEMO_AUTH` bypass for production.
- [ ] Run `pnpm db:push` so the new `device_tokens` table, indexes, and FK cascade rules reach the database.
