/**
 * Tests for EvidenceCard component (pure presentational).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvidenceCard, type EvidenceCardData } from "@/components/evidence-card";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEvidence(overrides: Partial<EvidenceCardData> = {}): EvidenceCardData {
  return {
    id: "cp-1",
    paperId: "p-1",
    paperTitle: "Creatine Supplementation and Muscle Hypertrophy",
    doi: "10.1123/test",
    pmid: "12345",
    arxivId: null,
    journal: "J Sports Med",
    publishedYear: 2023,
    authors: ["Smith J", "Doe A"],
    fullTextUrl: null,
    studyType: "Meta-analysis",
    stance: "SUPPORTS",
    summary: "Strong evidence supports creatine for strength gains.",
    abstractSnippet: "This meta-analysis examined...",
    sampleSize: 500,
    confidenceScore: 0.88,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("EvidenceCard", () => {
  it("renders paper title and summary", () => {
    render(<EvidenceCard evidence={makeEvidence()} />);
    expect(
      screen.getByText("Creatine Supplementation and Muscle Hypertrophy"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Strong evidence supports creatine for strength gains."),
    ).toBeInTheDocument();
  });

  it("displays stance badge with correct label", () => {
    render(<EvidenceCard evidence={makeEvidence({ stance: "REFUTES" })} />);
    expect(screen.getByTestId("stance-badge")).toHaveTextContent("Refutes");
  });

  it("displays study type badge", () => {
    render(<EvidenceCard evidence={makeEvidence({ studyType: "RCT" })} />);
    expect(screen.getByTestId("study-type-badge")).toHaveTextContent("RCT");
  });

  it("shows journal, year, and sample size", () => {
    render(<EvidenceCard evidence={makeEvidence()} />);
    expect(screen.getByText("J Sports Med")).toBeInTheDocument();
    expect(screen.getByText("(2023)")).toBeInTheDocument();
    expect(screen.getByText("n=500")).toBeInTheDocument();
  });

  it("links to DOI when no fullTextUrl is provided", () => {
    render(
      <EvidenceCard
        evidence={makeEvidence({ fullTextUrl: null, doi: "10.1/test" })}
      />,
    );
    const link = screen.getByText("View paper →");
    expect(link).toHaveAttribute("href", "https://doi.org/10.1/test");
  });

  it("prefers fullTextUrl over DOI", () => {
    render(
      <EvidenceCard
        evidence={makeEvidence({
          fullTextUrl: "https://example.com/paper.pdf",
          doi: "10.1/test",
        })}
      />,
    );
    const link = screen.getByText("View paper →");
    expect(link).toHaveAttribute("href", "https://example.com/paper.pdf");
  });

  it("falls back to PubMed link when only pmid is available", () => {
    render(
      <EvidenceCard
        evidence={makeEvidence({
          fullTextUrl: null,
          doi: null,
          pmid: "99999",
        })}
      />,
    );
    const link = screen.getByText("View paper →");
    expect(link).toHaveAttribute(
      "href",
      "https://pubmed.ncbi.nlm.nih.gov/99999/",
    );
  });

  it("hides View paper link when no identifiers exist", () => {
    render(
      <EvidenceCard
        evidence={makeEvidence({
          fullTextUrl: null,
          doi: null,
          pmid: null,
          arxivId: null,
        })}
      />,
    );
    expect(screen.queryByText("View paper →")).toBeNull();
  });

  it("hides stance badge when stance is null", () => {
    render(<EvidenceCard evidence={makeEvidence({ stance: null })} />);
    expect(screen.queryByTestId("stance-badge")).toBeNull();
  });

  it("shows confidence score when available", () => {
    render(<EvidenceCard evidence={makeEvidence({ confidenceScore: 0.75 })} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("has data-testid evidence-card on wrapper", () => {
    render(<EvidenceCard evidence={makeEvidence()} />);
    expect(screen.getByTestId("evidence-card")).toBeInTheDocument();
  });
});
