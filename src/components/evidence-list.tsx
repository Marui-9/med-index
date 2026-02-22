"use client";

import { useState, useEffect, useCallback } from "react";
import { EvidenceCard, type EvidenceCardData } from "@/components/evidence-card";

export interface EvidenceListProps {
  claimId: string;
  /** Pre-loaded evidence data (optional — will fetch if not provided) */
  initialData?: EvidenceCardData[];
}

type SortOption = "relevance" | "recency" | "studyType";
type StanceFilter = "all" | "SUPPORTS" | "REFUTES" | "NEUTRAL";

export function EvidenceList({ claimId, initialData }: EvidenceListProps) {
  const [evidence, setEvidence] = useState<EvidenceCardData[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [stanceFilter, setStanceFilter] = useState<StanceFilter>("all");

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort });
      if (stanceFilter !== "all") {
        params.set("stance", stanceFilter);
      }
      const res = await fetch(`/api/claims/${claimId}/evidence?${params}`);
      if (!res.ok) throw new Error("Failed to fetch evidence");
      const data = await res.json();
      setEvidence(data.evidence ?? []);
    } catch {
      setError("Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, [claimId, sort, stanceFilter]);

  useEffect(() => {
    if (initialData) return;
    fetchEvidence();
  }, [fetchEvidence, initialData]);

  // Re-fetch when sort or stance filter changes (but only if no initial data)
  useEffect(() => {
    if (initialData) return;
    fetchEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, stanceFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Research Evidence
          {!loading && <span className="text-muted-foreground font-normal ml-1">({evidence.length})</span>}
        </h3>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded border bg-background px-2 py-1 text-xs"
            aria-label="Sort evidence"
          >
            <option value="relevance">By relevance</option>
            <option value="recency">By recency</option>
            <option value="studyType">By study type</option>
          </select>

          {/* Stance filter */}
          <select
            value={stanceFilter}
            onChange={(e) => setStanceFilter(e.target.value as StanceFilter)}
            className="rounded border bg-background px-2 py-1 text-xs"
            aria-label="Filter by stance"
          >
            <option value="all">All stances</option>
            <option value="SUPPORTS">Supports</option>
            <option value="REFUTES">Refutes</option>
            <option value="NEUTRAL">Neutral</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="space-y-3" data-testid="evidence-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4 animate-pulse">
              <div className="h-5 w-3/4 rounded bg-muted mb-2" />
              <div className="h-3 w-1/2 rounded bg-muted mb-2" />
              <div className="h-3 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchEvidence}
            className="mt-2 text-xs text-red-600 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && evidence.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <p className="font-medium">No evidence found</p>
          <p className="text-sm mt-1">
            {stanceFilter !== "all"
              ? "Try removing the stance filter to see all evidence."
              : "Research has not been completed for this claim yet."}
          </p>
        </div>
      )}

      {!loading && !error && evidence.length > 0 && (
        <div className="space-y-3" data-testid="evidence-list">
          {evidence.map((item) => (
            <EvidenceCard key={item.id} evidence={item} />
          ))}
        </div>
      )}
    </div>
  );
}
