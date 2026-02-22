/**
 * Tests for POST /api/claims/[claimId]/research
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockClaimFindUnique = vi.fn();
const mockDossierJobFindFirst = vi.fn();
const mockDossierJobCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claim: { findUnique: (...a: unknown[]) => mockClaimFindUnique(...a) },
    dossierJob: {
      findFirst: (...a: unknown[]) => mockDossierJobFindFirst(...a),
      create: (...a: unknown[]) => mockDossierJobCreate(...a),
    },
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const mockEnqueue = vi.fn();
vi.mock("@/lib/queue", () => ({
  enqueueDossierJob: (...a: unknown[]) => mockEnqueue(...a),
}));

import { POST } from "@/app/api/claims/[claimId]/research/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(claimId: string) {
  return new NextRequest(
    `http://localhost:3000/api/claims/${claimId}/research`,
    { method: "POST" },
  );
}

function makeParams(claimId: string) {
  return { params: Promise.resolve({ claimId }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/claims/[claimId]/research", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeReq("c1"), makeParams("c1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq("c1"), makeParams("c1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when claim not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isAdmin: true } });
    mockClaimFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq("c1"), makeParams("c1"));
    expect(res.status).toBe(404);
  });

  it("returns existing job if one is already in progress", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isAdmin: true } });
    mockClaimFindUnique.mockResolvedValue({ id: "c1" });
    mockDossierJobFindFirst.mockResolvedValue({ id: "job-existing", status: "RUNNING" });

    const res = await POST(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.jobId).toBe("job-existing");
    expect(body.status).toBe("RUNNING");
    expect(mockDossierJobCreate).not.toHaveBeenCalled();
  });

  it("creates a new dossier job and enqueues it", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isAdmin: true } });
    mockClaimFindUnique.mockResolvedValue({ id: "c1" });
    mockDossierJobFindFirst.mockResolvedValue(null);
    mockDossierJobCreate.mockResolvedValue({ id: "job-new" });
    mockEnqueue.mockResolvedValue({});

    const res = await POST(makeReq("c1"), makeParams("c1"));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.jobId).toBe("job-new");
    expect(body.status).toBe("QUEUED");
    expect(mockEnqueue).toHaveBeenCalledWith("c1", "u1");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isAdmin: true } });
    mockClaimFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(makeReq("c1"), makeParams("c1"));
    expect(res.status).toBe(500);
  });
});
