/**
 * Tests for the Sign Up page component
 *
 * Verifies: form rendering, API call + auto sign-in flow,
 * newsletter checkbox, validation errors, duplicate user handling.
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

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import SignUpPage from "@/app/auth/signup/page";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SignUp Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sign-up form with all elements", () => {
    render(<SignUpPage />);

    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/subscribe to newsletter/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
    expect(screen.getByText(/continue with github/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it("calls signup API then signIn on successful submission", async () => {
    // Mock successful signup
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userId: "new-user", message: "ok" }),
    });
    // Mock successful sign-in
    mockSignIn.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText("Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "secure_pass_123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      // Verify signup API was called
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "John Doe",
          email: "john@example.com",
          password: "secure_pass_123",
          newsletter: false,
        }),
      });
    });

    // Verify auto sign-in after signup
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "john@example.com",
        password: "secure_pass_123",
        redirect: false,
      });
    });

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("sends newsletter: true when checkbox is checked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userId: "new-user" }),
    });
    mockSignIn.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText("Name"), "Jane");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "secure_pass_123");
    await user.click(screen.getByLabelText(/subscribe to newsletter/i));
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({
          body: expect.stringContaining('"newsletter":true'),
        })
      );
    });
  });

  it("shows error when signup API returns 409 (duplicate)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "An account with this email already exists.",
        }),
    });

    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText("Name"), "Test");
    await user.type(screen.getByLabelText("Email"), "exists@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /already exists/i
      );
    });

    // Should NOT attempt sign-in
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows error when signup API returns 400 (validation)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "Password must be at least 8 characters",
        }),
    });

    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText("Name"), "Test");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows loading state during submission", async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // hang

    const user = userEvent.setup();
    render(<SignUpPage />);

    await user.type(screen.getByLabelText("Name"), "Test");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });
  });

  it("calls signIn with google when Google button clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SignUpPage />);
    await user.click(screen.getByText(/continue with google/i));

    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });
});
