/**
 * Tests for the VoteButtons component
 *
 * Verifies: unauthenticated state, already-voted state,
 * market-not-active state, voting flow (success + error),
 * and loading state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

let mockSession: unknown = null;
let mockStatus: string = "unauthenticated";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession, status: mockStatus }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { VoteButtons } from "@/components/vote-buttons";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("VoteButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockStatus = "unauthenticated";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows disabled buttons and sign-in prompt when not authenticated", () => {
    render(<VoteButtons claimId="claim-1" />);

    const yesBtn = screen.getByText("YES (1 credit)");
    const noBtn = screen.getByText("NO (1 credit)");

    expect(yesBtn).toBeDisabled();
    expect(noBtn).toBeDisabled();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("shows vote confirmation when user already voted YES", () => {
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    render(
      <VoteButtons
        claimId="claim-1"
        userVote={{
          side: "YES",
          revealAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          revealed: false,
        }}
      />,
    );

    expect(screen.getByText("You voted")).toBeInTheDocument();
    expect(screen.getByText("YES")).toBeInTheDocument();
    expect(screen.getByText(/Results available/)).toBeInTheDocument();
  });

  it("shows 'View results' link when reveal time has passed", () => {
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    render(
      <VoteButtons
        claimId="claim-1"
        userVote={{
          side: "NO",
          revealAt: new Date(Date.now() - 60 * 1000).toISOString(), // in the past
          revealed: false,
        }}
      />,
    );

    expect(screen.getByText("View results →")).toBeInTheDocument();
  });

  it("shows resolved message when market is RESOLVED", () => {
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    render(
      <VoteButtons claimId="claim-1" marketStatus="RESOLVED" />,
    );

    expect(screen.getByText(/resolved/i)).toBeInTheDocument();
  });

  it("shows not-open message when market is RESEARCHING", () => {
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    render(
      <VoteButtons claimId="claim-1" marketStatus="RESEARCHING" />,
    );

    expect(screen.getByText(/not yet open/i)).toBeInTheDocument();
  });

  it("submits YES vote and shows confirmation on success", async () => {
    const user = userEvent.setup();
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    const revealAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vote: { id: "v1", side: "YES", votedAt: new Date().toISOString(), revealAt },
        newBalance: 4,
      }),
    });

    const onVoted = vi.fn();
    render(
      <VoteButtons claimId="claim-1" marketStatus="ACTIVE" onVoted={onVoted} />,
    );

    await user.click(screen.getByText("YES (1 credit)"));

    await waitFor(() => {
      expect(screen.getByText("You voted")).toBeInTheDocument();
    });
    expect(screen.getByText("YES")).toBeInTheDocument();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/claims/claim-1/vote",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ side: "YES" }),
      }),
    );

    expect(onVoted).toHaveBeenCalledWith(
      { side: "YES", revealAt },
      4,
    );
  });

  it("submits NO vote on NO button click", async () => {
    const user = userEvent.setup();
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vote: { id: "v2", side: "NO", votedAt: new Date().toISOString(), revealAt: new Date().toISOString() },
        newBalance: 9,
      }),
    });

    render(<VoteButtons claimId="claim-2" marketStatus="ACTIVE" />);

    await user.click(screen.getByText("NO (1 credit)"));

    await waitFor(() => {
      expect(screen.getByText("NO")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/claims/claim-2/vote",
      expect.objectContaining({
        body: JSON.stringify({ side: "NO" }),
      }),
    );
  });

  it("shows error message when vote fails", async () => {
    const user = userEvent.setup();
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Insufficient credits" }),
    });

    render(<VoteButtons claimId="claim-1" marketStatus="ACTIVE" />);

    await user.click(screen.getByText("YES (1 credit)"));

    await waitFor(() => {
      expect(screen.getByText("Insufficient credits")).toBeInTheDocument();
    });

    // Buttons should still be visible (not in "voted" state)
    expect(screen.getByText("YES (1 credit)")).toBeInTheDocument();
  });

  it("shows error on network failure", async () => {
    const user = userEvent.setup();
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<VoteButtons claimId="claim-1" marketStatus="ACTIVE" />);

    await user.click(screen.getByText("YES (1 credit)"));

    await waitFor(() => {
      expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument();
    });
  });

  it("disables buttons while submitting", async () => {
    const user = userEvent.setup();
    mockSession = { user: { id: "user-1" } };
    mockStatus = "authenticated";

    // Create a promise we control
    let resolve: (value: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });

    mockFetch.mockReturnValueOnce(pending);

    render(<VoteButtons claimId="claim-1" marketStatus="ACTIVE" />);

    await user.click(screen.getByText("YES (1 credit)"));

    // While submitting, buttons should be disabled
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => expect(btn).toBeDisabled());

    // Resolve the fetch
    resolve!({
      ok: true,
      json: async () => ({
        vote: { id: "v1", side: "YES", votedAt: new Date().toISOString(), revealAt: new Date().toISOString() },
        newBalance: 3,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText("You voted")).toBeInTheDocument();
    });
  });
});
