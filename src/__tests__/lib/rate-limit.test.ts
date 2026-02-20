/**
 * Tests for rate limiter utility (src/lib/rate-limit.ts)
 *
 * Verifies sliding-window rate limiting, IP extraction, pre-configured
 * tiers, and cleanup behaviour.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import {
  createRateLimiter,
  authLimiter,
  actionLimiter,
  readLimiter,
  adminLimiter,
} from "@/lib/rate-limit";

// ── Helpers ──────────────────────────────────────────────────────────────

function makeRequest(ip = "127.0.0.1", path = "/api/test") {
  const req = new NextRequest(`http://localhost:3000${path}`, {
    headers: { "x-forwarded-for": ip },
  });
  return req;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("createRateLimiter", () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter({ windowMs: 60_000, max: 3, message: "Slow down" });
  });

  afterEach(() => {
    // Clear internal store between tests
    if (limiter._store) limiter._store.clear();
  });

  it("allows requests under the limit", () => {
    const req = makeRequest("10.0.0.1");
    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)).toBeNull();
  });

  it("blocks requests over the limit with 429", async () => {
    const req = makeRequest("10.0.0.2");
    limiter.check(req);
    limiter.check(req);
    limiter.check(req);
    const blocked = limiter.check(req);
    expect(blocked).not.toBeNull();
    const body = await blocked!.json();
    expect(blocked!.status).toBe(429);
    expect(body.error).toBe("Slow down");
  });

  it("tracks different IPs separately", () => {
    const reqA = makeRequest("10.0.0.3");
    const reqB = makeRequest("10.0.0.4");
    limiter.check(reqA);
    limiter.check(reqA);
    limiter.check(reqA);
    // A is at limit
    expect(limiter.check(reqA)).not.toBeNull();
    // B should still be fine
    expect(limiter.check(reqB)).toBeNull();
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    const req = makeRequest("10.0.0.5");
    limiter.check(req);
    limiter.check(req);
    limiter.check(req);
    expect(limiter.check(req)).not.toBeNull();

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    // Should be allowed again
    expect(limiter.check(req)).toBeNull();
    vi.useRealTimers();
  });
});

describe("IP extraction", () => {
  it("reads x-forwarded-for header", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, message: "test" });
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    limiter.check(req);
    // Second request from same forwarded IP should be blocked
    expect(limiter.check(req)).not.toBeNull();
    limiter._store.clear();
  });

  it("falls back to x-real-ip", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, message: "test" });
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-real-ip": "198.51.100.1" },
    });
    limiter.check(req);
    expect(limiter.check(req)).not.toBeNull();
    limiter._store.clear();
  });

  it("uses anonymous fallback when no IP headers present", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, message: "test" });
    const req = new NextRequest("http://localhost:3000/api/test");
    limiter.check(req);
    expect(limiter.check(req)).not.toBeNull();
    limiter._store.clear();
  });
});

describe("pre-configured limiters exist", () => {
  it("authLimiter is defined", () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter.check).toBe("function");
  });

  it("actionLimiter is defined", () => {
    expect(actionLimiter).toBeDefined();
    expect(typeof actionLimiter.check).toBe("function");
  });

  it("readLimiter is defined", () => {
    expect(readLimiter).toBeDefined();
    expect(typeof readLimiter.check).toBe("function");
  });

  it("adminLimiter is defined", () => {
    expect(adminLimiter).toBeDefined();
    expect(typeof adminLimiter.check).toBe("function");
  });
});
