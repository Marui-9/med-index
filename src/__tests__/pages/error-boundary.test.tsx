/**
 * Tests for the global error boundary component
 *
 * Verifies: error message, error digest display, Try Again button, Go Home link.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import GlobalError from "@/app/error";

describe("Global Error Boundary", () => {
  const mockReset = vi.fn();
  const baseError = new Error("Test error") as Error & { digest?: string };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders error heading", () => {
    render(<GlobalError error={baseError} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders error description", () => {
    render(<GlobalError error={baseError} reset={mockReset} />);
    expect(
      screen.getByText(/An unexpected error occurred/),
    ).toBeInTheDocument();
  });

  it("shows error digest when present", () => {
    const errorWithDigest = Object.assign(new Error("fail"), {
      digest: "abc123",
    });
    render(<GlobalError error={errorWithDigest} reset={mockReset} />);
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });

  it("does not show digest when absent", () => {
    render(<GlobalError error={baseError} reset={mockReset} />);
    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
  });

  it("calls reset on Try Again click", async () => {
    render(<GlobalError error={baseError} reset={mockReset} />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Try Again"));

    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("has a Go Home link", () => {
    render(<GlobalError error={baseError} reset={mockReset} />);
    expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("logs error to console", () => {
    render(<GlobalError error={baseError} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith(
      "[HealthProof Error]",
      baseError,
    );
  });
});
