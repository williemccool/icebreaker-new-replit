# Icebreaker Dating App MVP

Nightlife-first dating/social app targeting Bangalore, India.

## Architecture

**Stack:** Node.js + Express backend, React + Vite frontend, PostgreSQL (Neon), Drizzle ORM

**Auth:** Phone OTP via `/api/auth/send-otp` + `/api/auth/verify-otp` — JWT in localStorage. OTP logged to console in dev.

**Database:** Neon serverless PostgreSQL. Schema in `shared/schema.ts`. Run `npm run db:push` for migrations.

**Path aliases:** `@/*` → `client/src`, `@shared/*` → `shared`, `@db/*` → `db`

## Color System

- Electric Pink: `#FF1B8D` (`icebreaker-coral`)
- Electric Cyan: `#00CFFF` (`icebreaker-teal`)
- Background: `#0A0A0C`
- Surface: `#141418`
- Elevated: `#1E1E25`
- Border: `#252530`
- Muted text: `#8A8FA8`

Font: Plus Jakarta Sans (800 headings, 400/600 body)

## Demo Mode

Run `npx tsx scripts/seed-demo.ts` after creating a user account to populate demo data:
- 15 demo users with real photos (Unsplash), bios, and Bangalore profiles
- Active venue check-ins at Toit (6), Skyye (5), Social (4)
- Room presence with real participant counts and gender ratios
- 3 pre-created matches with conversation threads
- Incoming swipes (liking any user triggers instant match)
- Leaderboard entries, quest progress, XP/levels
- Rolling room times (always "tonight", never expired)

**Demo flow:** Login → Venues → Check in → See people with photos → Gift drink → Rooms → Swipe → Match → Icebreaker Game (saves to chat) → Chat → Plan Date

## Pages

### Customer-Facing (all redesigned to match design system)

| Route | File | Description |
|-------|------|-------------|
| `/` (auth) | `AuthPage.tsx` | Welcome screen → phone OTP flow |
| `/tutorial` | `TutorialPage.tsx` | 4-slide onboarding carousel |
| `/onboarding` | `OnboardingPage.tsx` | Profile setup (Basics/Vibe/Photos) with reward bar |
| `/` | `HomePage.tsx` | Tonight Hub with tabs, live rooms, venues |
| `/venues` | `VenuesPage.tsx` | Venue listing |
| `/venues/:id` | `VenueDetailPage.tsx` | Venue detail + In-Venue Dashboard (post check-in) |
| `/rooms` | `RoomsPage.tsx` | Live Room Card Design with gender ratios |
| `/rooms/:id` | `RoomDiscoveryPage.tsx` | Live Room Lobby — swipe profiles in room |
| `/matches` | `MatchesPage.tsx` | Match list |
| `/chat/:id` | `ChatPage.tsx` | Chat with Plan Date modal |
| `/match/:matchId` | `MutualMatchPage.tsx` | Ice Broken! celebration screen |
| `/game/:matchId` | `IcebreakerGamePage.tsx` | 3-round Icebreaker game (saves responses to chat) |
| `/gift/:userId` | `GiftDrinkPage.tsx` | Gift a drink with Cubes wallet |
| `/payment` | `PaymentPage.tsx` | Payment method selection (simulated) |
| `/payment/confirm` | `ConfirmPurchasePage.tsx` | Confirm purchase (simulated) |
| `/events` | `EventsPage.tsx` | Events listing |
| `/profile` | `ProfilePage.tsx` | My Profile Hero with stats |
| `/quests` | `QuestsPage.tsx` | Quests & gamification |
| `/leaderboard` | `LeaderboardPage.tsx` | Season leaderboard |
| `/safety` | `TrustSafetyPage.tsx` | Trust & Safety Center |

## Key Features

- Phone OTP authentication
- Venue check-ins (+Cubes reward)
- Swipe/match in rooms (with photo cards)
- Chat after match with Plan Date feature
- Icebreaker game (3 rounds, saves responses as messages)
- Mutual Match celebration screen with photos
- Gift a Drink (Cubes wallet, DB-backed, with user photos)
- Events & ticketing
- Gamification: Cubes wallet, XP/Levels, Quests, Seasons, Leaderboards
- Women-first safety: Ghost Mode, ID verification, Panic flow
- In-Venue Dashboard (post check-in with user photos)
- Virtual Live Rooms with computed gender ratio and participant counts

## Database Tables

users, preferences, venues, checkIns, rooms, roomPresence, swipes, matches (with venueId), messages, events, tickets, seasons, quests, questProgress, cubeWallets, cubeTransactions, leaderboards, subscriptions, boosts, reports, dateBookings, drinkGifts, crews, crewMembers, otpVerifications, badges, userBadges

## API Endpoints

### Auth
- `POST /api/auth/send-otp` — Send OTP (logged to console in dev)
- `POST /api/auth/verify-otp` — Verify OTP, returns JWT token

### User
- `GET /api/user/me` — Current user + wallet + preferences
- `PUT /api/user/profile` — Update profile (gender enum: male/female/non_binary/other)
- `PUT /api/user/preferences` — Update preferences
- `GET /api/users/:id` — Public user profile (safe subset, no DOB)

### Social
- `GET /api/wallet` — Cubes wallet balance
- `GET /api/matches` — All matches with otherUser (safe projection)
- `GET /api/matches/:id` — Single match (auth-checked: must be participant)
- `GET /api/matches/:id/messages` — Messages for match
- `POST /api/matches/:id/messages` — Send message (field: `body`)
- `POST /api/swipe` — Swipe action (auto-match on mutual like, records venueId)

### Venues & Rooms
- `GET /api/venues` — All venues with peopleHere count
- `GET /api/venues/:id` — Venue detail + active checked-in users
- `POST /api/venues/:id/check-in` — Check in to venue
- `POST /api/venues/check-out` — Check out from current venue
- `GET /api/rooms` — Active rooms with computed participants + femaleRatio
- `GET /api/rooms/:id` — Room with participant user details

### Events & Gamification
- `GET /api/events` — Events (filterable by city)
- `POST /api/events/:id/purchase` — Purchase ticket with Cubes
- `GET /api/quests` — Available quests with user progress
- `GET /api/leaderboard` — Season leaderboard
- `GET /api/season/current` — Current season info

### Social Features
- `POST /api/gifts/send` — Gift a drink (uses Cubes)
- `POST /api/dates/propose` — Propose a date
- `POST /api/dates/:id/confirm` — Confirm a date
- `GET /api/crews/my` — My crews
- `POST /api/crews` — Create a crew

## Important Notes

- **No admin dashboard** — customer-facing only
- **No Razorpay** — payment screens are simulated
- Base seed: `npx tsx scripts/seed.ts` (venues, rooms, events, quests, badges)
- Demo seed: `npx tsx scripts/seed-demo.ts` (users, check-ins, matches, leaderboard)
- Dev OTP: logged to console
- Gender enum values: `male`, `female`, `non_binary`, `other`
- Message field name: `body` (not `text` or `content`)
- Matches table has `venueId` for tracking where matches happen
- Rooms `participants` and `femaleRatio` are computed from room_presence + users join
- User photos rendered across all pages (venue, chat, matches, gift, icebreaker)
