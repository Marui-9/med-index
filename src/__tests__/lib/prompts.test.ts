/**
 * Tests for RAG prompt templates (src/lib/prompts.ts)
 *
 * Validates prompt builder output, ensuring correct structure, field
 * inclusion/exclusion, and that system prompts contain required schema keys.
 */
import { describe, it, expect } from "vitest";
import {
  buildEvidenceExtractionPrompt,
  buildVerdictSynthesisPrompt,
  EVIDENCE_EXTRACTION_SYSTEM,
  VERDICT_SYNTHESIS_SYSTEM,
} from "@/lib/prompts";
import type {
  EvidenceExtractionInput,
  EvidenceCardForSynthesis,
} from "@/lib/prompts";

// ── System prompts ──────────────────────────────────────────────────────

describe("system prompts", () => {
  it("evidence extraction system prompt requests JSON with all required keys", () => {
    const requiredKeys = [
      "stance",
      "confidence",
      "summary",
      "studyType",
      "sampleSize",
      "population",
      "duration",
      "effectSize",
      "keyFindings",
      "limitations",
      "relevanceScore",
    ];
    for (const key of requiredKeys) {
      expect(EVIDENCE_EXTRACTION_SYSTEM).toContain(`"${key}"`);
    }
  });

  it("verdict synthesis system prompt requests JSON with all required keys", () => {
    const requiredKeys = [
      "verdict",
      "confidence",
      "effectDirection",
      "shortSummary",
      "detailedSummary",
      "strengthOfEvidence",
      "keyFactors",
      "caveats",
      "whatWouldChangeVerdict",
      "recommendedAction",
    ];
    for (const key of requiredKeys) {
      expect(VERDICT_SYNTHESIS_SYSTEM).toContain(`"${key}"`);
    }
  });

  it("evidence extraction system prompt mentions study quality hierarchy", () => {
    expect(EVIDENCE_EXTRACTION_SYSTEM).toContain("INSUFFICIENT");
    expect(EVIDENCE_EXTRACTION_SYSTEM).toContain("relevanceScore");
  });

  it("verdict synthesis system prompt mentions study quality hierarchy", () => {
    expect(VERDICT_SYNTHESIS_SYSTEM).toContain("meta-analyses");
    expect(VERDICT_SYNTHESIS_SYSTEM).toContain("RCTs");
  });
});

// ── buildEvidenceExtractionPrompt ───────────────────────────────────────

describe("buildEvidenceExtractionPrompt", () => {
  const baseInput: EvidenceExtractionInput = {
    claimTitle: "Creatine increases lean muscle mass",
    paperTitle: "Effects of creatine on body composition",
    paperAbstract: "This RCT examined 50 trained males over 8 weeks.",
  };

  it("includes claim title in quotes", () => {
    const prompt = buildEvidenceExtractionPrompt(baseInput);
    expect(prompt).toContain('Claim: "Creatine increases lean muscle mass"');
  });

  it("includes paper title and abstract", () => {
    const prompt = buildEvidenceExtractionPrompt(baseInput);
    expect(prompt).toContain(
      'Paper title: "Effects of creatine on body composition"'
    );
    expect(prompt).toContain("This RCT examined 50 trained males");
  });

  it("includes claim description when provided", () => {
    const prompt = buildEvidenceExtractionPrompt({
      ...baseInput,
      claimDescription: "Specifically creatine monohydrate at 5g/day.",
    });
    expect(prompt).toContain("Description:");
    expect(prompt).toContain("creatine monohydrate at 5g/day");
  });

  it("omits description when not provided", () => {
    const prompt = buildEvidenceExtractionPrompt(baseInput);
    expect(prompt).not.toContain("Description:");
  });

  it("includes relevant chunks separated by ---", () => {
    const prompt = buildEvidenceExtractionPrompt({
      ...baseInput,
      relevantChunks: ["Chunk A text", "Chunk B text"],
    });
    expect(prompt).toContain("Relevant excerpts");
    expect(prompt).toContain("Chunk A text");
    expect(prompt).toContain("---");
    expect(prompt).toContain("Chunk B text");
  });

  it("omits chunks section when no chunks provided", () => {
    const prompt = buildEvidenceExtractionPrompt(baseInput);
    expect(prompt).not.toContain("Relevant excerpts");
    expect(prompt).not.toContain("---");
  });

  it("ends with extraction instruction", () => {
    const prompt = buildEvidenceExtractionPrompt(baseInput);
    expect(prompt).toContain(
      "Extract structured evidence from this paper regarding the claim."
    );
  });
});

// ── buildVerdictSynthesisPrompt ─────────────────────────────────────────

describe("buildVerdictSynthesisPrompt", () => {
  const cards: EvidenceCardForSynthesis[] = [
    {
      paperTitle: "Creatine RCT",
      publishedYear: 2023,
      studyType: "RCT",
      sampleSize: 50,
      stance: "SUPPORTS",
      summary: "Significant lean mass gain.",
      keyFindings: ["+1.4 kg lean mass", "No adverse effects"],
    },
    {
      paperTitle: "Creatine Review",
      studyType: "Meta-analysis",
      sampleSize: null,
      stance: "SUPPORTS",
      summary: "Consistent benefit across studies.",
      keyFindings: [],
    },
  ];

  it("includes claim title", () => {
    const prompt = buildVerdictSynthesisPrompt({
      claimTitle: "Creatine increases lean muscle mass",
      evidenceCards: cards,
    });
    expect(prompt).toContain('"Creatine increases lean muscle mass"');
  });

  it("includes paper count", () => {
    const prompt = buildVerdictSynthesisPrompt({
      claimTitle: "Test",
      evidenceCards: cards,
    });
    expect(prompt).toContain("Evidence from 2 papers:");
  });

  it("numbers each paper", () => {
    const prompt = buildVerdictSynthesisPrompt({
      claimTitle: "Test",
      evidenceCards: cards,
    });
    expect(prompt).toContain("Paper 1: Creatine RCT (2023)");
    expect(prompt).toContain("Paper 2: Creatine Review");
  });

  it("shows 'not reported' for null sample size", () => {
    const prompt = buildVerdictSynthesisPrompt({
      claimTitle: "Test",
      evidenceCards: cards,
    });
    expect(prompt).toContain("Sample size: not reported");
  });

  it("includes key findings when present", () => {
    const prompt = buildVerdictSynthesisPrompt({
      claimTitle: "Test",
      evidenceCards: cards,
    });
    expect(prompt).toContain("+1.4 kg lean mass; No adverse effects");
  });

  it("omits key findings line when empty", () => {
    const prompt = buildVerdictSynthesisPrompt({
      claimTitle: "Test",
      evidenceCards: [cards[1]], // has empty keyFindings
    });
    expect(prompt).not.toContain("Key findings:");
  });

  it("ends with synthesis instruction", () => {
    const prompt = buildVerdictSynthesisPrompt({
      claimTitle: "Test",
      evidenceCards: cards,
    });
    expect(prompt).toContain("Synthesize an overall verdict.");
  });

  it("omits year when not provided", () => {
    const prompt = buildVerdictSynthesisPrompt({
      claimTitle: "Test",
      evidenceCards: [cards[1]], // no publishedYear
    });
    expect(prompt).toContain("Paper 1: Creatine Review\n");
    expect(prompt).not.toContain("(undefined)");
  });
});
