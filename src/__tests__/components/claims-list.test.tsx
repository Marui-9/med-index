/**
 * Tests for the ClaimsList component
 *
 * Verifies: loading skeleton, API fetch, claim rendering,
 * load-more pagination, error state, empty state, and retry.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

let mockSession: unknown = null;
let mockStatus: string = "unauthenticated";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession, status: mockStatus }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { ClaimsList } from "@/components/claims-list";

// ── Fixtures ───────────────────────────────────────────────────────────────

const makeClaim = (id: string, title: string) => ({
  id,
  title,
  description: null,
  difficulty: "MEDIUM",
  market: {
    status: "ACTIVE",
    totalVotes: 10,
    yesVotes: 7,
    noVotes: 3,
    aiVerdict: null,
    aiConfidence: null,
  },
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ClaimsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockStatus = "unauthenticated";
  });

  it("shows loading skeleton while fetching", () => {
    // Fetch that never resolves
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<ClaimsList />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("fetches and renders claims", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        claims: [
          makeClaim("c1", "Creatine increases muscle mass"),
          makeClaim("c2", "Cold plunges improve recovery"),
        ],
        nextCursor: null,
      }),
    });

    render(<ClaimsList />);

    await waitFor(() => {
      expect(screen.getByText("Creatine increases muscle mass")).toBeInTheDocument();
    });
    expect(screen.getByText("Cold plunges improve recovery")).toBeInTheDocument();

    // Should call /api/claims with ACTIVE filter
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/claims?status=ACTIVE"),
    );
  });

  it("shows empty state when no claims returned", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ claims: [], nextCursor: null }),
    });

    render(<ClaimsList />);

    await waitFor(() => {
      expect(screen.getByText(/No claims yet/)).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<ClaimsList />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load claims/)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows Load More button when nextCursor exists", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        claims: [makeClaim("c1", "Claim 1")],
        nextCursor: "cursor-abc",
      }),
    });

    render(<ClaimsList />);

    await waitFor(() => {
      expect(screen.getByText("Load More")).toBeInTheDocument();
    });
  });

  it("loads more claims when Load More is clicked", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          claims: [makeClaim("c1", "Claim 1")],
          nextCursor: "cursor-abc",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          claims: [makeClaim("c2", "Claim 2")],
          nextCursor: null,
        }),
      });

    render(<ClaimsList />);

    await waitFor(() => {
      expect(screen.getByText("Claim 1")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Load More"));

    await waitFor(() => {
      expect(screen.getByText("Claim 2")).toBeInTheDocument();
    });

    // Load More should disappear (nextCursor is null)
    expect(screen.queryByText("Load More")).not.toBeInTheDocument();
  });

  it("does not show Load More when no next page", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        claims: [makeClaim("c1", "Only claim")],
        nextCursor: null,
      }),
    });

    render(<ClaimsList />);

    await waitFor(() => {
      expect(screen.getByText("Only claim")).toBeInTheDocument();
    });

    expect(screen.queryByText("Load More")).not.toBeInTheDocument();
  });

  it("skips fetch when initialClaims are provided", async () => {
    render(
      <ClaimsList
        initialClaims={[makeClaim("c1", "Pre-loaded claim")]}
        initialCursor={null}
      />,
    );

    expect(screen.getByText("Pre-loaded claim")).toBeInTheDocument();

    // Should NOT have called fetch
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("retries on error when Retry button is clicked", async () => {
    const user = userEvent.setup();

    // First call: fail
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<ClaimsList />);

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    // Second call: succeed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        claims: [makeClaim("c1", "Recovered claim")],
        nextCursor: null,
      }),
    });

    await user.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("Recovered claim")).toBeInTheDocument();
    });
  });
});
