/**
 * Tests for the CoinBalance component
 *
 * Verifies: loading skeleton, hidden when unauthenticated,
 * displays credit count, links to /coins page.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

let mockSession: unknown = null;
let mockStatus: string = "unauthenticated";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession, status: mockStatus }),
}));

import { CoinBalance } from "@/components/coin-balance";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CoinBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockStatus = "unauthenticated";
  });

  it("shows loading skeleton while session is loading", () => {
    mockStatus = "loading";
    const { container } = render(<CoinBalance />);

    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });

  it("renders nothing when user is not signed in", () => {
    mockStatus = "unauthenticated";
    const { container } = render(<CoinBalance />);

    expect(container.innerHTML).toBe("");
  });

  it("shows coin count when authenticated", () => {
    mockStatus = "authenticated";
    mockSession = {
      user: { id: "u1", credits: 42, reputation: 10 },
    };

    render(<CoinBalance />);

    expect(screen.getByTestId("coin-count")).toHaveTextContent("42");
  });

  it("defaults to 0 when credits is undefined", () => {
    mockStatus = "authenticated";
    mockSession = {
      user: { id: "u1" },
    };

    render(<CoinBalance />);

    expect(screen.getByTestId("coin-count")).toHaveTextContent("0");
  });

  it("links to /coins page", () => {
    mockStatus = "authenticated";
    mockSession = {
      user: { id: "u1", credits: 10 },
    };

    render(<CoinBalance />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/coins");
  });

  it("has accessible screen reader text", () => {
    mockStatus = "authenticated";
    mockSession = {
      user: { id: "u1", credits: 10 },
    };

    render(<CoinBalance />);

    expect(screen.getByText("credits")).toBeInTheDocument();
  });
});
