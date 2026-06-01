// Shared CORS configuration for both the Express app and the Socket.IO server.
//
// Origins are driven by ALLOWED_ORIGINS (comma-separated). In development, if
// nothing is configured we fall back to allowing all origins so local/Replit
// preview keeps working. In production an empty allowlist means "same-origin
// only" (no cross-origin browsers), which is the safe default.

import type { CorsOptions } from "cors";

const IS_PROD = process.env.NODE_ENV === "production";

export const ALLOWED_ORIGINS: string[] = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// `true` => reflect request origin (allow all). Used for dev convenience.
export const ALLOW_ALL = ALLOWED_ORIGINS.length === 0 && !IS_PROD;

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // non-browser clients (mobile app, curl) send no Origin
  if (ALLOW_ALL) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

// Socket.IO accepts either `true`/`"*"` or an explicit origin list.
export const socketCorsOrigin: string[] | boolean = ALLOW_ALL ? true : ALLOWED_ORIGINS;
