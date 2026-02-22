/**
 * Tests for GET /api/claims/[claimId]/verdict
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockMarketFindUnique = vi.fn();
const mockCreditEventFindFirst = vi.fn();
const mockAuth = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    market: { findUnique: (...a: unknown[]) => mockMarketFindUnique(...a) },
    creditEvent: {
      findFirst: (...a: unknown[]) => mockCreditEventFindFirst(...a),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: (...a: unknown[]) => mockAuth(...a),
}));

import { GET } from "@/app/api/claims/[claimId]/verdict/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(claimId: string) {
  return new NextRequest(
    new URL(`http://localhost:3000/api/claims/${claimId}/verdict`),
  );
}
function makeParams(claimId: string) {
  return { params: Promise.resolve({ claimId }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/claims/[claimId]/verdict", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when market not found", async () => {
    mockMarketFindUnique.mockResolvedValue(null);
    const res = await GET(makeReq("c1"), makeParams("c1"));
    expect(res.status).toBe(404);
  });

  it("returns available=false when aiConfidence is null", async () => {
    mockMarketFindUnique.mockResolvedValue({
      aiConfidence: null,
      aiVerdict: null,
      consensusSummary: null,
      lastDossierAt: null,
      status: "RESEARCHING",
    });

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.available).toBe(false);
    expect(body.status).toBe("RESEARCHING");
  });

  it("returns free tier (short summary) for unauthenticated user", async () => {
    mockMarketFindUnique.mockResolvedValue({
      aiConfidence: 0.85,
      aiVerdict: "YES",
      consensusSummary:
        "Creatine is well-supported for strength gains. Additional details here.",
      lastDossierAt: new Date().toISOString(),
      status: "ACTIVE",
    });
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(body.available).toBe(true);
    expect(body.verdict).toBe("Supported");
    expect(body.confidence).toBe(0.85);
    expect(body.unlocked).toBe(false);
    expect(body.shortSummary).toBe(
      "Creatine is well-supported for strength gains.",
    );
    expect(body.detailedSummary).toBeUndefined();
  });

  it("returns free tier for authenticated user without unlock", async () => {
    mockMarketFindUnique.mockResolvedValue({
      aiConfidence: 0.3,
      aiVerdict: "NO",
      consensusSummary: "Evidence contradicts this claim.",
      lastDossierAt: new Date().toISOString(),
      status: "ACTIVE",
    });
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockCreditEventFindFirst.mockResolvedValue(null);

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(body.verdict).toBe("Contradicted");
    expect(body.unlocked).toBe(false);
    expect(body.shortSummary).toBe("Evidence contradicts this claim.");
    expect(body.detailedSummary).toBeUndefined();
  });

  it("returns full detailed summary when unlocked", async () => {
    const detailed =
      "Creatine is well-supported for strength gains. The mechanism involves ATP regeneration. Multiple meta-analyses confirm this.";
    mockMarketFindUnique.mockResolvedValue({
      aiConfidence: 0.85,
      aiVerdict: "YES",
      consensusSummary: detailed,
      lastDossierAt: new Date().toISOString(),
      status: "ACTIVE",
    });
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockCreditEventFindFirst.mockResolvedValue({
      id: "ce-1",
      type: "DEEP_ANALYSIS_UNLOCK",
    });

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(body.unlocked).toBe(true);
    expect(body.detailedSummary).toBe(detailed);
    expect(body.shortSummary).toBeUndefined();
  });

  it("maps verdict labels correctly", async () => {
    const cases: [string | null, number, string][] = [
      ["YES", 0.9, "Supported"],
      ["NO", 0.7, "Contradicted"],
      [null, 0.5, "Mixed"],
      [null, 0.2, "Insufficient"],
    ];

    for (const [aiVerdict, aiConfidence, expected] of cases) {
      vi.clearAllMocks();
      mockMarketFindUnique.mockResolvedValue({
        aiConfidence,
        aiVerdict,
        consensusSummary: "Test summary sentence.",
        lastDossierAt: new Date().toISOString(),
        status: "ACTIVE",
      });
      mockAuth.mockResolvedValue(null);

      const res = await GET(makeReq("c1"), makeParams("c1"));
      const body = await res.json();
      expect(body.verdict).toBe(expected);
    }
  });

  it("handles extractFirstSentence edge case with no text", async () => {
    mockMarketFindUnique.mockResolvedValue({
      aiConfidence: 0.5,
      aiVerdict: null,
      consensusSummary: null,
      lastDossierAt: new Date().toISOString(),
      status: "ACTIVE",
    });
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(body.shortSummary).toBe("No summary available.");
  });

  it("returns 500 on unexpected error", async () => {
    mockMarketFindUnique.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeReq("c1"), makeParams("c1"));
    expect(res.status).toBe(500);
  });
});
