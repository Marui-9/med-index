/**
 * Tests for GET /api/claims/[claimId]
 *
 * Mocks Prisma and auth to test the single-claim detail route handler.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockClaimFindUnique = vi.fn();
const mockVoteFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claim: {
      findUnique: (...args: unknown[]) => mockClaimFindUnique(...args),
    },
    claimVote: {
      findUnique: (...args: unknown[]) => mockVoteFindUnique(...args),
    },
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Import AFTER mocks
import { GET } from "@/app/api/claims/[claimId]/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(claimId: string) {
  return new NextRequest(`http://localhost:3000/api/claims/${claimId}`);
}

function makeParams(claimId: string) {
  return { params: Promise.resolve({ claimId }) };
}

const fullClaim = {
  id: "claim-1",
  title: "Creatine increases muscle mass",
  normalizedTitle: "creatine increases muscle mass",
  description: "Studies on creatine monohydrate supplementation.",
  difficulty: "MEDIUM",
  revealAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  market: {
    id: "market-1",
    status: "ACTIVE",
    yesVotes: 45,
    noVotes: 12,
    totalVotes: 57,
    aiVerdict: null,
    aiConfidence: null,
    consensusSummary: null,
    resolvedAt: null,
  },
  claimPapers: [],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/claims/[claimId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when claim does not exist", async () => {
    mockClaimFindUnique.mockResolvedValue(null);
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeRequest("nonexistent"), makeParams("nonexistent"));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("returns claim detail for anonymous user (no userVote)", async () => {
    mockClaimFindUnique.mockResolvedValue(fullClaim);
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeRequest("claim-1"), makeParams("claim-1"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe("Creatine increases muscle mass");
    expect(json.market.totalVotes).toBe(57);
    expect(json.userVote).toBeNull();
  });

  it("includes userVote when user is authenticated and has voted", async () => {
    const votedAt = new Date("2026-02-20T10:00:00Z");
    const revealAt = new Date("2026-02-20T16:00:00Z");

    mockClaimFindUnique.mockResolvedValue(fullClaim);
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockVoteFindUnique.mockResolvedValue({
      side: "YES",
      votedAt,
      revealAt,
      revealed: false,
    });

    const res = await GET(makeRequest("claim-1"), makeParams("claim-1"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.userVote).toBeDefined();
    expect(json.userVote.side).toBe("YES");
    expect(json.userVote.revealed).toBe(false);
  });

  it("returns userVote as null when user has not voted", async () => {
    mockClaimFindUnique.mockResolvedValue(fullClaim);
    mockAuth.mockResolvedValue({ user: { id: "user-2" } });
    mockVoteFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest("claim-1"), makeParams("claim-1"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.userVote).toBeNull();
  });

  it("includes claimPapers in response", async () => {
    const claimWithPapers = {
      ...fullClaim,
      claimPapers: [
        {
          id: "cp-1",
          stance: "SUPPORTS",
          aiSummary: "Strong evidence from RCT",
          studyType: "RCT",
          sampleSize: 200,
          paper: {
            title: "Creatine and muscle hypertrophy",
            journal: "J Sports Med",
            publishedYear: 2023,
            authors: ["Smith J", "Doe A"],
          },
        },
      ],
    };
    mockClaimFindUnique.mockResolvedValue(claimWithPapers);
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeRequest("claim-1"), makeParams("claim-1"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.claimPapers).toHaveLength(1);
    expect(json.claimPapers[0].paper.title).toBe("Creatine and muscle hypertrophy");
  });

  it("queries vote with correct compound key", async () => {
    mockClaimFindUnique.mockResolvedValue(fullClaim);
    mockAuth.mockResolvedValue({ user: { id: "user-99" } });
    mockVoteFindUnique.mockResolvedValue(null);

    await GET(makeRequest("claim-1"), makeParams("claim-1"));

    expect(mockVoteFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          claimId_userId: {
            claimId: "claim-1",
            userId: "user-99",
          },
        },
      }),
    );
  });

  it("returns 500 on database error", async () => {
    mockClaimFindUnique.mockRejectedValue(new Error("DB down"));
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeRequest("claim-1"), makeParams("claim-1"));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to fetch claim");
  });
});
