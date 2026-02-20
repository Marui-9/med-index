"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * Compact coin balance badge for the header / nav.
 * Shows the user's current credit count with a coin icon.
 * Links to the coin history page.
 */
export function CoinBalance() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!session?.user) {
    return null;
  }

  const credits = session.user.credits ?? 0;

  return (
    <Link
      href="/coins"
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors hover:bg-accent"
      title="View coin history"
    >
      <span className="text-amber-500" aria-hidden="true">●</span>
      <span data-testid="coin-count">{credits}</span>
      <span className="sr-only">credits</span>
    </Link>
  );
}
