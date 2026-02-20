/**
 * Tests for GET /api/health
 *
 * Mocks Prisma and Redis to test the health endpoint under
 * various service availability scenarios.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────

const mockQueryRaw = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

const mockPing = vi.fn();
vi.mock("@/lib/redis", () => ({
  redis: {
    ping: () => mockPing(),
  },
}));

import { GET } from "@/app/api/health/route";

// ── Tests ──────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with healthy status when DB is connected", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    process.env.DATABASE_URL = "postgresql://test";
    process.env.AUTH_SECRET = "test-secret";

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.services.database).toBe("connected");
    expect(body.timestamp).toBeDefined();
    expect(typeof body.latencyMs).toBe("number");
  });

  it("returns 503 with degraded status when DB is unreachable", async () => {
    mockQueryRaw.mockRejectedValue(new Error("Connection refused"));
    process.env.DATABASE_URL = "postgresql://test";
    process.env.AUTH_SECRET = "test-secret";

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.services.database).toBe("unreachable");
  });

  it("shows redis as not configured when REDIS_URL is absent", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    process.env.DATABASE_URL = "postgresql://test";
    process.env.AUTH_SECRET = "test-secret";
    delete process.env.REDIS_URL;

    const res = await GET();
    const body = await res.json();

    expect(body.services.redis).toBe("not configured");
  });

  it("shows redis as connected when REDIS_URL is set and ping succeeds", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockPing.mockResolvedValue("PONG");
    process.env.DATABASE_URL = "postgresql://test";
    process.env.AUTH_SECRET = "test-secret";
    process.env.REDIS_URL = "redis://localhost:6379";

    const res = await GET();
    const body = await res.json();

    expect(body.services.redis).toBe("connected");
  });

  it("includes env readiness report", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    process.env.DATABASE_URL = "postgresql://test";
    process.env.AUTH_SECRET = "test-secret";

    const res = await GET();
    const body = await res.json();

    expect(body.env).toBeDefined();
    expect(body.env.ready).toBe(true);
    expect(Array.isArray(body.env.warnings)).toBe(true);
  });

  it("returns nodeEnv field", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    process.env.DATABASE_URL = "postgresql://test";
    process.env.AUTH_SECRET = "test-secret";

    const res = await GET();
    const body = await res.json();

    expect(body.nodeEnv).toBeDefined();
  });
});
