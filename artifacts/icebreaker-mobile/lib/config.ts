// Central API base URL resolution for the mobile app.
//
// Priority:
//   1. EXPO_PUBLIC_API_BASE_URL — explicit, stable backend. Use this for
//      Expo dev against a real server and for EAS/native production builds.
//   2. EXPO_PUBLIC_DOMAIN — Replit dev/preview convenience only (injected by the
//      Replit run command). Never rely on this for a distributed build.
//
// Both the REST client (setBaseUrl) and the Socket.IO client read this value so
// they always point at the same origin.

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "");

export const HAS_API_BASE_URL = API_BASE_URL.length > 0;

// Clerk publishable key. When empty, Clerk sign-in is disabled and ClerkProvider
// is not mounted — so any component using Clerk hooks must be gated on this too.
// Resolved in one place so _layout (provider) and auth (hooks) always agree.
export const CLERK_PUBLISHABLE_KEY: string =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  (typeof process !== "undefined" ? (process as any).env?.VITE_CLERK_PUBLISHABLE_KEY : "") ||
  "";

export const HAS_CLERK = CLERK_PUBLISHABLE_KEY.length > 0;

// Surface a loud, actionable error when nothing is configured. We log rather
// than throw so the app still renders an error boundary instead of a white
// screen, but the message makes the misconfiguration obvious in any build.
if (!HAS_API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.error(
    "[config] No API base URL configured. Set EXPO_PUBLIC_API_BASE_URL " +
      "(production/native) or EXPO_PUBLIC_DOMAIN (Replit preview). " +
      "All API and realtime calls will fail until this is set.",
  );
}
