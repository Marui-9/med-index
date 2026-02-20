"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export interface VoteButtonsProps {
  claimId: string;
  /** If the user already voted, their existing vote */
  userVote?: { side: string; revealAt: string; revealed: boolean } | null;
  /** Market status — only ACTIVE claims accept votes */
  marketStatus?: string;
  /** Callback after successful vote */
  onVoted?: (vote: { side: string; revealAt: string }, newBalance: number) => void;
}

/**
 * YES / NO vote buttons for a claim.
 *
 * States:
 *  1. Not signed in → prompt to sign in
 *  2. Already voted → show "You voted YES/NO" + reveal timer
 *  3. Market not active → disabled with explanation
 *  4. Ready to vote → green YES / red NO buttons
 *  5. Submitting → loading spinner
 *  6. Error → inline error message
 */
export function VoteButtons({
  claimId,
  userVote,
  marketStatus,
  onVoted,
}: VoteButtonsProps) {
  const { data: session, status: authStatus } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localVote, setLocalVote] = useState<{
    side: string;
    revealAt: string;
  } | null>(null);

  const vote = localVote ?? userVote;

  // ── Already voted ──────────────────────────────────────────────────────
  if (vote) {
    const revealDate = new Date(vote.revealAt);
    const canReveal = new Date() >= revealDate;

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">
          You voted{" "}
          <span
            className={
              vote.side === "YES" ? "text-green-600" : "text-red-600"
            }
          >
            {vote.side}
          </span>
        </p>
        {canReveal ? (
          <Link
            href={`/claims/${claimId}`}
            className="text-sm text-primary hover:underline"
          >
            View results →
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground">
            Results available{" "}
            <time dateTime={revealDate.toISOString()}>
              {revealDate.toLocaleString()}
            </time>
          </p>
        )}
      </div>
    );
  }

  // ── Not signed in ──────────────────────────────────────────────────────
  if (authStatus !== "loading" && !session?.user) {
    return (
      <div className="space-y-2">
        <div className="flex gap-3">
          <button
            disabled
            className="rounded-md bg-green-600/50 px-6 py-2 text-sm font-medium text-white"
          >
            YES (1 credit)
          </button>
          <button
            disabled
            className="rounded-md bg-red-600/50 px-6 py-2 text-sm font-medium text-white"
          >
            NO (1 credit)
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          <Link href="/auth/signin" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to vote on this claim
        </p>
      </div>
    );
  }

  // ── Market not active ──────────────────────────────────────────────────
  if (marketStatus && marketStatus !== "ACTIVE") {
    return (
      <p className="text-sm text-muted-foreground">
        {marketStatus === "RESOLVED"
          ? "This claim has been resolved."
          : "Voting is not yet open for this claim."}
      </p>
    );
  }

  // ── Submit handler ─────────────────────────────────────────────────────
  async function handleVote(side: "YES" | "NO") {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/claims/${claimId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit vote");
        return;
      }

      setLocalVote({
        side: data.vote.side,
        revealAt: data.vote.revealAt,
      });

      onVoted?.(
        { side: data.vote.side, revealAt: data.vote.revealAt },
        data.newBalance,
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Ready to vote ──────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <button
          onClick={() => handleVote("YES")}
          disabled={submitting}
          className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? "…" : "YES (1 credit)"}
        </button>
        <button
          onClick={() => handleVote("NO")}
          disabled={submitting}
          className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? "…" : "NO (1 credit)"}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
