/**
 * Tests for GET /api/admin/claims
 *
 * Mocks Prisma and auth to test the admin claims list route handler.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claim: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Import AFTER mocks
import { GET } from "@/app/api/admin/claims/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/admin/claims");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

const adminSession = {
  user: { id: "admin-1", isAdmin: true },
};

const userSession = {
  user: { id: "user-1", isAdmin: false },
};

const sampleClaims = [
  {
    id: "claim-1",
    title: "Creatine increases muscle mass",
    difficulty: "EASY",
    createdAt: new Date().toISOString(),
    market: { status: "ACTIVE", yesVotes: 10, noVotes: 5, totalVotes: 15 },
    _count: { claimVotes: 15, claimPapers: 3, dossierJobs: 1 },
  },
  {
    id: "claim-2",
    title: "BCAAs are unnecessary",
    difficulty: "MEDIUM",
    createdAt: new Date().toISOString(),
    market: { status: "RESOLVED", yesVotes: 20, noVotes: 8, totalVotes: 28 },
    _count: { claimVotes: 28, claimPapers: 5, dossierJobs: 2 },
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/claims", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockResolvedValue(userSession);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns paginated admin claims list", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue(sampleClaims);
    mockCount.mockResolvedValue(2);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.claims).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.page).toBe(1);
    expect(data.totalPages).toBe(1);
  });

  it("supports status filter", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([sampleClaims[0]]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest({ status: "ACTIVE" }));
    expect(res.status).toBe(200);

    // Verify the where clause included market status filter
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { market: { status: "ACTIVE" } },
      }),
    );
  });

  it("supports pagination params", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(25);

    const res = await GET(makeRequest({ page: "2", limit: "10" }));
    expect(res.status).toBe(200);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );

    const data = await res.json();
    expect(data.page).toBe(2);
    expect(data.totalPages).toBe(3);
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockRejectedValue(new Error("DB down"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
