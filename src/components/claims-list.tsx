"use client";

import { useState, useEffect, useCallback } from "react";
import { ClaimCard } from "@/components/claim-card";

interface Market {
  status: string;
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  aiVerdict?: string | null;
  aiConfidence?: number | null;
}

interface Claim {
  id: string;
  title: string;
  description?: string | null;
  difficulty: string;
  market?: Market | null;
}

interface ClaimsResponse {
  claims: Claim[];
  nextCursor: string | null;
}

export interface ClaimsListProps {
  /** Initial server-fetched claims (optional, for SSR hydration) */
  initialClaims?: Claim[];
  initialCursor?: string | null;
}

export function ClaimsList({ initialClaims, initialCursor }: ClaimsListProps) {
  const [claims, setClaims] = useState<Claim[]>(initialClaims ?? []);
  const [cursor, setCursor] = useState<string | null>(initialCursor ?? null);
  const [loading, setLoading] = useState(!initialClaims);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClaims = useCallback(async (cursorParam?: string) => {
    const url = new URL("/api/claims", window.location.origin);
    url.searchParams.set("status", "ACTIVE");
    url.searchParams.set("limit", "20");
    if (cursorParam) url.searchParams.set("cursor", cursorParam);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Failed to load claims");
    return (await res.json()) as ClaimsResponse;
  }, []);

  // Initial load (only if no initialClaims were passed)
  useEffect(() => {
    if (initialClaims) return;

    let cancelled = false;
    setLoading(true);
    fetchClaims()
      .then((data) => {
        if (cancelled) return;
        setClaims(data.claims);
        setCursor(data.nextCursor);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load claims. Try again later.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialClaims, fetchClaims]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchClaims(cursor);
      setClaims((prev) => [...prev, ...data.claims]);
      setCursor(data.nextCursor);
    } catch {
      setError("Could not load more claims.");
    } finally {
      setLoadingMore(false);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid gap-4" role="status" aria-label="Loading claims">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border p-6">
            <div className="mb-3 h-6 w-3/4 rounded bg-muted" />
            <div className="mb-4 h-4 w-1/3 rounded bg-muted" />
            <div className="flex gap-3">
              <div className="h-9 w-28 rounded bg-muted" />
              <div className="h-9 w-28 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error && claims.length === 0) {
    return (
      <div className="rounded-lg border border-destructive/50 p-8 text-center">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchClaims()
              .then((data) => {
                setClaims(data.claims);
                setCursor(data.nextCursor);
              })
              .catch(() => setError("Could not load claims."))
              .finally(() => setLoading(false));
          }}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────
  if (claims.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No claims yet. Check back soon!
      </div>
    );
  }

  // ── Claims list ────────────────────────────────────────────────────────
  return (
    <div>
      <div className="grid gap-4">
        {claims.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>

      {cursor && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-md border px-6 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load More"}
          </button>
        </div>
      )}

      {error && claims.length > 0 && (
        <p className="mt-4 text-center text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
