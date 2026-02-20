/**
 * Tests for environment validation (src/lib/env.ts)
 *
 * Verifies Zod-based env validation, production readiness checks,
 * and error formatting.
 */
import { describe, it, expect, vi } from "vitest";

// We import the functions directly — they read process.env at call time
import {
  validateEnv,
  checkProductionReadiness,
} from "@/lib/env";

// ── Helpers ──────────────────────────────────────────────────────────

const VALID_ENV: Record<string, string> = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
  AUTH_SECRET: "test-secret-32-chars-long-enough",
  NODE_ENV: "test",
};

function stubEnvs(vars: Record<string, string | undefined>) {
  // Clear env vars that could leak from .env.local
  const clearKeys = [
    "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
    "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET",
    "REDIS_URL", "OPENAI_API_KEY", "NCBI_API_KEY",
    "NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL",
    "DATABASE_URL", "AUTH_SECRET",
  ];
  for (const key of clearKeys) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

// ── validateEnv ─────────────────────────────────────────────────────

describe("validateEnv", () => {
  it("passes with valid required vars", () => {
    stubEnvs(VALID_ENV);
    const result = validateEnv();
    expect(result.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL);
    expect(result.AUTH_SECRET).toBe(VALID_ENV.AUTH_SECRET);
  });

  it("throws when DATABASE_URL is missing", () => {
    stubEnvs({ ...VALID_ENV, DATABASE_URL: "" });
    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
  });

  it("throws when AUTH_SECRET is missing", () => {
    stubEnvs({ ...VALID_ENV, AUTH_SECRET: "" });
    expect(() => validateEnv()).toThrow(/AUTH_SECRET/);
  });

  it("accepts optional vars when absent", () => {
    stubEnvs({ ...VALID_ENV, REDIS_URL: undefined, OPENAI_API_KEY: undefined });
    const result = validateEnv();
    expect(result.REDIS_URL).toBeUndefined();
    expect(result.OPENAI_API_KEY).toBeUndefined();
  });

  it("rejects invalid NEXT_PUBLIC_APP_URL", () => {
    stubEnvs({ ...VALID_ENV, NEXT_PUBLIC_APP_URL: "not-a-url" });
    expect(() => validateEnv()).toThrow();
  });

  it("accepts valid NEXT_PUBLIC_APP_URL", () => {
    stubEnvs({ ...VALID_ENV, NEXT_PUBLIC_APP_URL: "https://healthproof.me" });
    const result = validateEnv();
    expect(result.NEXT_PUBLIC_APP_URL).toBe("https://healthproof.me");
  });
});

// ── checkProductionReadiness ────────────────────────────────────────

describe("checkProductionReadiness", () => {
  it("returns ready=true when required vars are set", () => {
    const { ready, errors } = checkProductionReadiness(VALID_ENV);
    expect(ready).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it("returns ready=false when DATABASE_URL missing", () => {
    const { ready, errors } = checkProductionReadiness({ AUTH_SECRET: "secret" });
    expect(ready).toBe(false);
    expect(errors).toContain("DATABASE_URL not set");
  });

  it("warns about missing REDIS_URL", () => {
    const { warnings } = checkProductionReadiness(VALID_ENV);
    expect(warnings.some((w) => w.includes("REDIS_URL"))).toBe(true);
  });

  it("warns about missing OAuth providers", () => {
    const { warnings } = checkProductionReadiness(VALID_ENV);
    expect(warnings.some((w) => w.includes("OAuth"))).toBe(true);
  });

  it("warns about missing OPENAI_API_KEY", () => {
    const { warnings } = checkProductionReadiness(VALID_ENV);
    expect(warnings.some((w) => w.includes("OPENAI_API_KEY"))).toBe(true);
  });

  it("no OAuth warning when Google is configured", () => {
    const { warnings } = checkProductionReadiness({
      ...VALID_ENV,
      GOOGLE_CLIENT_ID: "goog-id",
      GOOGLE_CLIENT_SECRET: "goog-secret",
    });
    expect(warnings.some((w) => w.includes("OAuth"))).toBe(false);
  });
});
