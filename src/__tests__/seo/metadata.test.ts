/**
 * Tests for SEO metadata (Step 10).
 *
 * Verifies robots.ts, sitemap.ts, and metadata exports on pages.
 */
import { describe, it, expect, vi } from "vitest";

// Mock auth to avoid ESM issues when importing server-component pages
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock geist fonts (ESM directory import issue in vitest)
vi.mock("geist/font/sans", () => ({
  GeistSans: { variable: "font-geist-sans" },
}));
vi.mock("geist/font/mono", () => ({
  GeistMono: { variable: "font-geist-mono" },
}));

// Mock session provider used in layout
vi.mock("@/components/session-provider", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock components that use client hooks (to avoid useSession errors)
vi.mock("@/components/header", () => ({
  Header: () => null,
}));
vi.mock("@/components/footer", () => ({
  Footer: () => null,
}));
vi.mock("@/components/daily-login-banner", () => ({
  DailyLoginBanner: () => null,
}));
vi.mock("@/components/coin-history", () => ({
  CoinHistory: () => null,
}));
vi.mock("@/components/claims-list", () => ({
  ClaimsList: () => null,
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// ── robots.ts ───────────────────────────────────────────────────────

describe("robots.ts", () => {
  it("exports a function that returns valid robots config", async () => {
    const mod = await import("@/app/robots");
    const result = mod.default();

    expect(result).toHaveProperty("rules");
    expect(result).toHaveProperty("sitemap");
    expect(Array.isArray(result.rules)).toBe(true);

    const rule = result.rules[0];
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toContain("/api/");
    expect(rule.disallow).toContain("/admin/");
    expect(rule.disallow).toContain("/dashboard/");
  });
});

// ── sitemap.ts ──────────────────────────────────────────────────────

describe("sitemap.ts", () => {
  const mockFindMany = vi.fn();

  vi.mock("@/lib/prisma", () => ({
    prisma: {
      claim: {
        findMany: (...a: unknown[]) => mockFindMany(...a),
      },
    },
  }));

  it("returns static pages even when DB is empty", async () => {
    mockFindMany.mockResolvedValue([]);
    const mod = await import("@/app/sitemap");
    const result = await mod.default();

    expect(Array.isArray(result)).toBe(true);
    const urls = result.map((r) => r.url);
    expect(urls.some((u) => u.endsWith("/claims"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/about"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/privacy"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/terms"))).toBe(true);
  });

  it("includes dynamic claim pages from DB", async () => {
    mockFindMany.mockResolvedValue([
      { id: "claim-1", updatedAt: new Date("2026-01-15") },
      { id: "claim-2", updatedAt: new Date("2026-01-20") },
    ]);

    // Clear module cache to re-import
    vi.resetModules();
    vi.mock("@/lib/prisma", () => ({
      prisma: {
        claim: {
          findMany: () =>
            Promise.resolve([
              { id: "claim-1", updatedAt: new Date("2026-01-15") },
              { id: "claim-2", updatedAt: new Date("2026-01-20") },
            ]),
        },
      },
    }));
    const mod = await import("@/app/sitemap");
    const result = await mod.default();

    const urls = result.map((r) => r.url);
    expect(urls.some((u) => u.includes("/claims/claim-1"))).toBe(true);
    expect(urls.some((u) => u.includes("/claims/claim-2"))).toBe(true);
  });
});

// ── Page metadata exports ───────────────────────────────────────────

describe("page metadata exports", () => {
  it("home page exports metadata with title", async () => {
    // We can't import the full page (it uses server components),
    // but we can verify the exported metadata object.
    const mod = await import("@/app/page");
    expect(mod.metadata).toBeDefined();
    expect(mod.metadata.title).toContain("HealthProof");
    expect(mod.metadata.description).toBeDefined();
    expect(mod.metadata.alternates?.canonical).toBe("/");
  });

  it("claims page exports metadata with title", async () => {
    const mod = await import("@/app/claims/page");
    expect(mod.metadata).toBeDefined();
    expect(mod.metadata.title).toBe("Browse Health Claims");
    expect(mod.metadata.alternates?.canonical).toBe("/claims");
  });

  it("dashboard page exports noindex metadata", async () => {
    const mod = await import("@/app/dashboard/page");
    expect(mod.metadata).toBeDefined();
    const robots = mod.metadata.robots as { index: boolean; follow: boolean };
    expect(robots.index).toBe(false);
  });
});

// ── Root layout metadata ────────────────────────────────────────────

describe("root layout metadata", () => {
  it("has metadataBase and openGraph images", async () => {
    const mod = await import("@/app/layout");
    const meta = mod.metadata;

    expect(meta.metadataBase).toBeDefined();
    expect(meta.openGraph).toBeDefined();
    expect((meta.openGraph as any).images).toBeDefined();
    expect(meta.twitter).toBeDefined();
    expect((meta.twitter as any).images).toBeDefined();
    expect(meta.icons).toBeDefined();
  });
});
