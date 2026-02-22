/**
 * Tests for GET /api/claims/[claimId]/research/status
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockDossierJobFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dossierJob: {
      findFirst: (...a: unknown[]) => mockDossierJobFindFirst(...a),
    },
  },
}));

import { GET } from "@/app/api/claims/[claimId]/research/status/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(claimId: string) {
  return new NextRequest(
    `http://localhost:3000/api/claims/${claimId}/research/status`,
  );
}
function makeParams(claimId: string) {
  return { params: Promise.resolve({ claimId }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/claims/[claimId]/research/status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns NONE when no job exists", async () => {
    mockDossierJobFindFirst.mockResolvedValue(null);
    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();
    expect(body.status).toBe("NONE");
    expect(body.progress).toBe(0);
  });

  it("returns progress with step label for a running job", async () => {
    mockDossierJobFindFirst.mockResolvedValue({
      id: "job-1",
      status: "RUNNING",
      progress: 45,
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      createdAt: new Date().toISOString(),
    });

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(body.status).toBe("RUNNING");
    expect(body.progress).toBe(45);
    expect(body.stepLabel).toBe("Generating embeddings");
  });

  it("returns Complete label for finished job", async () => {
    mockDossierJobFindFirst.mockResolvedValue({
      id: "job-1",
      status: "SUCCEEDED",
      progress: 100,
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(body.status).toBe("SUCCEEDED");
    expect(body.stepLabel).toBe("Complete");
  });

  it("returns error for failed job", async () => {
    mockDossierJobFindFirst.mockResolvedValue({
      id: "job-1",
      status: "FAILED",
      progress: 30,
      error: "PubMed connection failed",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    const res = await GET(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(body.status).toBe("FAILED");
    expect(body.error).toBe("PubMed connection failed");
  });

  it("maps progress to correct step labels", async () => {
    const progressLabels: [number, string][] = [
      [5, "Queued"],
      [12, "Loading claim"],
      [20, "Searching papers"],
      [27, "Deduplicating results"],
      [35, "Storing papers"],
      [50, "Generating embeddings"],
      [57, "Finding relevant passages"],
      [70, "Extracting evidence"],
      [90, "Synthesizing verdict"],
      [97, "Saving results"],
      [100, "Complete"],
    ];

    for (const [progress, expected] of progressLabels) {
      mockDossierJobFindFirst.mockResolvedValue({
        id: "job-1",
        status: "RUNNING",
        progress,
        error: null,
        startedAt: null,
        finishedAt: null,
        createdAt: new Date().toISOString(),
      });

      const res = await GET(makeReq("c1"), makeParams("c1"));
      const body = await res.json();
      expect(body.stepLabel).toBe(expected);
    }
  });

  it("returns 500 on unexpected error", async () => {
    mockDossierJobFindFirst.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeReq("c1"), makeParams("c1"));
    expect(res.status).toBe(500);
  });
});
