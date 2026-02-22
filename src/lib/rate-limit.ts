/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding-window counter per IP address. For production at scale,
 * replace with Redis-backed rate limiting (e.g., @upstash/ratelimit).
 *
 * Usage in a route handler:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   // inside handler:
 *   const limited = limiter.check(request);
 *   if (limited) return limited; // 429 response
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimiterOptions {
  /** Window size in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
  /** Optional message for 429 response */
  message?: string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, WindowEntry>>();

// Periodic cleanup to prevent memory leaks (every 5 minutes)
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      for (const [, store] of stores) {
        for (const [key, entry] of store) {
          if (now > entry.resetAt) {
            store.delete(key);
          }
        }
      }
    }, 5 * 60 * 1000);
  }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, message = "Too many requests" } = options;
  const storeName = `${windowMs}-${max}-${Math.random().toString(36).slice(2)}`;
  const store = new Map<string, WindowEntry>();
  stores.set(storeName, store);
  scheduleCleanup();

  return {
    /**
     * Check if the request should be rate-limited.
     * Returns a 429 NextResponse if limited, or null if allowed.
     */
    check(request: NextRequest): NextResponse | null {
      const ip = getClientIp(request);
      const now = Date.now();

      let entry = store.get(ip);

      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        store.set(ip, entry);
      }

      entry.count++;

      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
          { error: message },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(max),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(entry.resetAt),
            },
          },
        );
      }

      return null;
    },

    /** Exposed for testing */
    _store: store,
    _getClientIp: getClientIp,
  };
}

// ── Pre-configured limiters for different route tiers ────────────────────

/** Auth routes: 10 requests per minute per IP */
export const authLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: "Too many authentication attempts. Please try again in a minute.",
});

/** Voting / coin claiming: 30 requests per minute per IP */
export const actionLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  message: "Too many requests. Please slow down.",
});

/** General read routes: 60 requests per minute per IP */
export const readLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: "Too many requests. Please try again shortly.",
});

/** Admin routes: 30 requests per minute per IP */
export const adminLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  message: "Too many admin requests.",
});
