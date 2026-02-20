/**
 * Tests for essential pages: About, Privacy, Terms, Not Found
 *
 * These are static server-rendered pages, so tests verify that key
 * content renders correctly without any mocks.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Pages render <Header> which uses useSession via CoinBalance + UserMenu
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

// ── About Page ─────────────────────────────────────────────────────────────

import AboutPage from "@/app/about/page";

describe("About Page", () => {
  it("renders the page title", () => {
    render(<AboutPage />);
    expect(screen.getByText("About HealthProof")).toBeInTheDocument();
  });

  it("renders the mission section", () => {
    render(<AboutPage />);
    expect(screen.getByText("Our Mission")).toBeInTheDocument();
  });

  it("renders the how-it-works section", () => {
    render(<AboutPage />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });

  it("renders the coins explanation", () => {
    render(<AboutPage />);
    expect(screen.getByText(/Coins & Credits/)).toBeInTheDocument();
  });

  it("renders CTA links", () => {
    render(<AboutPage />);
    const claimLinks = screen.getAllByRole("link", { name: "Browse Claims" });
    expect(claimLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Create Account" })).toHaveAttribute(
      "href",
      "/auth/signup",
    );
  });

  it("mentions AI transparency", () => {
    render(<AboutPage />);
    expect(screen.getByText("AI Transparency")).toBeInTheDocument();
  });
});

// ── Privacy Page ───────────────────────────────────────────────────────────

import PrivacyPage from "@/app/privacy/page";

describe("Privacy Page", () => {
  it("renders the page title", () => {
    render(<PrivacyPage />);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("shows last updated date", () => {
    render(<PrivacyPage />);
    expect(screen.getByText("Last updated: February 20, 2026")).toBeInTheDocument();
  });

  it("renders all sections", () => {
    render(<PrivacyPage />);
    expect(screen.getByText("1. Information We Collect")).toBeInTheDocument();
    expect(screen.getByText("2. How We Use Your Information")).toBeInTheDocument();
    expect(screen.getByText("3. Data Sharing")).toBeInTheDocument();
    expect(screen.getByText(/4\. Cookies/)).toBeInTheDocument();
    expect(screen.getByText("5. Data Retention")).toBeInTheDocument();
    expect(screen.getByText("6. Your Rights")).toBeInTheDocument();
    expect(screen.getByText("7. Security")).toBeInTheDocument();
    expect(screen.getByText("8. Changes to This Policy")).toBeInTheDocument();
    expect(screen.getByText("9. Contact")).toBeInTheDocument();
  });

  it("includes contact email", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText("privacy@healthproof.app").length).toBeGreaterThan(0);
  });
});

// ── Terms Page ─────────────────────────────────────────────────────────────

import TermsPage from "@/app/terms/page";

describe("Terms Page", () => {
  it("renders the page title", () => {
    render(<TermsPage />);
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
  });

  it("shows last updated date", () => {
    render(<TermsPage />);
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it("renders all sections", () => {
    render(<TermsPage />);
    expect(screen.getByText("1. Acceptance of Terms")).toBeInTheDocument();
    expect(screen.getByText("2. Description of Service")).toBeInTheDocument();
    expect(screen.getByText("3. Not Medical Advice")).toBeInTheDocument();
    expect(screen.getByText("4. User Accounts")).toBeInTheDocument();
    expect(screen.getByText("5. Virtual Coins")).toBeInTheDocument();
    expect(screen.getByText("6. Acceptable Use")).toBeInTheDocument();
    expect(screen.getByText("7. Intellectual Property")).toBeInTheDocument();
    expect(screen.getByText("8. Limitation of Liability")).toBeInTheDocument();
    expect(screen.getByText("9. Account Termination")).toBeInTheDocument();
    expect(screen.getByText("10. Changes to Terms")).toBeInTheDocument();
    expect(screen.getByText("11. Contact")).toBeInTheDocument();
  });

  it("includes medical disclaimer", () => {
    render(<TermsPage />);
    expect(
      screen.getByText(/does not provide medical advice/),
    ).toBeInTheDocument();
  });

  it("explains coins have no monetary value", () => {
    render(<TermsPage />);
    expect(screen.getByText(/no monetary value/)).toBeInTheDocument();
  });
});

// ── Not Found Page ─────────────────────────────────────────────────────────

import NotFoundPage from "@/app/not-found";

describe("Not Found Page", () => {
  it("renders 404 text", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders page title", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
  });

  it("has Go Home link", () => {
    render(<NotFoundPage />);
    expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("has Browse Claims link", () => {
    render(<NotFoundPage />);
    const claimLinks = screen.getAllByRole("link", { name: "Browse Claims" });
    const ctaLink = claimLinks.find((l) => l.className.includes("border"));
    expect(ctaLink).toHaveAttribute("href", "/claims");
  });
});
