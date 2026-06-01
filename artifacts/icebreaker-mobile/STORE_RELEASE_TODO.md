# App Store / Play Store readiness — TODO

Config that's already in place:

- `app.json` → iOS `bundleIdentifier` and Android `package` set to `com.icebreaker.mobile` (change to your real reverse-domain ID before submitting).
- `app.json` → Android `adaptiveIcon` configured.
- `eas.json` → `development` / `preview` / `production` build profiles, each with an `EXPO_PUBLIC_API_BASE_URL` env (replace the example domains).

Still required before a public store release:

- [ ] **Real icon/splash assets.** Currently `icon.png` is reused for icon, splash and adaptive foreground. Produce a proper 1024×1024 icon and a dedicated splash/adaptive foreground.
- [ ] **Push notifications.** Add `expo-notifications`, request permissions, register device tokens with the backend, and send pushes for new matches / messages. (Backend has no push endpoints yet.)
- [ ] **Privacy policy URL.** Required by both stores. Host one and link it in store listings and in-app Settings.
- [ ] **Data-safety / App Privacy disclosures.** Declare collected data (phone, photos, location, usage). The app uses location (`expo-location`), camera/photos (`expo-image-picker`), and phone number.
- [ ] **In-app account deletion.** Apple requires apps with account creation to offer in-app deletion. Add a "Delete account" flow in Settings calling a new `DELETE /api/user/me` endpoint that removes/anonymises the user's data.
- [ ] **App Tracking Transparency** (iOS) if any tracking SDKs are added.
- [ ] Replace demo/seed Unsplash imagery and the `ENABLE_DEMO_AUTH` bypass for production.
