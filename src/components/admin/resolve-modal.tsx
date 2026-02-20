"use client";

import { useState } from "react";

interface AdminResolveModalProps {
  claim: {
    id: string;
    title: string;
  };
  onClose: () => void;
  onResolved: () => void;
}

export function AdminResolveModal({
  claim,
  onClose,
  onResolved,
}: AdminResolveModalProps) {
  const [verdict, setVerdict] = useState<"YES" | "NO">("YES");
  const [confidence, setConfidence] = useState("0.85");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/claims/${claim.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiVerdict: verdict,
          aiConfidence: parseFloat(confidence),
          consensusSummary: summary.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      onResolved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-label="Resolve Claim"
    >
      <div className="mx-4 w-full max-w-lg rounded-lg bg-background p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-bold">Resolve Claim</h2>
        <p className="mb-4 text-sm text-muted-foreground">{claim.title}</p>

        {error && (
          <div className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Verdict */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              AI Verdict
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="verdict"
                  value="YES"
                  checked={verdict === "YES"}
                  onChange={() => setVerdict("YES")}
                />
                <span className="text-sm text-green-600 font-medium">
                  YES — Supported
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="verdict"
                  value="NO"
                  checked={verdict === "NO"}
                  onChange={() => setVerdict("NO")}
                />
                <span className="text-sm text-red-600 font-medium">
                  NO — Refuted
                </span>
              </label>
            </div>
          </div>

          {/* Confidence */}
          <div className="mb-4">
            <label
              htmlFor="confidence"
              className="mb-1 block text-sm font-medium"
            >
              Confidence (0.0 – 1.0)
            </label>
            <input
              id="confidence"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="w-32 rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>

          {/* Summary */}
          <div className="mb-4">
            <label
              htmlFor="consensus-summary"
              className="mb-1 block text-sm font-medium"
            >
              Consensus Summary *
            </label>
            <textarea
              id="consensus-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              placeholder="Summarize the scientific consensus for this claim..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || summary.trim().length < 10}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Resolving..." : "Resolve Claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
