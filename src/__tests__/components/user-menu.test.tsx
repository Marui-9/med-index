/**
 * Tests for the UserMenu component
 *
 * Verifies: unauthenticated state (Sign In / Sign Up links),
 * authenticated state (credits, rep, dropdown, sign out).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockSignOut = vi.fn();
let mockSession: unknown = null;
let mockStatus: string = "unauthenticated";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession, status: mockStatus }),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

import { UserMenu } from "@/components/user-menu";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockStatus = "unauthenticated";
  });

  it("shows Sign In and Sign Up links when not authenticated", () => {
    render(<UserMenu />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Sign Up")).toBeInTheDocument();
  });

  it("shows loading skeleton when session is loading", () => {
    mockStatus = "loading";
    const { container } = render(<UserMenu />);

    // Should show animated skeleton div
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });

  it("shows credits and reputation when authenticated", () => {
    mockStatus = "authenticated";
    mockSession = {
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        credits: 42,
        reputation: 150,
      },
    };

    render(<UserMenu />);

    expect(screen.getByText("42 credits")).toBeInTheDocument();
    expect(screen.getByText("150 rep")).toBeInTheDocument();
  });

  it("shows user initial in avatar button", () => {
    mockStatus = "authenticated";
    mockSession = {
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        credits: 10,
        reputation: 0,
      },
    };

    render(<UserMenu />);

    expect(screen.getByLabelText("User menu")).toHaveTextContent("T");
  });

  it("opens dropdown menu on avatar click", async () => {
    mockStatus = "authenticated";
    mockSession = {
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        credits: 10,
        reputation: 0,
      },
    };

    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByLabelText("User menu"));

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("calls signOut when Sign Out is clicked", async () => {
    mockStatus = "authenticated";
    mockSession = {
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        credits: 10,
        reputation: 0,
      },
    };

    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByLabelText("User menu"));
    await user.click(screen.getByText("Sign Out"));

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("closes dropdown when clicking outside", async () => {
    mockStatus = "authenticated";
    mockSession = {
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        credits: 10,
        reputation: 0,
      },
    };

    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <UserMenu />
      </div>
    );

    // Open menu
    await user.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Sign Out")).toBeInTheDocument();

    // Click outside
    await user.click(screen.getByTestId("outside"));

    await waitFor(() => {
      expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
    });
  });

  it("uses email initial if name is not set", () => {
    mockStatus = "authenticated";
    mockSession = {
      user: {
        id: "user-1",
        name: null,
        email: "alice@example.com",
        credits: 0,
        reputation: 0,
      },
    };

    render(<UserMenu />);

    expect(screen.getByLabelText("User menu")).toHaveTextContent("A");
  });
});
