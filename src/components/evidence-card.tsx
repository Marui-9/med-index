"use client";

export interface EvidenceCardData {
  id: string;
  paperId: string;
  paperTitle: string;
  doi?: string | null;
  pmid?: string | null;
  arxivId?: string | null;
  journal?: string | null;
  publishedYear?: number | null;
  authors?: string[];
  fullTextUrl?: string | null;
  studyType?: string | null;
  stance?: string | null;
  summary?: string | null;
  abstractSnippet?: string | null;
  sampleSize?: number | null;
  confidenceScore?: number | null;
}

export interface EvidenceCardProps {
  evidence: EvidenceCardData;
}

const stanceStyles: Record<string, { bg: string; text: string; label: string }> = {
  SUPPORTS: { bg: "bg-green-100", text: "text-green-800", label: "Supports" },
  REFUTES: { bg: "bg-red-100", text: "text-red-800", label: "Refutes" },
  NEUTRAL: { bg: "bg-gray-100", text: "text-gray-600", label: "Neutral" },
};

const studyTypeBadgeColors: Record<string, string> = {
  "Meta-analysis": "bg-purple-100 text-purple-800",
  "Systematic review": "bg-purple-100 text-purple-800",
  "RCT": "bg-blue-100 text-blue-800",
  "Cohort": "bg-sky-100 text-sky-800",
  "Case-control": "bg-teal-100 text-teal-800",
  "Cross-sectional": "bg-cyan-100 text-cyan-800",
  "Animal study": "bg-amber-100 text-amber-800",
  "In vitro": "bg-orange-100 text-orange-800",
  "Expert opinion": "bg-gray-100 text-gray-600",
  "Other": "bg-gray-100 text-gray-600",
};

/**
 * Build a link to the original paper source.
 */
function getPaperLink(evidence: EvidenceCardData): string | null {
  if (evidence.fullTextUrl) return evidence.fullTextUrl;
  if (evidence.doi) return `https://doi.org/${evidence.doi}`;
  if (evidence.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${evidence.pmid}/`;
  if (evidence.arxivId) return `https://arxiv.org/abs/${evidence.arxivId}`;
  return null;
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const stanceInfo = evidence.stance
    ? stanceStyles[evidence.stance] ?? stanceStyles.NEUTRAL
    : null;

  const studyBadgeColor = evidence.studyType
    ? studyTypeBadgeColors[evidence.studyType] ?? "bg-gray-100 text-gray-600"
    : null;

  const paperLink = getPaperLink(evidence);

  return (
    <div
      className="rounded-lg border p-4 transition-colors hover:bg-muted/20"
      data-testid="evidence-card"
    >
      {/* Header: title + badges */}
      <div className="mb-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium leading-tight">
            {paperLink ? (
              <a
                href={paperLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline"
              >
                {evidence.paperTitle}
              </a>
            ) : (
              evidence.paperTitle
            )}
          </h4>
          {stanceInfo && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${stanceInfo.bg} ${stanceInfo.text}`}
              data-testid="stance-badge"
            >
              {stanceInfo.label}
            </span>
          )}
        </div>

        {/* Meta line: journal, year, study type */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {evidence.journal && <span>{evidence.journal}</span>}
          {evidence.publishedYear && <span>({evidence.publishedYear})</span>}
          {evidence.studyType && studyBadgeColor && (
            <span
              className={`rounded px-1.5 py-0.5 font-medium ${studyBadgeColor}`}
              data-testid="study-type-badge"
            >
              {evidence.studyType}
            </span>
          )}
          {evidence.sampleSize != null && (
            <span>n={evidence.sampleSize.toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* AI summary */}
      {evidence.summary && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {evidence.summary}
        </p>
      )}

      {/* Confidence score */}
      {evidence.confidenceScore != null && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">AI confidence:</span>
          <div className="h-1.5 flex-1 max-w-[100px] rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.round(evidence.confidenceScore * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(evidence.confidenceScore * 100)}%
          </span>
        </div>
      )}

      {/* External link */}
      {paperLink && (
        <div className="mt-2">
          <a
            href={paperLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View paper →
          </a>
        </div>
      )}
    </div>
  );
}
