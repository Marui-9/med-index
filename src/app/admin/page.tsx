"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AdminClaimRow } from "@/components/admin/claim-row";
import { AdminCreateClaim } from "@/components/admin/create-claim";
import { AdminResolveModal } from "@/components/admin/resolve-modal";

interface Market {
  id: string;
  status: string;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  aiVerdict: string | null;
  aiConfidence: number | null;
  consensusSummary: string | null;
  resolvedAt: string | null;
}

interface AdminClaim {
  id: string;
  title: string;
  normalizedTitle: string;
  description: string | null;
  difficulty: string;
  createdAt: string;
  market: Market | null;
  _count: {
    claimVotes: number;
    claimPapers: number;
    dossierJobs: number;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [resolving, setResolving] = useState<AdminClaim | null>(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/claims?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setClaims(data.claims);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchClaims();
    }
  }, [session, fetchClaims]);

  const handleDelete = async (claimId: string) => {
    if (!confirm("Are you sure you want to delete this claim? This cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Delete failed");
      }
      // Refresh list
      fetchClaims();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleStatusChange = async (
    claimId: string,
    newStatus: string,
  ) => {
    try {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Update failed");
      }
      fetchClaims();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            You need admin privileges to access this page.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────
  const activeCount = claims.filter(
    (c) => c.market?.status === "ACTIVE",
  ).length;
  const resolvedCount = claims.filter(
    (c) => c.market?.status === "RESOLVED",
  ).length;
  const researchingCount = claims.filter(
    (c) => c.market?.status === "RESEARCHING",
  ).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {/* Title & actions */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage claims, resolve verdicts, and monitor activity.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {showCreate ? "Cancel" : "+ New Claim"}
          </button>
        </div>

        {/* Quick stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total Claims</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{resolvedCount}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{researchingCount}</p>
            <p className="text-xs text-muted-foreground">Researching</p>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <AdminCreateClaim
            onCreated={() => {
              setShowCreate(false);
              fetchClaims();
            }}
          />
        )}

        {/* Filter bar */}
        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="status-filter" className="text-sm font-medium">
            Filter by status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="RESOLVED">Resolved</option>
            <option value="RESEARCHING">Researching</option>
          </select>
          <span className="ml-auto text-sm text-muted-foreground">
            {total} claim{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Claims table */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading claims...
          </div>
        ) : claims.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No claims found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Claim</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Votes</th>
                  <th className="px-4 py-3 font-medium">Verdict</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {claims.map((claim) => (
                  <AdminClaimRow
                    key={claim.id}
                    claim={claim}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                    onResolve={() => setResolving(claim)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Resolve modal */}
        {resolving && (
          <AdminResolveModal
            claim={resolving}
            onClose={() => setResolving(null)}
            onResolved={() => {
              setResolving(null);
              fetchClaims();
            }}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
