/**
 * Tests for the DailyLoginBanner component
 *
 * Verifies: hidden when unauthenticated, claim button visible,
 * successful claim flow, already-claimed state, error + retry,
 * localStorage tracking.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

let mockSession: unknown = null;
let mockStatus: string = "unauthenticated";
const mockUpdate = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession, status: mockStatus, update: mockUpdate }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock localStorage
const localStorageMap: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: vi.fn((key: string) => localStorageMap[key] || null),
  setItem: vi.fn((key: string, val: string) => { localStorageMap[key] = val; }),
  removeItem: vi.fn((key: string) => { delete localStorageMap[key]; }),
  clear: vi.fn(),
});

import { DailyLoginBanner } from "@/components/daily-login-banner";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("DailyLoginBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockStatus = "unauthenticated";
    // Clear our localStorage mock
    Object.keys(localStorageMap).forEach((k) => delete localStorageMap[k]);
  });

  it("renders nothing when user is not authenticated", () => {
    const { container } = render(<DailyLoginBanner />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing while session is loading", () => {
    mockStatus = "loading";
    const { container } = render(<DailyLoginBanner />);

    expect(container.innerHTML).toBe("");
  });

  it("shows claim button when authenticated and not yet claimed", () => {
    mockStatus = "authenticated";
    mockSession = { user: { id: "u1", credits: 10 } };

    render(<DailyLoginBanner />);

    expect(screen.getByText("Claim +2 coins")).toBeInTheDocument();
    expect(screen.getByText(/daily login bonus/i)).toBeInTheDocument();
  });

  it("hides banner when already claimed today (localStorage)", () => {
    mockStatus = "authenticated";
    mockSession = { user: { id: "u1", credits: 10 } };
    const today = new Date().toISOString().split("T")[0];
    localStorageMap["hp-daily-login"] = today;

    const { container } = render(<DailyLoginBanner />);

    // Should render nothing since already claimed
    expect(container.innerHTML).toBe("");
  });

  it("handles successful claim", async () => {
    mockStatus = "authenticated";
    mockSession = { user: { id: "u1", credits: 10 } };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: "Daily bonus claimed! +2 coins",
        coinsEarned: 2,
        newBalance: 12,
      }),
    });

    render(<DailyLoginBanner />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Claim +2 coins"));

    await waitFor(() => {
      expect(screen.getByText(/Daily bonus claimed/)).toBeInTheDocument();
    });

    // Should call the daily-login endpoint
    expect(mockFetch).toHaveBeenCalledWith("/api/coins/daily-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    // Should refresh session
    expect(mockUpdate).toHaveBeenCalled();

    // Should store in localStorage
    const today = new Date().toISOString().split("T")[0];
    expect(localStorage.setItem).toHaveBeenCalledWith("hp-daily-login", today);
  });

  it("handles already-claimed response from API", async () => {
    mockStatus = "authenticated";
    mockSession = { user: { id: "u1", credits: 10 } };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        message: "Daily bonus already claimed",
        balance: 10,
      }),
    });

    const { container } = render(<DailyLoginBanner />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Claim +2 coins"));

    // After API returns "already claimed", banner should disappear
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("shows error with retry button on failure", async () => {
    mockStatus = "authenticated";
    mockSession = { user: { id: "u1", credits: 10 } };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    render(<DailyLoginBanner />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Claim +2 coins"));

    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
    });
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows error on network failure", async () => {
    mockStatus = "authenticated";
    mockSession = { user: { id: "u1", credits: 10 } };

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<DailyLoginBanner />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Claim +2 coins"));

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("disables button while claiming", async () => {
    mockStatus = "authenticated";
    mockSession = { user: { id: "u1", credits: 10 } };

    // Never-resolving fetch
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    render(<DailyLoginBanner />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Claim +2 coins"));

    await waitFor(() => {
      expect(screen.getByText("Claiming…")).toBeInTheDocument();
    });
    expect(screen.getByText("Claiming…").closest("button")).toBeDisabled();
  });
});
