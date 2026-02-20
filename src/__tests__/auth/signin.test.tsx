/**
 * Tests for the Sign In page component
 *
 * Verifies: form rendering, credential submission via signIn(),
 * OAuth button clicks, error display, loading states.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignIn = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import SignInPage from "@/app/auth/signin/page";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SignIn Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sign-in form with all elements", () => {
    render(<SignInPage />);

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
    expect(screen.getByText(/continue with github/i)).toBeInTheDocument();
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
  });

  it("submits credentials and redirects on success", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "password123",
        redirect: false,
      });
    });

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows error on invalid credentials", async () => {
    mockSignIn.mockResolvedValue({ error: "CredentialsSignin" });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText("Email"), "wrong@example.com");
    await user.type(screen.getByLabelText("Password"), "badpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /invalid email or password/i
      );
    });

    // Should NOT redirect
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("calls signIn with google provider when Google button clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.click(screen.getByText(/continue with google/i));

    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });

  it("calls signIn with github provider when GitHub button clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.click(screen.getByText(/continue with github/i));

    expect(mockSignIn).toHaveBeenCalledWith("github", { callbackUrl: "/" });
  });

  it("shows loading state while submitting", async () => {
    // Make signIn hang to keep loading state visible
    mockSignIn.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
  });

  it("disables form fields while loading", async () => {
    mockSignIn.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeDisabled();
      expect(screen.getByLabelText("Password")).toBeDisabled();
    });
  });
});
