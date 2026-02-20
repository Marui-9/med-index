/**
 * Tests for loading skeleton components
 *
 * Verifies each loading skeleton renders without errors and shows
 * the expected number of animated placeholder elements.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Loading skeletons render <Header> which uses useSession via CoinBalance + UserMenu
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

import RootLoading from "@/app/loading";
import ClaimsLoading from "@/app/claims/loading";
import ClaimDetailLoading from "@/app/claims/[claimId]/loading";
import DashboardLoading from "@/app/dashboard/loading";
import CoinsLoading from "@/app/coins/loading";

describe("Loading Skeletons", () => {
  it("root loading renders animated skeletons", () => {
    const { container } = render(<RootLoading />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(3);
  });

  it("claims loading renders 5 claim card skeletons", () => {
    const { container } = render(<ClaimsLoading />);
    // Each card has multiple pulse elements; check we have several
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(10);
  });

  it("claim detail loading renders skeleton sections", () => {
    const { container } = render(<ClaimDetailLoading />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(8);
  });

  it("dashboard loading renders 4 stat card skeletons", () => {
    const { container } = render(<DashboardLoading />);
    // 4 stat cards + section skeletons
    const borders = container.querySelectorAll(".rounded-lg.border");
    expect(borders.length).toBe(4);
  });

  it("coins loading renders balance + transaction skeletons", () => {
    const { container } = render(<CoinsLoading />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(10);
  });
});
