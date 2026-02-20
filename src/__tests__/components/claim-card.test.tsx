/**
 * Tests for the ClaimCard component
 *
 * Verifies: rendering title/difficulty/vote count, hidden percentages,
 * shown percentages after voting, resolved state with AI verdict,
 * and VoteButtons integration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

let mockSession: unknown = null;
let mockStatus: string = "unauthenticated";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession, status: mockStatus }),
}));

import { ClaimCard } from "@/components/claim-card";

// ── Fixtures ───────────────────────────────────────────────────────────────

const baseClaim = {
  id: "claim-1",
  title: "Creatine increases muscle mass",
  description: "Studies show creatine supplementation boosts strength.",
  difficulty: "MEDIUM",
  market: {
    status: "ACTIVE",
    totalVotes: 57,
    yesVotes: 45,
    noVotes: 12,
    aiVerdict: null,
    aiConfidence: null,
  },
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ClaimCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockStatus = "unauthenticated";
  });

  it("renders claim title and difficulty badge", () => {
    render(<ClaimCard claim={baseClaim} />);

    expect(screen.getByText("Creatine increases muscle mass")).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("shows vote count", () => {
    render(<ClaimCard claim={baseClaim} />);

    expect(screen.getByText("57 votes")).toBeInTheDocument();
  });

  it("hides percentages when user has not voted", () => {
    render(<ClaimCard claim={baseClaim} />);

    // Should NOT show percentage text
    expect(screen.queryByText(/% YES/)).not.toBeInTheDocument();
    expect(screen.queryByText(/% NO/)).not.toBeInTheDocument();
  });

  it("shows percentages when user has voted", () => {
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    render(
      <ClaimCard
        claim={baseClaim}
        userVote={{
          side: "YES",
          revealAt: new Date(Date.now() + 3600000).toISOString(),
          revealed: false,
        }}
      />,
    );

    // 45/57 ≈ 79%
    expect(screen.getByText("79% YES")).toBeInTheDocument();
    expect(screen.getByText("21% NO")).toBeInTheDocument();
  });

  it("shows percentages and AI verdict when market is RESOLVED", () => {
    const resolvedClaim = {
      ...baseClaim,
      market: {
        ...baseClaim.market,
        status: "RESOLVED",
        aiVerdict: "YES",
        aiConfidence: 0.87,
      },
    };

    render(<ClaimCard claim={resolvedClaim} />);

    expect(screen.getByText("79% YES")).toBeInTheDocument();
    expect(screen.getByText(/AI: YES/)).toBeInTheDocument();
    expect(screen.getByText(/87%/)).toBeInTheDocument();
  });

  it("renders description when present", () => {
    render(<ClaimCard claim={baseClaim} />);

    expect(
      screen.getByText("Studies show creatine supplementation boosts strength."),
    ).toBeInTheDocument();
  });

  it("renders different difficulty colors", () => {
    const easyClaim = { ...baseClaim, difficulty: "EASY" };
    const { rerender } = render(<ClaimCard claim={easyClaim} />);
    expect(screen.getByText("EASY")).toBeInTheDocument();

    const hardClaim = { ...baseClaim, difficulty: "HARD" };
    rerender(<ClaimCard claim={hardClaim} />);
    expect(screen.getByText("HARD")).toBeInTheDocument();
  });

  it("includes a link to the claim detail page", () => {
    render(<ClaimCard claim={baseClaim} />);

    const link = screen.getByText("Creatine increases muscle mass");
    expect(link.closest("a")).toHaveAttribute("href", "/claims/claim-1");
  });

  it("shows vote buttons", () => {
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    render(<ClaimCard claim={baseClaim} />);

    expect(screen.getByText("YES (1 credit)")).toBeInTheDocument();
    expect(screen.getByText("NO (1 credit)")).toBeInTheDocument();
  });
});
