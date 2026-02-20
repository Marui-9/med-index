/**
 * Tests for the CoinHistory component
 *
 * Verifies: loading skeleton, fetch + render, empty state,
 * error state with retry, load-more pagination, amount formatting,
 * claim link rendering, and type label display.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { CoinHistory } from "@/components/coin-history";

// ── Fixtures ───────────────────────────────────────────────────────────────

const makeTx = (
  id: string,
  type: string,
  amount: number,
  opts: Partial<{
    balanceBefore: number;
    balanceAfter: number;
    note: string;
    refType: string;
    refId: string;
  }> = {},
) => ({
  id,
  type,
  amount,
  balanceBefore: opts.balanceBefore ?? 10,
  balanceAfter: opts.balanceAfter ?? 10 + amount,
  note: opts.note ?? null,
  refType: opts.refType ?? null,
  refId: opts.refId ?? null,
  createdAt: "2026-02-20T12:00:00Z",
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CoinHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton while fetching", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<CoinHistory />);

    expect(screen.getByTestId("coin-history-loading")).toBeInTheDocument();
  });

  it("fetches and renders transactions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [
          makeTx("t1", "SIGNUP_BONUS", 5, { note: "Thanks for signing up!" }),
          makeTx("t2", "VOTE_SPENT", -1, {
            refType: "claim",
            refId: "c1",
            note: "Voted on claim",
          }),
          makeTx("t3", "DAILY_LOGIN", 2),
        ],
        count: 3,
      }),
    });

    render(<CoinHistory />);

    await waitFor(() => {
      expect(screen.getByText("Signup bonus")).toBeInTheDocument();
    });
    expect(screen.getByText("Vote placed")).toBeInTheDocument();
    expect(screen.getByText("Daily login")).toBeInTheDocument();
  });

  it("shows positive amounts in green with + prefix", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [makeTx("t1", "SIGNUP_BONUS", 5)],
        count: 1,
      }),
    });

    render(<CoinHistory />);

    await waitFor(() => {
      const amount = screen.getByTestId("coin-tx-amount");
      expect(amount).toHaveTextContent("+5");
      expect(amount.className).toContain("text-green-600");
    });
  });

  it("shows negative amounts in red", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [makeTx("t1", "VOTE_SPENT", -1)],
        count: 1,
      }),
    });

    render(<CoinHistory />);

    await waitFor(() => {
      const amount = screen.getByTestId("coin-tx-amount");
      expect(amount).toHaveTextContent("-1");
      expect(amount.className).toContain("text-red-600");
    });
  });

  it("shows empty state when no transactions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [], count: 0 }),
    });

    render(<CoinHistory />);

    await waitFor(() => {
      expect(screen.getByText("No transactions yet.")).toBeInTheDocument();
    });
  });

  it("shows error state with retry button", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to load history" }),
    });

    render(<CoinHistory />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load history")).toBeInTheDocument();
    });
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("retries on retry click", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server error" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [makeTx("t1", "DAILY_LOGIN", 2)],
          count: 1,
        }),
      });

    render(<CoinHistory />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("Daily login")).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("shows Load More when more pages exist", async () => {
    // Return pageSize + 1 items to signal more exist (default pageSize=20)
    const txs = Array.from({ length: 6 }, (_, i) =>
      makeTx(`t${i}`, "DAILY_LOGIN", 2),
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: txs,
        count: txs.length,
      }),
    });

    render(<CoinHistory pageSize={5} />);

    await waitFor(() => {
      expect(screen.getByText("Load More")).toBeInTheDocument();
    });
  });

  it("does not show Load More when no more pages", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [makeTx("t1", "DAILY_LOGIN", 2)],
        count: 1,
      }),
    });

    render(<CoinHistory />);

    await waitFor(() => {
      expect(screen.getByText("Daily login")).toBeInTheDocument();
    });
    expect(screen.queryByText("Load More")).not.toBeInTheDocument();
  });

  it("shows View claim link for claim-related transactions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [
          makeTx("t1", "VOTE_SPENT", -1, { refType: "claim", refId: "claim-123" }),
        ],
        count: 1,
      }),
    });

    render(<CoinHistory />);

    await waitFor(() => {
      const link = screen.getByText("View claim");
      expect(link).toHaveAttribute("href", "/claims/claim-123");
    });
  });

  it("passes filterType as query param", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [], count: 0 }),
    });

    render(<CoinHistory filterType="VOTE_SPENT" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("type=VOTE_SPENT"),
      );
    });
  });

  it("shows balance after each transaction", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transactions: [
          makeTx("t1", "SIGNUP_BONUS", 5, { balanceBefore: 0, balanceAfter: 5 }),
        ],
        count: 1,
      }),
    });

    render(<CoinHistory />);

    await waitFor(() => {
      expect(screen.getByText("bal: 5")).toBeInTheDocument();
    });
  });
});
