/**
 * Tests for ResearchProgress component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { ResearchProgress } from "@/components/research-progress";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ResearchProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when status is NONE", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "NONE", progress: 0 }),
    });

    const { container } = render(<ResearchProgress claimId="c1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(container.innerHTML).toBe("");
  });

  it("shows progress bar and step label when RUNNING", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "RUNNING",
        progress: 45,
        stepLabel: "Searching papers",
      }),
    });

    render(<ResearchProgress claimId="c1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByTestId("research-progress")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveAttribute(
      "aria-valuenow",
      "45",
    );
    expect(screen.getByText("Searching papers")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("shows queued state", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "QUEUED",
        progress: 0,
        stepLabel: "Queued",
      }),
    });

    render(<ResearchProgress claimId="c1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText("Research queued")).toBeInTheDocument();
  });

  it("shows success banner when SUCCEEDED", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "SUCCEEDED", progress: 100 }),
    });

    render(<ResearchProgress claimId="c1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByTestId("research-complete")).toBeInTheDocument();
    expect(screen.getByText("Research complete")).toBeInTheDocument();
  });

  it("shows failure banner with error message when FAILED", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "FAILED",
        progress: 30,
        error: "PubMed API unavailable",
      }),
    });

    render(<ResearchProgress claimId="c1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByTestId("research-failed")).toBeInTheDocument();
    expect(screen.getByText("Research failed")).toBeInTheDocument();
    expect(screen.getByText("PubMed API unavailable")).toBeInTheDocument();
  });

  it("calls onComplete when research succeeds", async () => {
    const onComplete = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "SUCCEEDED", progress: 100 }),
    });

    render(<ResearchProgress claimId="c1" onComplete={onComplete} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("polls at the configured interval", async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({
          status: callCount >= 3 ? "SUCCEEDED" : "RUNNING",
          progress: callCount * 30,
        }),
      };
    });

    render(<ResearchProgress claimId="c1" pollInterval={1000} />);

    // Initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(callCount).toBe(1);

    // First interval tick
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callCount).toBe(2);

    // Second interval tick → status becomes SUCCEEDED
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callCount).toBe(3);

    // After SUCCEEDED, should stop polling
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(callCount).toBe(3);
  });

  it("shows error state when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<ResearchProgress claimId="c1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(
      screen.getByText("Failed to check research status"),
    ).toBeInTheDocument();
  });
});
