/**
 * Tests for EvidenceList component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EvidenceCardData } from "@/components/evidence-card";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { EvidenceList } from "@/components/evidence-list";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEvidence(id: string, title: string): EvidenceCardData {
  return {
    id,
    paperId: `p-${id}`,
    paperTitle: title,
    doi: "10.1/test",
    pmid: null,
    arxivId: null,
    journal: "J Test",
    publishedYear: 2023,
    authors: ["Author A"],
    fullTextUrl: null,
    studyType: "RCT",
    stance: "SUPPORTS",
    summary: "Test summary.",
    abstractSnippet: null,
    sampleSize: 100,
    confidenceScore: 0.8,
  };
}

function mockSuccessResponse(evidence: EvidenceCardData[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ claimId: "c1", count: evidence.length, evidence }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("EvidenceList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading skeleton while fetching", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<EvidenceList claimId="c1" />);
    expect(screen.getByTestId("evidence-skeleton")).toBeInTheDocument();
  });

  it("fetches and renders evidence cards", async () => {
    mockSuccessResponse([
      makeEvidence("1", "Creatine for strength"),
      makeEvidence("2", "Beta-alanine for endurance"),
    ]);

    render(<EvidenceList claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByText("Creatine for strength")).toBeInTheDocument();
    });
    expect(screen.getByText("Beta-alanine for endurance")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-list")).toBeInTheDocument();
  });

  it("shows empty state when no evidence exists", async () => {
    mockSuccessResponse([]);

    render(<EvidenceList claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByText("No evidence found")).toBeInTheDocument();
    });
  });

  it("shows error with retry button on fetch failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<EvidenceList claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByText("Failed to load evidence")).toBeInTheDocument();
    });

    // Retry
    mockSuccessResponse([makeEvidence("1", "Recovered paper")]);
    await user.click(screen.getByText("Retry"));
    await waitFor(() => {
      expect(screen.getByText("Recovered paper")).toBeInTheDocument();
    });
  });

  it("skips fetch when initialData is provided", () => {
    render(
      <EvidenceList
        claimId="c1"
        initialData={[makeEvidence("1", "Pre-loaded paper")]}
      />,
    );
    expect(screen.getByText("Pre-loaded paper")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("re-fetches when sort option changes", async () => {
    const user = userEvent.setup();
    mockSuccessResponse([makeEvidence("1", "Paper A")]);

    render(<EvidenceList claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByText("Paper A")).toBeInTheDocument();
    });

    // Change sort
    mockSuccessResponse([makeEvidence("2", "Paper B")]);
    await user.selectOptions(
      screen.getByLabelText("Sort evidence"),
      "recency",
    );

    await waitFor(() => {
      expect(screen.getByText("Paper B")).toBeInTheDocument();
    });

    // Verify recency sort was used in fetch URL
    const lastCall = mockFetch.mock.calls.at(-1)?.[0] as string;
    expect(lastCall).toContain("sort=recency");
  });

  it("re-fetches when stance filter changes", async () => {
    const user = userEvent.setup();
    mockSuccessResponse([makeEvidence("1", "Paper A")]);

    render(<EvidenceList claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByText("Paper A")).toBeInTheDocument();
    });

    // Change filter
    mockSuccessResponse([makeEvidence("2", "Supporting paper")]);
    await user.selectOptions(
      screen.getByLabelText("Filter by stance"),
      "SUPPORTS",
    );

    await waitFor(() => {
      expect(screen.getByText("Supporting paper")).toBeInTheDocument();
    });

    const lastCall = mockFetch.mock.calls.at(-1)?.[0] as string;
    expect(lastCall).toContain("stance=SUPPORTS");
  });

  it("shows count in header after loading", async () => {
    mockSuccessResponse([
      makeEvidence("1", "Paper 1"),
      makeEvidence("2", "Paper 2"),
      makeEvidence("3", "Paper 3"),
    ]);

    render(<EvidenceList claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByText("(3)")).toBeInTheDocument();
    });
  });
});
