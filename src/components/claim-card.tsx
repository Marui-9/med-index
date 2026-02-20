"use client";

import Link from "next/link";
import { VoteButtons } from "@/components/vote-buttons";

export interface ClaimCardProps {
  claim: {
    id: string;
    title: string;
    description?: string | null;
    difficulty: string;
    market?: {
      status: string;
      totalVotes: number;
      yesVotes: number;
      noVotes: number;
      aiVerdict?: string | null;
      aiConfidence?: number | null;
    } | null;
  };
  /** Pre-loaded user vote (from claims list fetch or detail API) */
  userVote?: { side: string; revealAt: string; revealed: boolean } | null;
}

const difficultyColors: Record<string, string> = {
  EASY: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HARD: "bg-red-100 text-red-800",
};

export function ClaimCard({ claim, userVote }: ClaimCardProps) {
  const market = claim.market;
  const voted = !!userVote;
  const resolved = market?.status === "RESOLVED";

  // Only show percentages after the user has voted or the claim is resolved
  const showPercentages = (voted || resolved) && market && market.totalVotes > 0;
  const yesPct = showPercentages
    ? Math.round((market.yesVotes / market.totalVotes) * 100)
    : null;

  return (
    <div className="rounded-lg border p-6 transition-colors hover:bg-muted/30">
      <div className="mb-3 flex items-start justify-between gap-4">
        <Link
          href={`/claims/${claim.id}`}
          className="text-xl font-semibold hover:text-primary"
        >
          {claim.title}
        </Link>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            difficultyColors[claim.difficulty] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {claim.difficulty}
        </span>
      </div>

      {claim.description && (
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
          {claim.description}
        </p>
      )}

      <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
        <span>{market?.totalVotes ?? 0} votes</span>
        {showPercentages && (
          <>
            <span>•</span>
            <span className="text-green-600">{yesPct}% YES</span>
            <span className="text-red-600">{100 - yesPct!}% NO</span>
          </>
        )}
        {resolved && market?.aiVerdict && (
          <>
            <span>•</span>
            <span className="font-medium">
              AI: {market.aiVerdict}
              {market.aiConfidence != null &&
                ` (${Math.round(market.aiConfidence * 100)}%)`}
            </span>
          </>
        )}
      </div>

      <VoteButtons
        claimId={claim.id}
        userVote={userVote}
        marketStatus={market?.status}
      />
    </div>
  );
}
