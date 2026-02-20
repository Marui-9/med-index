/**
 * Tests for POST /api/admin/claims/[claimId]/resolve
 *
 * Mocks Prisma and auth to test the admin claim resolve route handler.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockClaimFindUnique = vi.fn();
const mockClaimUpdate = vi.fn();
const mockMarketUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claim: {
      findUnique: (...args: unknown[]) => mockClaimFindUnique(...args),
      update: (...args: unknown[]) => mockClaimUpdate(...args),
    },
    market: {
      update: (...args: unknown[]) => mockMarketUpdate(...args),
    },
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Import AFTER mocks
import { POST } from "@/app/api/admin/claims/[claimId]/resolve/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(claimId: string, body: Record<string, unknown>) {
  return new NextRequest(
    `http://localhost:3000/api/admin/claims/${claimId}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function makeParams(claimId: string) {
  return { params: Promise.resolve({ claimId }) };
}

const adminSession = {
  user: { id: "admin-1", isAdmin: true },
};

const userSession = {
  user: { id: "user-1", isAdmin: false },
};

const activeClaim = {
  id: "claim-1",
  title: "Creatine increases lean muscle mass",
  market: {
    id: "market-1",
    status: "ACTIVE",
    yesVotes: 100,
    noVotes: 12,
    totalVotes: 112,
  },
};

const resolvedClaim = {
  ...activeClaim,
  market: {
    ...activeClaim.market,
    status: "RESOLVED",
    aiVerdict: "YES",
    aiConfidence: 0.95,
  },
};

const validResolveBody = {
  aiVerdict: "YES",
  aiConfidence: 0.95,
  consensusSummary:
    "Meta-analyses consistently show creatine supplementation increases lean body mass when combined with resistance training.",
};

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/claims/[claimId]/resolve", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makeRequest("claim-1", validResolveBody),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockResolvedValue(userSession);
    const res = await POST(
      makeRequest("claim-1", validResolveBody),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when claim not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest("missing", validResolveBody),
      makeParams("missing"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when claim has no market", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique.mockResolvedValueOnce({
      ...activeClaim,
      market: null,
    });

    const res = await POST(
      makeRequest("claim-1", validResolveBody),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("no market");
  });

  it("returns 409 when claim is already resolved", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique.mockResolvedValueOnce(resolvedClaim);

    const res = await POST(
      makeRequest("claim-1", validResolveBody),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid input", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(
      makeRequest("claim-1", {
        aiVerdict: "MAYBE",
        aiConfidence: 2.0,
        consensusSummary: "Short",
      }),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(400);
  });

  it("resolves claim successfully with verdict", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique
      .mockResolvedValueOnce(activeClaim) // First: existence check
      .mockResolvedValueOnce({
        ...activeClaim,
        market: {
          ...activeClaim.market,
          status: "RESOLVED",
          aiVerdict: "YES",
          aiConfidence: 0.95,
          consensusSummary: validResolveBody.consensusSummary,
        },
      }); // Second: full return

    mockMarketUpdate.mockResolvedValue({
      ...activeClaim.market,
      status: "RESOLVED",
    });
    mockClaimUpdate.mockResolvedValue(activeClaim);

    const res = await POST(
      makeRequest("claim-1", validResolveBody),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(200);

    // Verify market was updated with verdict data
    expect(mockMarketUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "market-1" },
        data: expect.objectContaining({
          status: "RESOLVED",
          aiVerdict: "YES",
          aiConfidence: 0.95,
          consensusSummary: validResolveBody.consensusSummary,
        }),
      }),
    );

    // Verify claim revealAt was set
    expect(mockClaimUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "claim-1" },
      }),
    );
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(
      makeRequest("claim-1", validResolveBody),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(500);
  });
});
