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

## Pages

### Customer-Facing (all redesigned to match design system)

| Route | File | Description |
|-------|------|-------------|
| `/` (auth) | `AuthPage.tsx` | Welcome screen → phone OTP flow |
| `/tutorial` | `TutorialPage.tsx` | 4-slide onboarding carousel |
| `/onboarding` | `OnboardingPage.tsx` | Profile setup (Basics/Vibe/Photos) with reward bar |
| `/` | `HomePage.tsx` | Tonight Hub with tabs, live rooms, venues |
| `/discover` | `DiscoverPage.tsx` | Swipe discovery |
| `/venues` | `VenuesPage.tsx` | Venue listing |
| `/venues/:id` | `VenueDetailPage.tsx` | Venue detail + In-Venue Dashboard (post check-in) |
| `/rooms` | `RoomsPage.tsx` | Live Room Card Design with gender ratios |
| `/rooms/:id` | `RoomDiscoveryPage.tsx` | Live Room Lobby — swipe profiles in room |
| `/matches` | `MatchesPage.tsx` | Match list |
| `/chat/:id` | `ChatPage.tsx` | Ice Broken chat with message bar |
| `/match/:matchId` | `MutualMatchPage.tsx` | Ice Broken! celebration screen |
| `/game/:matchId` | `IcebreakerGamePage.tsx` | 3-round AI Icebreaker game |
| `/gift/:userId` | `GiftDrinkPage.tsx` | Gift a drink with Cubes wallet |
| `/payment` | `PaymentPage.tsx` | Payment method selection |
| `/payment/confirm` | `ConfirmPurchasePage.tsx` | Confirm purchase / order |
| `/events` | `EventsPage.tsx` | Events listing |
| `/profile` | `ProfilePage.tsx` | My Profile Hero with stats |
| `/quests` | `QuestsPage.tsx` | Quests & gamification |
| `/leaderboard` | `LeaderboardPage.tsx` | Season leaderboard |
| `/safety` | `TrustSafetyPage.tsx` | Trust & Safety Center |

## Key Features

- Phone OTP authentication
- Venue check-ins (+Cubes reward)
- Swipe/match in rooms and discovery
- Real-time-like chat after match
- AI Icebreaker game (3 rounds, tone options)
- Mutual Match celebration screen
- Gift a Drink (Cubes wallet, DB-backed)
- Events & ticketing
- Gamification: Cubes wallet, XP/Levels, Quests, Seasons, Leaderboards
- Women-first safety: Ghost Mode, ID verification, Panic flow
- In-Venue Dashboard (post check-in)
- Virtual Live Rooms with gender ratio display

## Database Tables

users, preferences, venues, checkIns, rooms, swipes, matches, messages, events, tickets, seasons, quests, userQuests, cubeTransactions, wallets, leaderboards, subscriptions, boosts, reports, dateBookings, drinkGifts, crews, crewMembers, otpVerifications, badges, userBadges

## Important Notes

- **No admin dashboard** — customer-facing only
- **No Razorpay** — payment screens are simulated
- Seed data: `npm run seed`
- Dev OTP: logged to console
