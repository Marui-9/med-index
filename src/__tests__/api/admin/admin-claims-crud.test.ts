/**
 * Tests for PATCH & DELETE /api/admin/claims/[claimId]
 *
 * Mocks Prisma and auth to test admin claim update/delete route handlers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockClaimFindUnique = vi.fn();
const mockClaimUpdate = vi.fn();
const mockClaimDelete = vi.fn();
const mockMarketUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claim: {
      findUnique: (...args: unknown[]) => mockClaimFindUnique(...args),
      update: (...args: unknown[]) => mockClaimUpdate(...args),
      delete: (...args: unknown[]) => mockClaimDelete(...args),
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
import { PATCH, DELETE } from "@/app/api/admin/claims/[claimId]/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makePatchRequest(claimId: string, body: Record<string, unknown>) {
  return new NextRequest(
    `http://localhost:3000/api/admin/claims/${claimId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function makeDeleteRequest(claimId: string) {
  return new NextRequest(
    `http://localhost:3000/api/admin/claims/${claimId}`,
    { method: "DELETE" },
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

const existingClaim = {
  id: "claim-1",
  title: "Creatine increases lean muscle mass",
  normalizedTitle: "creatine increases lean muscle mass",
  description: "A well-studied supplement.",
  difficulty: "EASY",
  market: {
    id: "market-1",
    status: "ACTIVE",
    yesVotes: 10,
    noVotes: 5,
    totalVotes: 15,
  },
};

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── PATCH ──────────────────────────────────────────────────────────────────

describe("PATCH /api/admin/claims/[claimId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(
      makePatchRequest("claim-1", { title: "Updated title for the test" }),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockResolvedValue(userSession);
    const res = await PATCH(
      makePatchRequest("claim-1", { title: "Updated title for the test" }),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when claim not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      makePatchRequest("missing", { difficulty: "HARD" }),
      makeParams("missing"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid input", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PATCH(
      makePatchRequest("claim-1", { difficulty: "IMPOSSIBLE" }),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(400);
  });

  it("updates claim fields successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique
      .mockResolvedValueOnce(existingClaim) // First call: existence check
      .mockResolvedValueOnce({ ...existingClaim, difficulty: "HARD" }); // Second call: full return

    mockClaimUpdate.mockResolvedValue({
      ...existingClaim,
      difficulty: "HARD",
    });

    const res = await PATCH(
      makePatchRequest("claim-1", { difficulty: "HARD" }),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(200);
    expect(mockClaimUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "claim-1" },
        data: { difficulty: "HARD" },
      }),
    );
  });

  it("updates market status when provided", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique
      .mockResolvedValueOnce(existingClaim)
      .mockResolvedValueOnce({
        ...existingClaim,
        market: { ...existingClaim.market, status: "RESOLVED" },
      });

    mockClaimUpdate.mockResolvedValue(existingClaim);
    mockMarketUpdate.mockResolvedValue({
      ...existingClaim.market,
      status: "RESOLVED",
    });

    const res = await PATCH(
      makePatchRequest("claim-1", { status: "RESOLVED" }),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(200);
    expect(mockMarketUpdate).toHaveBeenCalled();
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await PATCH(
      makePatchRequest("claim-1", { difficulty: "HARD" }),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(500);
  });
});

// ── DELETE ──────────────────────────────────────────────────────────────────

describe("DELETE /api/admin/claims/[claimId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest("claim-1"), makeParams("claim-1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockResolvedValue(userSession);
    const res = await DELETE(makeDeleteRequest("claim-1"), makeParams("claim-1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when claim not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique.mockResolvedValue(null);

    const res = await DELETE(makeDeleteRequest("missing"), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("deletes claim successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique.mockResolvedValue(existingClaim);
    mockClaimDelete.mockResolvedValue(existingClaim);

    const res = await DELETE(
      makeDeleteRequest("claim-1"),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.deleted).toBe(true);
    expect(data.id).toBe("claim-1");
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockClaimFindUnique.mockResolvedValue(existingClaim);
    mockClaimDelete.mockRejectedValue(new Error("DB down"));

    const res = await DELETE(
      makeDeleteRequest("claim-1"),
      makeParams("claim-1"),
    );
    expect(res.status).toBe(500);
  });
});
