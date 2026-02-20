/**
 * Tests for Admin UI components: AdminClaimRow, AdminCreateClaim, AdminResolveModal
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminClaimRow } from "@/components/admin/claim-row";
import { AdminCreateClaim } from "@/components/admin/create-claim";
import { AdminResolveModal } from "@/components/admin/resolve-modal";

// ── Test data ──────────────────────────────────────────────────────────────

const activeClaim = {
  id: "claim-1",
  title: "Creatine monohydrate increases lean muscle mass",
  difficulty: "EASY",
  market: {
    status: "ACTIVE",
    yesVotes: 100,
    noVotes: 12,
    totalVotes: 112,
    aiVerdict: null as string | null,
    aiConfidence: null as number | null,
  },
  _count: { claimVotes: 112, claimPapers: 3, dossierJobs: 1 },
};

const resolvedClaim = {
  id: "claim-2",
  title: "BCAAs are unnecessary if protein intake is adequate",
  difficulty: "MEDIUM",
  market: {
    status: "RESOLVED",
    yesVotes: 128,
    noVotes: 34,
    totalVotes: 162,
    aiVerdict: "YES" as string | null,
    aiConfidence: 0.88 as number | null,
  },
  _count: { claimVotes: 162, claimPapers: 5, dossierJobs: 2 },
};

const researchingClaim = {
  id: "claim-3",
  title: "Mouth taping during sleep improves recovery and athletic performance",
  difficulty: "HARD",
  market: {
    status: "RESEARCHING",
    yesVotes: 0,
    noVotes: 0,
    totalVotes: 0,
    aiVerdict: null as string | null,
    aiConfidence: null as number | null,
  },
  _count: { claimVotes: 0, claimPapers: 0, dossierJobs: 0 },
};

// ── AdminClaimRow ──────────────────────────────────────────────────────────

describe("AdminClaimRow", () => {
  const mockDelete = vi.fn();
  const mockStatusChange = vi.fn();
  const mockResolve = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderRow(claim: typeof activeClaim) {
    return render(
      <table>
        <tbody>
          <AdminClaimRow
            claim={claim}
            onDelete={mockDelete}
            onStatusChange={mockStatusChange}
            onResolve={mockResolve}
          />
        </tbody>
      </table>,
    );
  }

  it("renders claim title and vote counts", () => {
    renderRow(activeClaim);
    expect(screen.getByText(/Creatine monohydrate/)).toBeInTheDocument();
    expect(screen.getByText("112 votes")).toBeInTheDocument();
    expect(screen.getByText("3 papers")).toBeInTheDocument();
  });

  it("renders difficulty badge", () => {
    renderRow(activeClaim);
    expect(screen.getByText("EASY")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    renderRow(activeClaim);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("shows Resolve button for active claims", () => {
    renderRow(activeClaim);
    expect(screen.getByText("Resolve")).toBeInTheDocument();
  });

  it("does not show Resolve button for resolved claims", () => {
    renderRow(resolvedClaim);
    expect(screen.queryByText("Resolve")).not.toBeInTheDocument();
  });

  it("shows Activate button for researching claims", () => {
    renderRow(researchingClaim);
    expect(screen.getByText("Activate")).toBeInTheDocument();
  });

  it("shows verdict for resolved claims", () => {
    renderRow(resolvedClaim);
    expect(screen.getByText("YES")).toBeInTheDocument();
    expect(screen.getByText("(88%)")).toBeInTheDocument();
  });

  it("shows Delete button for all claims", () => {
    renderRow(activeClaim);
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onDelete when Delete is clicked", async () => {
    renderRow(activeClaim);
    fireEvent.click(screen.getByText("Delete"));
    expect(mockDelete).toHaveBeenCalledWith("claim-1");
  });

  it("calls onResolve when Resolve is clicked", async () => {
    renderRow(activeClaim);
    fireEvent.click(screen.getByText("Resolve"));
    expect(mockResolve).toHaveBeenCalled();
  });

  it("calls onStatusChange when Activate is clicked", async () => {
    renderRow(researchingClaim);
    fireEvent.click(screen.getByText("Activate"));
    expect(mockStatusChange).toHaveBeenCalledWith("claim-3", "ACTIVE");
  });

  it("shows vote percentages", () => {
    renderRow(activeClaim);
    expect(screen.getByText("(89%)")).toBeInTheDocument(); // 100/112 ≈ 89%
  });
});

// ── AdminCreateClaim ───────────────────────────────────────────────────────

describe("AdminCreateClaim", () => {
  const mockCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders create form fields", () => {
    render(<AdminCreateClaim onCreated={mockCreated} />);
    expect(screen.getByLabelText(/Claim Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Difficulty/)).toBeInTheDocument();
    expect(screen.getByText("Create Claim")).toBeInTheDocument();
  });

  it("disables submit when title is too short", () => {
    render(<AdminCreateClaim onCreated={mockCreated} />);
    const button = screen.getByText("Create Claim");
    expect(button).toBeDisabled();
  });

  it("submits form and calls onCreated on success", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "new-claim" }),
    });

    render(<AdminCreateClaim onCreated={mockCreated} />);

    await user.type(
      screen.getByLabelText(/Claim Title/),
      "This is a test claim that is long enough",
    );
    await user.click(screen.getByText("Create Claim"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/claims",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(mockCreated).toHaveBeenCalled();
    });
  });

  it("shows error message on failure", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Duplicate claim" }),
    });

    render(<AdminCreateClaim onCreated={mockCreated} />);

    await user.type(
      screen.getByLabelText(/Claim Title/),
      "This is a test claim that is long enough",
    );
    await user.click(screen.getByText("Create Claim"));

    await waitFor(() => {
      expect(screen.getByText("Duplicate claim")).toBeInTheDocument();
    });
  });
});

// ── AdminResolveModal ──────────────────────────────────────────────────────

describe("AdminResolveModal", () => {
  const mockClose = vi.fn();
  const mockResolved = vi.fn();
  const claim = { id: "claim-1", title: "Creatine increases muscle mass" };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders claim title and form fields", () => {
    render(
      <AdminResolveModal
        claim={claim}
        onClose={mockClose}
        onResolved={mockResolved}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Resolve Claim" }),
    ).toBeInTheDocument();
    expect(screen.getByText(claim.title)).toBeInTheDocument();
    expect(screen.getByText("YES — Supported")).toBeInTheDocument();
    expect(screen.getByText("NO — Refuted")).toBeInTheDocument();
    expect(screen.getByLabelText(/Confidence/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Consensus Summary/)).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    render(
      <AdminResolveModal
        claim={claim}
        onClose={mockClose}
        onResolved={mockResolved}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockClose).toHaveBeenCalled();
  });

  it("submits resolve form and calls onResolved", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "claim-1" }),
    });

    render(
      <AdminResolveModal
        claim={claim}
        onClose={mockClose}
        onResolved={mockResolved}
      />,
    );

    await user.type(
      screen.getByLabelText(/Consensus Summary/),
      "Meta-analyses consistently show creatine improves lean body mass in resistance-trained individuals.",
    );

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Resolve Claim/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/claims/claim-1/resolve`,
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(mockResolved).toHaveBeenCalled();
    });
  });

  it("shows error on resolve failure", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Already resolved" }),
    });

    render(
      <AdminResolveModal
        claim={claim}
        onClose={mockClose}
        onResolved={mockResolved}
      />,
    );

    await user.type(
      screen.getByLabelText(/Consensus Summary/),
      "Meta-analyses consistently show creatine improves lean body mass in resistance-trained individuals.",
    );
    await user.click(screen.getByRole("button", { name: /Resolve Claim/i }));

    await waitFor(() => {
      expect(screen.getByText("Already resolved")).toBeInTheDocument();
    });
  });
});
