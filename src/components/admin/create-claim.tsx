"use client";

import { useState } from "react";

interface AdminCreateClaimProps {
  onCreated: () => void;
}

export function AdminCreateClaim({ onCreated }: AdminCreateClaimProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          difficulty,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setTitle("");
      setDescription("");
      setDifficulty("MEDIUM");
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border bg-card p-4"
    >
      <h2 className="mb-3 text-lg font-semibold">Create New Claim</h2>

      {error && (
        <div className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="claim-title" className="mb-1 block text-sm font-medium">
          Claim Title *
        </label>
        <input
          id="claim-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Creatine supplementation increases lean muscle mass"
          required
          minLength={10}
          maxLength={500}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-3">
        <label
          htmlFor="claim-description"
          className="mb-1 block text-sm font-medium"
        >
          Description (optional)
        </label>
        <textarea
          id="claim-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional context about the health claim..."
          maxLength={2000}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div>
          <label
            htmlFor="claim-difficulty"
            className="mb-1 block text-sm font-medium"
          >
            Difficulty
          </label>
          <select
            id="claim-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || title.trim().length < 10}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Claim"}
      </button>
    </form>
  );
}
