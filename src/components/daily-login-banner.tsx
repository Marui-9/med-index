"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

/**
 * Daily login bonus banner.
 * Shows a "Claim +2 coins" button if the user hasn't claimed today.
 * After claiming (or if already claimed), shows a success / already-claimed message.
 */
export function DailyLoginBanner() {
  const { data: session, status, update } = useSession();
  const [state, setState] = useState<
    "idle" | "loading" | "claimed" | "already" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Check localStorage to avoid showing after already claimed this session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date().toISOString().split("T")[0];
    const lastClaim = localStorage.getItem("hp-daily-login");
    if (lastClaim === today) {
      setState("already");
    }
  }, []);

  const claimBonus = useCallback(async () => {
    setState("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/coins/daily-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setMessage(data.error || "Failed to claim bonus");
        return;
      }

      if (data.success) {
        setState("claimed");
        setMessage(data.message || "Daily bonus claimed! +2 coins");
        // Store in localStorage so banner hides on next render
        const today = new Date().toISOString().split("T")[0];
        localStorage.setItem("hp-daily-login", today);
        // Refresh session to update credits in nav
        update?.();
      } else {
        setState("already");
        setMessage(data.message || "Already claimed today");
        const today = new Date().toISOString().split("T")[0];
        localStorage.setItem("hp-daily-login", today);
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }, [update]);

  // Don't render for unauthenticated users or while loading
  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  // Already claimed — hide the banner entirely
  if (state === "already") {
    return null;
  }

  // Just claimed — show success then auto-dismiss
  if (state === "claimed") {
    return (
      <div className="border-b border-green-200 bg-green-50 px-4 py-2 text-center text-sm text-green-800">
        {message}
      </div>
    );
  }

  // Error
  if (state === "error") {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-800">
        {message}{" "}
        <button
          onClick={claimBonus}
          className="ml-2 font-medium underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Default: show claim button
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
      <span className="mr-2">🎁 Your daily login bonus is ready!</span>
      <button
        onClick={claimBonus}
        disabled={state === "loading"}
        className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {state === "loading" ? "Claiming…" : "Claim +2 coins"}
      </button>
    </div>
  );
}
