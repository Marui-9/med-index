/**
 * Tests for GET /api/claims and POST /api/claims
 *
 * Mocks Prisma and auth to test the claims list/create route handlers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockMarketCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claim: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    market: {
      create: (...args: unknown[]) => mockMarketCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Import AFTER mocks
import { GET, POST } from "@/app/api/claims/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeGetRequest(searchParams: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/claims");
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sampleClaim = {
  id: "claim-1",
  title: "Creatine increases muscle mass",
  normalizedTitle: "creatine increases muscle mass",
  description: null,
  difficulty: "MEDIUM",
  revealAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  market: {
    status: "ACTIVE",
    yesVotes: 10,
    noVotes: 3,
    totalVotes: 13,
    aiVerdict: null,
    aiConfidence: null,
  },
};

// ── GET /api/claims ────────────────────────────────────────────────────────

describe("GET /api/claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated claims list", async () => {
    mockFindMany.mockResolvedValue([sampleClaim]);

    const req = makeGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.claims).toHaveLength(1);
    expect(json.claims[0].title).toBe("Creatine increases muscle mass");
    expect(json.nextCursor).toBeNull();
  });

  it("sets nextCursor when there are more results", async () => {
    // Return limit+1 items (default limit=20, so 21 items)
    const claims = Array.from({ length: 21 }, (_, i) => ({
      ...sampleClaim,
      id: `claim-${i}`,
    }));
    mockFindMany.mockResolvedValue(claims);

    const req = makeGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.claims).toHaveLength(20); // Extra item removed
    expect(json.nextCursor).toBe("claim-20");
  });

  it("passes difficulty filter to Prisma", async () => {
    mockFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ difficulty: "HARD" });
    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ difficulty: "HARD" }),
      }),
    );
  });

  it("passes status filter through market relation", async () => {
    mockFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ status: "ACTIVE" });
    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ market: { status: "ACTIVE" } }),
      }),
    );
  });

  it("passes search filter as case-insensitive contains", async () => {
    mockFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ search: "creatine" });
    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { contains: "creatine", mode: "insensitive" },
        }),
      }),
    );
  });

  it("uses cursor-based pagination when cursor is provided", async () => {
    mockFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ cursor: "claim-5" });
    await GET(req);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "claim-5" },
        skip: 1,
      }),
    );
  });

  it("returns 400 for invalid difficulty value", async () => {
    const req = makeGetRequest({ difficulty: "IMPOSSIBLE" });
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("clamps limit to max 50", async () => {
    mockFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ limit: "100" });
    const res = await GET(req);

    // Zod coerce with max(50) should reject
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB down"));

    const req = makeGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to fetch claims");
  });
});

// ── POST /api/claims ───────────────────────────────────────────────────────

describe("POST /api/claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = makePostRequest({ title: "Some health claim here" });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", isAdmin: false },
    });

    const req = makePostRequest({ title: "Some health claim here" });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("returns 400 when title is too short", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", isAdmin: true },
    });

    const req = makePostRequest({ title: "Short" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/10 characters/i);
  });

  it("returns 409 when duplicate claim exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", isAdmin: true },
    });
    mockFindUnique.mockResolvedValue({ id: "existing-claim" });

    const req = makePostRequest({
      title: "Creatine increases muscle mass",
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/i);
  });

  it("creates claim + market and returns 201", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", isAdmin: true },
    });
    // No duplicate
    mockFindUnique
      .mockResolvedValueOnce(null) // duplicate check
      .mockResolvedValueOnce({
        // re-fetch after create
        id: "new-claim",
        title: "Cold plunges improve recovery",
        normalizedTitle: "cold plunges improve recovery",
        description: null,
        difficulty: "MEDIUM",
        market: {
          id: "market-1",
          status: "ACTIVE",
          yesVotes: 0,
          noVotes: 0,
          totalVotes: 0,
        },
      });

    // Mock transaction — execute the callback with a fake tx
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        claim: {
          create: vi.fn().mockResolvedValue({
            id: "new-claim",
            title: "Cold plunges improve recovery",
          }),
        },
        market: {
          create: vi.fn().mockResolvedValue({ id: "market-1" }),
        },
      };
      return fn(tx);
    });

    const req = makePostRequest({
      title: "Cold plunges improve recovery",
      difficulty: "HARD",
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.title).toBe("Cold plunges improve recovery");
    expect(json.market.status).toBe("ACTIVE");
  });

  it("normalizes title for dedup check", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", isAdmin: true },
    });
    mockFindUnique.mockResolvedValue({ id: "dup" });

    const req = makePostRequest({
      title: "  Creatine Increases Muscle Mass  ",
    });
    await POST(req);

    // The normalizedTitle lookup should be lowercase + trimmed
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { normalizedTitle: "creatine increases muscle mass" },
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", isAdmin: true },
    });
    mockFindUnique.mockRejectedValue(new Error("Unexpected error"));

    const req = makePostRequest({
      title: "BCAAs are unnecessary if protein is adequate",
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
