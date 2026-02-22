/**
 * Tests for VerdictCard component.
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

import { VerdictCard } from "@/components/verdict-card";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("VerdictCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockStatus = "unauthenticated";
  });

  it("shows loading skeleton while fetching", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<VerdictCard claimId="c1" />);
    expect(screen.getByTestId("verdict-skeleton")).toBeInTheDocument();
  });

  it("renders not-available state when verdict is unavailable", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: false,
        status: "RESEARCHING",
        message: "Research in progress.",
      }),
    });

    render(<VerdictCard claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByText("AI Verdict Not Available")).toBeInTheDocument();
    });
    expect(screen.getByText("Research in progress.")).toBeInTheDocument();
  });

  it("renders free tier with short summary and verdict badge", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        verdict: "Supported",
        confidence: 0.85,
        unlocked: false,
        shortSummary: "Creatine is well supported.",
        lastUpdated: new Date().toISOString(),
      }),
    });

    render(<VerdictCard claimId="c1" />);

    await waitFor(() => {
      expect(screen.getByTestId("verdict-badge")).toHaveTextContent("Supported");
    });
    expect(screen.getByText("Creatine is well supported.")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByTestId("confidence-bar")).toBeInTheDocument();
  });

  it("shows unlock button for authenticated users on free tier", async () => {
    mockSession = { user: { id: "u1" } };
    mockStatus = "authenticated";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        verdict: "Mixed",
        confidence: 0.5,
        unlocked: false,
        shortSummary: "Mixed results.",
      }),
    });

    render(<VerdictCard claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByTestId("unlock-button")).toBeInTheDocument();
    });
    expect(screen.getByTestId("unlock-button")).toHaveTextContent(
      "Unlock full analysis (5 coins)",
    );
  });

  it("does not show unlock button for unauthenticated users", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        verdict: "Mixed",
        confidence: 0.5,
        unlocked: false,
        shortSummary: "Mixed results.",
      }),
    });

    render(<VerdictCard claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByTestId("verdict-badge")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("unlock-button")).toBeNull();
  });

  it("renders detailed summary when unlocked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        verdict: "Supported",
        confidence: 0.9,
        unlocked: true,
        detailedSummary: "Full deep analysis of creatine evidence.",
      }),
    });

    render(<VerdictCard claimId="c1" />);
    await waitFor(() => {
      expect(
        screen.getByText("Full deep analysis of creatine evidence."),
      ).toBeInTheDocument();
    });
    // Should NOT show unlock button when already unlocked
    expect(screen.queryByTestId("unlock-button")).toBeNull();
  });

  it("handles unlock flow (click → success → refetch)", async () => {
    const user = userEvent.setup();
    mockSession = { user: { id: "u1" } };
    mockStatus = "authenticated";

    // Initial fetch — free tier
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        verdict: "Supported",
        confidence: 0.85,
        unlocked: false,
        shortSummary: "Short.",
      }),
    });

    render(<VerdictCard claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByTestId("unlock-button")).toBeInTheDocument();
    });

    // Mock unlock endpoint response, then verdict refetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, newBalance: 3 }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        verdict: "Supported",
        confidence: 0.85,
        unlocked: true,
        detailedSummary: "Now you can see the full analysis.",
      }),
    });

    await user.click(screen.getByTestId("unlock-button"));

    await waitFor(() => {
      expect(
        screen.getByText("Now you can see the full analysis."),
      ).toBeInTheDocument();
    });

    // Should have called unlock endpoint
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/claims/c1/unlock-analysis",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows error when unlock fails", async () => {
    const user = userEvent.setup();
    mockSession = { user: { id: "u1" } };
    mockStatus = "authenticated";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        verdict: "Mixed",
        confidence: 0.5,
        unlocked: false,
        shortSummary: "Short.",
      }),
    });

    render(<VerdictCard claimId="c1" />);
    await waitFor(() => {
      expect(screen.getByTestId("unlock-button")).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Insufficient credits" }),
    });

    await user.click(screen.getByTestId("unlock-button"));

    await waitFor(() => {
      expect(screen.getByTestId("verdict-error")).toHaveTextContent(
        "Insufficient credits",
      );
    });
  });

  it("uses initialData without fetching", () => {
    render(
      <VerdictCard
        claimId="c1"
        initialData={{
          available: true,
          verdict: "Contradicted",
          confidence: 0.7,
          unlocked: false,
          shortSummary: "Pre-loaded summary.",
        }}
      />,
    );
    expect(screen.getByTestId("verdict-badge")).toHaveTextContent("Contradicted");
    expect(screen.getByText("Pre-loaded summary.")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
