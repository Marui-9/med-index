/**
 * Tests for Zod validation on API routes (Step 9 hardening).
 *
 * Verifies that routes with newly added Zod schemas properly reject
 * invalid input with 400 status codes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Shared mocks ──────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    claim: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
    market: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/coin-service", () => ({
  getCoinHistory: vi.fn().mockResolvedValue({ transactions: [], total: 0 }),
}));

// ── Helpers ──────────────────────────────────────────────────────────

function makeGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost:3000${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

// ── coins/history validation ─────────────────────────────────────────

describe("GET /api/coins/history — Zod validation", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const mod = await import("@/app/api/coins/history/route");
    GET = mod.GET;
  });

  it("rejects limit > 100", async () => {
    const res = await GET(makeGet("/api/coins/history", { limit: "200" }));
    expect(res.status).toBe(400);
  });

  it("rejects negative offset", async () => {
    const res = await GET(makeGet("/api/coins/history", { offset: "-5" }));
    expect(res.status).toBe(400);
  });

  it("accepts valid params", async () => {
    const res = await GET(makeGet("/api/coins/history", { limit: "10", offset: "0" }));
    expect(res.status).toBe(200);
  });
});

// ── admin/claims list validation ─────────────────────────────────────

describe("GET /api/admin/claims — Zod validation", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isAdmin: true } });
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    const mod = await import("@/app/api/admin/claims/route");
    GET = mod.GET;
  });

  it("rejects invalid status enum", async () => {
    const res = await GET(makeGet("/api/admin/claims", { status: "BANANA" }));
    expect(res.status).toBe(400);
  });

  it("rejects page < 1", async () => {
    const res = await GET(makeGet("/api/admin/claims", { page: "0" }));
    expect(res.status).toBe(400);
  });

  it("rejects limit > 50", async () => {
    const res = await GET(makeGet("/api/admin/claims", { limit: "999" }));
    expect(res.status).toBe(400);
  });

  it("accepts valid params", async () => {
    const res = await GET(
      makeGet("/api/admin/claims", { status: "ACTIVE", page: "1", limit: "25" }),
    );
    expect(res.status).toBe(200);
  });
});

// ── claims/[claimId] path param validation ───────────────────────────

describe("GET /api/claims/[claimId] — claimId validation", () => {
  let GET: (req: NextRequest, ctx: { params: Promise<{ claimId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    mockAuth.mockResolvedValue(null);
    const mod = await import("@/app/api/claims/[claimId]/route");
    GET = mod.GET;
  });

  it("rejects empty claimId", async () => {
    const req = new NextRequest("http://localhost:3000/api/claims/ ");
    const res = await GET(req, { params: Promise.resolve({ claimId: "" }) });
    expect(res.status).toBe(400);
  });

  it("rejects extremely long claimId", async () => {
    const longId = "a".repeat(200);
    const req = new NextRequest(`http://localhost:3000/api/claims/${longId}`);
    const res = await GET(req, { params: Promise.resolve({ claimId: longId }) });
    expect(res.status).toBe(400);
  });
});
