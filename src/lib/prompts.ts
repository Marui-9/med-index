/**
 * LLM Prompt Templates for RAG Evidence Extraction & Verdict Synthesis
 *
 * Two prompt pairs:
 *   A. Evidence Extraction — one call per paper per claim.
 *      Input : claim + paper abstract + optional relevant chunks.
 *      Output: structured evidence card (stance, summary, study type, …).
 *
 *   B. Verdict Synthesis — one call per claim after all evidence is gathered.
 *      Input : claim + all evidence cards.
 *      Output: overall verdict with confidence, caveats, recommendation.
 *
 * Both prompts request JSON output via `response_format: { type: "json_object" }`
 * and target gpt-4o-mini for cost efficiency.
 */

// ── Types ───────────────────────────────────────────────────────────────

/** Stance a paper takes relative to a claim */
export type EvidenceStance =
  | "SUPPORTS"
  | "CONTRADICTS"
  | "NEUTRAL"
  | "INSUFFICIENT";

/** Study design taxonomy */
export type StudyType =
  | "Meta-analysis"
  | "Systematic review"
  | "RCT"
  | "Cohort"
  | "Case-control"
  | "Cross-sectional"
  | "Animal study"
  | "In vitro"
  | "Expert opinion"
  | "Other";

/** Structured evidence extracted from a single paper */
export interface ExtractedEvidence {
  stance: EvidenceStance;
  confidence: number;
  summary: string;
  studyType: StudyType;
  sampleSize: number | null;
  population: string;
  duration: string;
  effectSize: string;
  keyFindings: string[];
  limitations: string[];
  relevanceScore: number;
}

/** Overall verdict direction */
export type VerdictOutcome =
  | "SUPPORTED"
  | "MIXED"
  | "INSUFFICIENT"
  | "CONTRADICTED";

export type EffectDirection = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "VARIABLE";

export type StrengthOfEvidence = "STRONG" | "MODERATE" | "WEAK" | "VERY_WEAK";

/** Synthesised verdict across all evidence for a claim */
export interface SynthesisVerdict {
  verdict: VerdictOutcome;
  confidence: number;
  effectDirection: EffectDirection;
  shortSummary: string;
  detailedSummary: string;
  strengthOfEvidence: StrengthOfEvidence;
  keyFactors: string[];
  caveats: string[];
  whatWouldChangeVerdict: string;
  recommendedAction: string;
}

// ── Input types (what the caller provides) ──────────────────────────────

export interface EvidenceExtractionInput {
  claimTitle: string;
  claimDescription?: string;
  paperTitle: string;
  paperAbstract?: string;
  /** Optional relevant text chunks retrieved via vector search */
  relevantChunks?: string[];
}

export interface EvidenceCardForSynthesis {
  paperTitle: string;
  publishedYear?: number;
  studyType: string;
  sampleSize: number | null;
  stance: string;
  summary: string;
  keyFindings: string[];
}

export interface VerdictSynthesisInput {
  claimTitle: string;
  evidenceCards: EvidenceCardForSynthesis[];
}

// ── System prompts ──────────────────────────────────────────────────────

export const EVIDENCE_EXTRACTION_SYSTEM = `You are a scientific evidence analyst specializing in exercise science, nutrition, and fitness research. Given a health/fitness claim and a research paper, extract structured evidence.

Respond with a single JSON object (no markdown fences, no commentary) matching this exact schema:
{
  "stance": "SUPPORTS" | "CONTRADICTS" | "NEUTRAL" | "INSUFFICIENT",
  "confidence": <number 0.0–1.0>,
  "summary": "<2–3 sentence summary of what the paper found>",
  "studyType": "Meta-analysis" | "Systematic review" | "RCT" | "Cohort" | "Case-control" | "Cross-sectional" | "Animal study" | "In vitro" | "Expert opinion" | "Other",
  "sampleSize": <integer or null>,
  "population": "<e.g. trained males, elderly women, sedentary adults>",
  "duration": "<e.g. 8 weeks, 12 months, or empty string if unclear>",
  "effectSize": "<e.g. +3.2 kg lean mass, -2.1% body fat, or empty string if not reported>",
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "limitations": ["<limitation 1>", "<limitation 2>"],
  "relevanceScore": <number 0.0–1.0, how directly relevant to the claim>
}

Rules:
- Base your analysis ONLY on the information provided. Do not hallucinate data.
- If the paper is not relevant to the claim, set stance to "INSUFFICIENT" and relevanceScore below 0.3.
- confidence reflects how certain the paper's evidence is (consider sample size, design, controls).
- relevanceScore reflects how directly the paper addresses the specific claim.`;

export const VERDICT_SYNTHESIS_SYSTEM = `You are a systematic review analyst for fitness and health claims. Given a claim and evidence extracted from multiple research papers, synthesize an overall verdict.

Consider:
- Study quality hierarchy: meta-analyses > RCTs > cohort studies > case studies > expert opinion
- Sample sizes and statistical significance
- Consistency of findings across studies
- Recency of evidence
- Population relevance to general fitness enthusiasts

Respond with a single JSON object (no markdown fences, no commentary) matching this exact schema:
{
  "verdict": "SUPPORTED" | "MIXED" | "INSUFFICIENT" | "CONTRADICTED",
  "confidence": <number 0.0–1.0>,
  "effectDirection": "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "VARIABLE",
  "shortSummary": "<1 sentence bottom-line verdict>",
  "detailedSummary": "<2–3 paragraph synthesis of the evidence>",
  "strengthOfEvidence": "STRONG" | "MODERATE" | "WEAK" | "VERY_WEAK",
  "keyFactors": ["<reason 1>", "<reason 2>"],
  "caveats": ["<caveat 1>", "<caveat 2>"],
  "whatWouldChangeVerdict": "<what new evidence could flip the verdict>",
  "recommendedAction": "<practical takeaway for a fitness enthusiast>"
}

Rules:
- Weight meta-analyses and systematic reviews more heavily than individual studies.
- If evidence is mixed, explain which direction the balance tilts and why.
- Be honest about limitations — do not overstate confidence.
- recommendedAction should be practical and understandable to a non-scientist.`;

// ── Prompt builders ─────────────────────────────────────────────────────

/**
 * Build the user prompt for evidence extraction (Prompt A).
 */
export function buildEvidenceExtractionPrompt(
  input: EvidenceExtractionInput
): string {
  const parts: string[] = [];

  parts.push(`Claim: "${input.claimTitle}"`);
  if (input.claimDescription) {
    parts.push(`Description: "${input.claimDescription}"`);
  }
  parts.push(""); // blank line

  parts.push(`Paper title: "${input.paperTitle}"`);
  if (input.paperAbstract) {
    parts.push(`Paper abstract: "${input.paperAbstract}"`);
  }

  if (input.relevantChunks?.length) {
    parts.push("");
    parts.push("Relevant excerpts from the paper:");
    parts.push(input.relevantChunks.join("\n---\n"));
  }

  parts.push("");
  parts.push("Extract structured evidence from this paper regarding the claim.");

  return parts.join("\n");
}

/**
 * Build the user prompt for verdict synthesis (Prompt B).
 */
export function buildVerdictSynthesisPrompt(
  input: VerdictSynthesisInput
): string {
  const parts: string[] = [];

  parts.push(`Claim: "${input.claimTitle}"`);
  parts.push("");
  parts.push(`Evidence from ${input.evidenceCards.length} papers:`);
  parts.push("");

  input.evidenceCards.forEach((card, i) => {
    const yearStr = card.publishedYear ? ` (${card.publishedYear})` : "";
    parts.push(`Paper ${i + 1}: ${card.paperTitle}${yearStr}`);
    parts.push(`- Study type: ${card.studyType}`);
    parts.push(`- Sample size: ${card.sampleSize ?? "not reported"}`);
    parts.push(`- Stance: ${card.stance}`);
    parts.push(`- Summary: ${card.summary}`);
    if (card.keyFindings.length > 0) {
      parts.push(`- Key findings: ${card.keyFindings.join("; ")}`);
    }
    parts.push("");
  });

  parts.push("Synthesize an overall verdict.");

  return parts.join("\n");
}
