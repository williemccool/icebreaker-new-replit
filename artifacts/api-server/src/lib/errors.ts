// Centralized error reporting.
//
// Every error funnels through captureError(), which logs a structured record via
// pino and — only if SENTRY_DSN is set AND @sentry/node is installed — forwards
// it to Sentry. Sentry is loaded lazily and optionally so it never becomes a
// hard dependency: the app runs fine without it, and turning it on is just an
// env var + `pnpm add @sentry/node` away.

import type { ErrorRequestHandler } from "express";
import { logger } from "./logger";

let sentry: any = null;
let sentryReady = false;

export async function initErrorReporting(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    // Computed specifier so TypeScript doesn't statically require @sentry/node —
    // it's an optional, install-on-demand dependency.
    const sentryModule = "@sentry/node";
    const mod: any = await import(sentryModule).catch(() => null);
    if (!mod) {
      logger.warn("[errors] SENTRY_DSN is set but @sentry/node is not installed — skipping Sentry.");
      return;
    }
    mod.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0,
    });
    sentry = mod;
    sentryReady = true;
    logger.info("[errors] Sentry error reporting enabled.");
  } catch (e) {
    logger.warn({ err: e }, "[errors] Failed to initialize Sentry.");
  }
}

/** Report an error from anywhere. Never throws. */
export function captureError(err: unknown, context: Record<string, unknown> = {}): void {
  logger.error({ err, ...context }, "captured_error");
  if (sentryReady && sentry) {
    try {
      sentry.captureException(err, { extra: context });
    } catch {
      /* a failing error reporter must never crash the caller */
    }
  }
}

/**
 * Express error-handling middleware. Register LAST, after all routes, so any
 * error passed to next(err) is logged/reported and returned as clean JSON
 * instead of leaking a stack trace to the client.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  captureError(err, {
    method: req.method,
    url: (req as any).originalUrl?.split("?")[0],
  });
  if (res.headersSent) return;
  const status =
    err && typeof err === "object" && typeof (err as any).status === "number"
      ? (err as any).status
      : 500;
  res.status(status).json({
    error: status >= 500 ? "Internal server error" : (err as any)?.message ?? "Request failed",
  });
};

/**
 * Process-level safety nets. An unhandled rejection or uncaught exception is
 * reported (so it shows up in logs/Sentry) rather than vanishing. An uncaught
 * exception still exits — the process state is undefined after one — but only
 * after the error has been recorded.
 */
export function installProcessErrorHandlers(): void {
  process.on("unhandledRejection", (reason) => captureError(reason, { kind: "unhandledRejection" }));
  process.on("uncaughtException", (err) => {
    captureError(err, { kind: "uncaughtException" });
    setTimeout(() => process.exit(1), 100);
  });
}
