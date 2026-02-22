"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export interface VerdictCardProps {
  claimId: string;
  /** Pre-loaded verdict data (optional — will fetch if not provided) */
  initialData?: VerdictData | null;
}

export interface VerdictData {
  available: boolean;
  verdict?: string;
  aiVerdict?: string | null;
  confidence?: number | null;
  lastUpdated?: string | null;
  unlocked?: boolean;
  shortSummary?: string;
  detailedSummary?: string;
  status?: string;
  message?: string;
}

const verdictColors: Record<string, string> = {
  Supported: "bg-green-100 text-green-800 border-green-300",
  Contradicted: "bg-red-100 text-red-800 border-red-300",
  Mixed: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Insufficient: "bg-gray-100 text-gray-600 border-gray-300",
};

export function VerdictCard({ claimId, initialData }: VerdictCardProps) {
  const { data: session } = useSession();
  const [verdict, setVerdict] = useState<VerdictData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return;
    fetchVerdict();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  async function fetchVerdict() {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/verdict`);
      const data = await res.json();
      setVerdict(data);
    } catch {
      setError("Failed to load verdict");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock() {
    if (!session?.user) return;
    setUnlocking(true);
    setError(null);
    try {
      const res = await fetch(`/api/claims/${claimId}/unlock-analysis`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to unlock");
        return;
      }
      // Refresh verdict with unlocked data
      await fetchVerdict();
    } catch {
      setError("Failed to unlock analysis");
    } finally {
      setUnlocking(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border p-6 animate-pulse" data-testid="verdict-skeleton">
        <div className="h-6 w-32 rounded bg-muted mb-3" />
        <div className="h-4 w-48 rounded bg-muted mb-2" />
        <div className="h-3 w-full rounded bg-muted" />
      </div>
    );
  }

  if (!verdict || !verdict.available) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        <p className="font-medium">AI Verdict Not Available</p>
        <p className="text-sm mt-1">
          {verdict?.message || "Research has not been completed for this claim yet."}
        </p>
      </div>
    );
  }

  const verdictLabel = verdict.verdict || "Unknown";
  const colorClass = verdictColors[verdictLabel] ?? verdictColors.Insufficient;
  const confidencePct = verdict.confidence != null ? Math.round(verdict.confidence * 100) : null;

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AI Verdict</h3>
        {verdict.lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Updated {new Date(verdict.lastUpdated).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Verdict badge */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`inline-block rounded-full border px-3 py-1 text-sm font-semibold ${colorClass}`}
          data-testid="verdict-badge"
        >
          {verdictLabel}
        </span>

        {/* Confidence meter */}
        {confidencePct != null && (
          <div className="flex items-center gap-2 flex-1">
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${confidencePct}%` }}
                data-testid="confidence-bar"
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {confidencePct}%
            </span>
          </div>
        )}
      </div>

      {/* Summary */}
      {verdict.unlocked && verdict.detailedSummary ? (
        <div className="prose prose-sm max-w-none">
          <p>{verdict.detailedSummary}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {verdict.shortSummary || "No summary available."}
          </p>

          {/* Unlock button */}
          {session?.user && !verdict.unlocked && (
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              data-testid="unlock-button"
            >
              {unlocking ? "Unlocking…" : "Unlock full analysis (5 coins)"}
            </button>
          )}
        </>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600" data-testid="verdict-error">
          {error}
        </p>
      )}
    </div>
  );
}
