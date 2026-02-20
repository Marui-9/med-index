"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { VoteButtons } from "@/components/vote-buttons";

interface Market {
  id: string;
  status: string;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  aiVerdict?: string | null;
  aiConfidence?: number | null;
  consensusSummary?: string | null;
  resolvedAt?: string | null;
}

interface ClaimPaper {
  id: string;
  stance?: string | null;
  aiSummary?: string | null;
  studyType?: string | null;
  sampleSize?: number | null;
  paper: {
    title: string;
    journal?: string | null;
    publishedYear?: number | null;
    authors: string[];
  };
}

interface UserVote {
  side: string;
  votedAt: string;
  revealAt: string;
  revealed: boolean;
}

interface ClaimDetail {
  id: string;
  title: string;
  description?: string | null;
  difficulty: string;
  createdAt: string;
  market?: Market | null;
  claimPapers: ClaimPaper[];
  userVote?: UserVote | null;
}

const difficultyLabels: Record<string, { text: string; color: string }> = {
  EASY: { text: "Easy", color: "bg-green-100 text-green-800" },
  MEDIUM: { text: "Medium", color: "bg-yellow-100 text-yellow-800" },
  HARD: { text: "Hard", color: "bg-red-100 text-red-800" },
};

const stanceColors: Record<string, string> = {
  SUPPORTS: "border-green-500 bg-green-50",
  REFUTES: "border-red-500 bg-red-50",
  NEUTRAL: "border-yellow-500 bg-yellow-50",
};

export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);

  // Resolve async params
  useEffect(() => {
    params.then((p) => setClaimId(p.claimId));
  }, [params]);

  // Fetch claim detail
  useEffect(() => {
    if (!claimId) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/claims/${claimId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "not_found" : "error");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setClaim(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err.message === "not_found"
              ? "Claim not found."
              : "Failed to load claim.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [claimId]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-2/3 rounded bg-muted" />
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error || !claim) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="mb-4 text-2xl font-bold">
              {error === "Claim not found." ? "Claim Not Found" : "Error"}
            </h1>
            <p className="mb-6 text-muted-foreground">
              {error || "Something went wrong."}
            </p>
            <Link href="/claims" className="text-primary hover:underline">
              ← Back to Claims
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const market = claim.market;
  const voted = !!claim.userVote;
  const resolved = market?.status === "RESOLVED";
  const showPercentages =
    (voted || resolved) && market && market.totalVotes > 0;
  const yesPct = showPercentages
    ? Math.round((market.yesVotes / market.totalVotes) * 100)
    : null;
  const diff = difficultyLabels[claim.difficulty];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          {/* Breadcrumb */}
          <Link
            href="/claims"
            className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Claims
          </Link>

          {/* Title + Difficulty */}
          <div className="mb-4 flex items-start gap-3">
            <h1 className="text-3xl font-bold">{claim.title}</h1>
            {diff && (
              <span
                className={`mt-1 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${diff.color}`}
              >
                {diff.text}
              </span>
            )}
          </div>

          {claim.description && (
            <p className="mb-6 text-muted-foreground">{claim.description}</p>
          )}

          {/* Vote stats bar */}
          <div className="mb-6 rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium">
                {market?.totalVotes ?? 0} total votes
              </span>
              {showPercentages && (
                <span>
                  <span className="text-green-600">{yesPct}% YES</span>
                  {" / "}
                  <span className="text-red-600">{100 - yesPct!}% NO</span>
                </span>
              )}
              {!showPercentages && market && market.totalVotes > 0 && (
                <span className="text-xs text-muted-foreground">
                  Vote to see percentages
                </span>
              )}
            </div>

            {/* Percentage bar */}
            {showPercentages && (
              <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${yesPct}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${100 - yesPct!}%` }}
                />
              </div>
            )}

            {/* AI verdict */}
            {resolved && market?.aiVerdict && (
              <div className="mb-4 rounded-md bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  AI Verdict:{" "}
                  <span
                    className={
                      market.aiVerdict === "YES"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {market.aiVerdict}
                  </span>
                  {market.aiConfidence != null && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({Math.round(market.aiConfidence * 100)}% confidence)
                    </span>
                  )}
                </p>
                {market.consensusSummary && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {market.consensusSummary}
                  </p>
                )}
              </div>
            )}

            {/* Vote buttons */}
            <VoteButtons
              claimId={claim.id}
              userVote={
                claim.userVote
                  ? {
                      side: claim.userVote.side,
                      revealAt: claim.userVote.revealAt,
                      revealed: claim.userVote.revealed,
                    }
                  : undefined
              }
              marketStatus={market?.status}
            />
          </div>

          {/* Evidence Papers */}
          {claim.claimPapers.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">
                Evidence ({claim.claimPapers.length})
              </h2>
              <div className="space-y-3">
                {claim.claimPapers.map((cp) => (
                  <div
                    key={cp.id}
                    className={`rounded-lg border-l-4 p-4 ${
                      stanceColors[cp.stance ?? ""] ?? "border-muted bg-muted/30"
                    }`}
                  >
                    <p className="font-medium">{cp.paper.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {cp.paper.journal && `${cp.paper.journal} • `}
                      {cp.paper.publishedYear && `${cp.paper.publishedYear} • `}
                      {cp.studyType && `${cp.studyType}`}
                      {cp.sampleSize != null && ` • n=${cp.sampleSize}`}
                    </p>
                    {cp.aiSummary && (
                      <p className="mt-2 text-sm">{cp.aiSummary}</p>
                    )}
                    {cp.stance && (
                      <span className="mt-2 inline-block text-xs font-medium uppercase">
                        {cp.stance}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
