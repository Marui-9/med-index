"use client";

import { useState, useEffect, useCallback } from "react";

export interface CoinTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note: string | null;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

/** Human-readable labels for transaction types */
const TYPE_LABELS: Record<string, string> = {
  GUEST_INITIAL: "Welcome bonus",
  SIGNUP_BONUS: "Signup bonus",
  NEWSLETTER_BONUS: "Newsletter bonus",
  DAILY_LOGIN: "Daily login",
  STREAK_BONUS: "Streak bonus",
  VOTE_SPENT: "Vote placed",
  DEEP_ANALYSIS_UNLOCK: "Deep analysis",
  CLAIM_PROPOSAL_DEPOSIT: "Claim proposal",
  BOUNTY_CONTRIBUTION: "Bounty contribution",
  TOURNAMENT_ENTRY: "Tournament entry",
  STAKE_PAYOUT: "Betting payout",
  BOUNTY_PAYOUT: "Bounty payout",
  TOURNAMENT_PRIZE: "Tournament prize",
  EVIDENCE_REWARD: "Evidence reward",
  HOUSE_FEE_BURN: "House fee",
  DEPOSIT_REFUND: "Deposit refund",
  DEPOSIT_BURN: "Deposit forfeited",
  ADMIN_GRANT: "Admin adjustment",
  PURCHASE: "Purchase",
};

function formatType(type: string): string {
  return TYPE_LABELS[type] || type.replace(/_/g, " ").toLowerCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CoinHistoryProps {
  /** Optional filter by transaction type */
  filterType?: string;
  /** Number of transactions per page */
  pageSize?: number;
}

/**
 * Paginated coin transaction history table.
 * Fetches from /api/coins/history with offset-based pagination.
 */
export function CoinHistory({
  filterType,
  pageSize = 20,
}: CoinHistoryProps) {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchHistory = useCallback(
    async (currentOffset: number, append = false) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: String(pageSize + 1), // fetch 1 extra to check hasMore
          offset: String(currentOffset),
        });
        if (filterType) {
          params.set("type", filterType);
        }

        const res = await fetch(`/api/coins/history?${params}`);

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load history");
        }

        const data = await res.json();
        const items: CoinTransaction[] = data.transactions || [];

        // Check if more pages exist
        if (items.length > pageSize) {
          setHasMore(true);
          items.pop(); // remove the extra item
        } else {
          setHasMore(false);
        }

        setTransactions((prev) => (append ? [...prev, ...items] : items));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [filterType, pageSize],
  );

  useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  function loadMore() {
    const newOffset = offset + pageSize;
    setOffset(newOffset);
    fetchHistory(newOffset, true);
  }

  // ── Loading skeleton ─────────────────────────────────────────────────
  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-3" data-testid="coin-history-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────
  if (error && transactions.length === 0) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => fetchHistory(0)}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p className="text-sm">No transactions yet.</p>
        <p className="mt-1 text-xs">
          Vote on claims and claim daily bonuses to earn coins!
        </p>
      </div>
    );
  }

  // ── Transaction list ─────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between rounded-lg border px-4 py-3"
          data-testid="coin-tx-row"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {formatType(tx.type)}
              </span>
              {tx.refType === "claim" && tx.refId && (
                <a
                  href={`/claims/${tx.refId}`}
                  className="text-xs text-primary hover:underline"
                >
                  View claim
                </a>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(tx.createdAt)}</span>
              {tx.note && (
                <>
                  <span>·</span>
                  <span className="truncate">{tx.note}</span>
                </>
              )}
            </div>
          </div>

          <div className="ml-4 flex flex-col items-end">
            <span
              className={`text-sm font-semibold ${
                tx.amount > 0
                  ? "text-green-600"
                  : tx.amount < 0
                    ? "text-red-600"
                    : "text-muted-foreground"
              }`}
              data-testid="coin-tx-amount"
            >
              {tx.amount > 0 ? "+" : ""}
              {tx.amount}
            </span>
            <span className="text-xs text-muted-foreground">
              bal: {tx.balanceAfter}
            </span>
          </div>
        </div>
      ))}

      {/* Load More */}
      {hasMore && (
        <div className="pt-2 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
