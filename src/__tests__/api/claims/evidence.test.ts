/**
 * Tests for GET /api/claims/[claimId]/evidence
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockClaimFindUnique = vi.fn();
const mockClaimPaperFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claim: { findUnique: (...a: unknown[]) => mockClaimFindUnique(...a) },
    claimPaper: { findMany: (...a: unknown[]) => mockClaimPaperFindMany(...a) },
  },
}));

import { GET } from "@/app/api/claims/[claimId]/evidence/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(claimId: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost:3000/api/claims/${claimId}/evidence`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}
function makeParams(claimId: string) {
  return { params: Promise.resolve({ claimId }) };
}

const FAKE_CLAIM_PAPER = {
  id: "cp-1",
  claimId: "c1",
  paperId: "p1",
  studyType: "Meta-analysis",
  stance: "SUPPORTS",
  aiSummary: "Strong evidence for creatine.",
  abstractSnippet: "This meta-analysis...",
  sampleSize: 500,
  confidenceScore: 0.9,
  extractionVersion: "v1",
  createdAt: new Date().toISOString(),
  paper: {
    id: "p1",
    title: "Creatine Meta-Analysis",
    doi: "10.1/test",
    pmid: "12345",
    arxivId: null,
    journal: "J Sports Med",
    publishedYear: 2023,
    authors: ["Smith J"],
    fullTextUrl: "https://example.com/paper.pdf",
  },
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/claims/[claimId]/evidence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when claim not found", async () => {
    mockClaimFindUnique.mockResolvedValue(null);
    const res = await GET(makeReq("c1"), makeParams("c1"));
    expect(res.status).toBe(404);
  });

  it("returns evidence cards for a claim", async () => {
    mockClaimFindUnique.mockResolvedValue({ id: "c1" });
    mockClaimPaperFindMany.mockResolvedValue([FAKE_CLAIM_PAPER]);

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.evidence[0].paperTitle).toBe("Creatine Meta-Analysis");
    expect(body.evidence[0].stance).toBe("SUPPORTS");
    expect(body.evidence[0].studyType).toBe("Meta-analysis");
    expect(body.evidence[0].doi).toBe("10.1/test");
  });

  it("returns empty array when no evidence exists", async () => {
    mockClaimFindUnique.mockResolvedValue({ id: "c1" });
    mockClaimPaperFindMany.mockResolvedValue([]);

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(body.count).toBe(0);
    expect(body.evidence).toEqual([]);
  });

  it("accepts stance filter parameter", async () => {
    mockClaimFindUnique.mockResolvedValue({ id: "c1" });
    mockClaimPaperFindMany.mockResolvedValue([]);

    await GET(makeReq("c1", { stance: "SUPPORTS" }), makeParams("c1"));

    // Check that the where clause includes stance filter
    const findManyArgs = mockClaimPaperFindMany.mock.calls[0][0];
    expect(findManyArgs.where.stance).toBe("SUPPORTS");
  });

  it("accepts sort parameter", async () => {
    mockClaimFindUnique.mockResolvedValue({ id: "c1" });
    mockClaimPaperFindMany.mockResolvedValue([]);

    await GET(makeReq("c1", { sort: "recency" }), makeParams("c1"));

    const findManyArgs = mockClaimPaperFindMany.mock.calls[0][0];
    expect(findManyArgs.orderBy).toEqual({ createdAt: "desc" });
  });

  it("defaults to relevance sort", async () => {
    mockClaimFindUnique.mockResolvedValue({ id: "c1" });
    mockClaimPaperFindMany.mockResolvedValue([]);

    await GET(makeReq("c1"), makeParams("c1"));

    const findManyArgs = mockClaimPaperFindMany.mock.calls[0][0];
    expect(findManyArgs.orderBy).toEqual({ confidenceScore: "desc" });
  });

  it("returns 400 for invalid stance filter", async () => {
    const res = await GET(
      makeReq("c1", { stance: "INVALID" }),
      makeParams("c1"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected error", async () => {
    mockClaimFindUnique.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeReq("c1"), makeParams("c1"));
    expect(res.status).toBe(500);
  });
});
