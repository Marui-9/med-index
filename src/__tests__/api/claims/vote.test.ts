/**
 * Tests for POST /api/claims/[claimId]/vote
 *
 * Mocks Prisma, auth, and coin-service to test the vote route handler.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockClaimFindUnique = vi.fn();
const mockVoteFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claim: {
      findUnique: (...args: unknown[]) => mockClaimFindUnique(...args),
    },
    claimVote: {
      findUnique: (...args: unknown[]) => mockVoteFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockSpendVoteCoins = vi.fn();
vi.mock("@/lib/coin-service", () => ({
  spendVoteCoins: (...args: unknown[]) => mockSpendVoteCoins(...args),
}));

// Import AFTER mocks
import { POST } from "@/app/api/claims/[claimId]/vote/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(claimId: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/claims/${claimId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(claimId: string) {
  return { params: Promise.resolve({ claimId }) };
}

const activeClaim = {
  id: "claim-1",
  title: "Creatine increases muscle mass",
  market: { status: "ACTIVE" },
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/claims/[claimId]/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      makeRequest("claim-1", { side: "YES" }),
      makeParams("claim-1"),
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when side is invalid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(
      makeRequest("claim-1", { side: "MAYBE" }),
      makeParams("claim-1"),
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when claim does not exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockClaimFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest("nonexistent", { side: "YES" }),
      makeParams("nonexistent"),
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("returns 400 when claim is not ACTIVE", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockClaimFindUnique.mockResolvedValue({
      id: "claim-1",
      market: { status: "RESEARCHING" },
    });

    const res = await POST(
      makeRequest("claim-1", { side: "YES" }),
      makeParams("claim-1"),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/not open for voting/i);
  });

  it("returns 400 when claim has no market", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockClaimFindUnique.mockResolvedValue({
      id: "claim-1",
      market: null,
    });

    const res = await POST(
      makeRequest("claim-1", { side: "NO" }),
      makeParams("claim-1"),
    );

    expect(res.status).toBe(400);
  });

  it("returns 409 when user has already voted", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockClaimFindUnique.mockResolvedValue(activeClaim);
    mockVoteFindUnique.mockResolvedValue({
      id: "vote-1",
      side: "YES",
    });

    const res = await POST(
      makeRequest("claim-1", { side: "YES" }),
      makeParams("claim-1"),
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already voted/i);
  });

  it("returns 400 when user has insufficient credits", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockClaimFindUnique.mockResolvedValue(activeClaim);
    mockVoteFindUnique.mockResolvedValue(null);
    mockSpendVoteCoins.mockResolvedValue({
      success: false,
      error: "Insufficient credits: 0 available, 1 required",
    });

    const res = await POST(
      makeRequest("claim-1", { side: "YES" }),
      makeParams("claim-1"),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/insufficient/i);
  });

  it("creates vote, updates market, and returns 201 on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockClaimFindUnique.mockResolvedValue(activeClaim);
    mockVoteFindUnique.mockResolvedValue(null);
    mockSpendVoteCoins.mockResolvedValue({
      success: true,
      newBalance: 4,
      eventId: "evt-1",
    });

    const now = new Date("2026-02-20T12:00:00Z");
    vi.setSystemTime(now);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        claimVote: {
          create: vi.fn().mockResolvedValue({
            id: "vote-new",
            side: "YES",
            votedAt: now,
            revealAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
          }),
        },
        market: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });

    const res = await POST(
      makeRequest("claim-1", { side: "YES" }),
      makeParams("claim-1"),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.vote.side).toBe("YES");
    expect(json.vote.id).toBe("vote-new");
    expect(json.newBalance).toBe(4);

    // Verify coin deduction was called
    expect(mockSpendVoteCoins).toHaveBeenCalledWith("user-1", "claim-1");

    vi.useRealTimers();
  });

  it("calls spendVoteCoins before creating the vote", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2" } });
    mockClaimFindUnique.mockResolvedValue(activeClaim);
    mockVoteFindUnique.mockResolvedValue(null);

    // Coins fail → transaction should NOT be called
    mockSpendVoteCoins.mockResolvedValue({
      success: false,
      error: "Insufficient credits",
    });

    await POST(
      makeRequest("claim-1", { side: "NO" }),
      makeParams("claim-1"),
    );

    expect(mockSpendVoteCoins).toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("accepts NO side", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockClaimFindUnique.mockResolvedValue(activeClaim);
    mockVoteFindUnique.mockResolvedValue(null);
    mockSpendVoteCoins.mockResolvedValue({
      success: true,
      newBalance: 9,
      eventId: "evt-2",
    });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        claimVote: {
          create: vi.fn().mockResolvedValue({
            id: "vote-no",
            side: "NO",
            votedAt: new Date(),
            revealAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
          }),
        },
        market: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });

    const res = await POST(
      makeRequest("claim-1", { side: "NO" }),
      makeParams("claim-1"),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.vote.side).toBe("NO");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockClaimFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(
      makeRequest("claim-1", { side: "YES" }),
      makeParams("claim-1"),
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to submit vote");
  });
});
