/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup. Crashes early
 * with clear error messages instead of failing at random runtime points.
 *
 * Import this module in your root layout or instrumentation hook to
 * ensure variables are checked before any request is served.
 */
import { z } from "zod";

// ── Schema ──────────────────────────────────────────────────────────────

const envSchema = z.object({
  // Database (required)
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required — set your PostgreSQL connection string"),

  // Auth (required)
  AUTH_SECRET: z
    .string()
    .min(1, "AUTH_SECRET is required — generate with: openssl rand -base64 32"),

  // Redis (required for BullMQ; optional locally for dev)
  REDIS_URL: z.string().optional(),

  // OAuth (optional — at least one recommended)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // OpenAI (required for moderation + future RAG)
  OPENAI_API_KEY: z.string().optional(),

  // PubMed (optional — increases rate limits from 3/s to 10/s)
  NCBI_API_KEY: z.string().optional(),

  // App URL (optional — defaults to https://healthproof.me)
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// ── Validate ────────────────────────────────────────────────────────────

export type Env = z.infer<typeof envSchema>;

let _validated = false;

/**
 * Validate environment variables. Call once at startup.
 * Returns the parsed env object if valid, throws with detailed errors if not.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ✗ ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    const message = [
      "",
      "╔══════════════════════════════════════════════════════╗",
      "║        ENVIRONMENT VARIABLE VALIDATION FAILED       ║",
      "╠══════════════════════════════════════════════════════╣",
      "",
      errors,
      "",
      "  See .env.example for required variables.",
      "",
      "╚══════════════════════════════════════════════════════╝",
      "",
    ].join("\n");

    console.error(message);
    throw new Error(`Missing or invalid environment variables:\n${errors}`);
  }

  _validated = true;
  return result.data;
}

/**
 * Get validated env. Returns undefined for optional vars that aren't set.
 * Lazy-validates on first call.
 */
export function getEnv(): Env {
  if (!_validated) {
    return validateEnv();
  }
  return envSchema.parse(process.env);
}

/**
 * Check if required production vars are set.
 * Returns a list of warnings for vars that are missing but recommended.
 * Accepts an optional env object for testing (defaults to process.env).
 */
export function checkProductionReadiness(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): {
  ready: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required
  if (!env.DATABASE_URL) errors.push("DATABASE_URL not set");
  if (!env.AUTH_SECRET) errors.push("AUTH_SECRET not set");

  // Strongly recommended for production
  if (!env.REDIS_URL) warnings.push("REDIS_URL not set — BullMQ worker queue will not function");
  if (!env.OPENAI_API_KEY) warnings.push("OPENAI_API_KEY not set — moderation and AI features disabled");
  if (!env.NEXTAUTH_URL) warnings.push("NEXTAUTH_URL not set — auth redirects may fail");

  // At least one OAuth provider
  const hasGoogle = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET;
  const hasGitHub = env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET;
  if (!hasGoogle && !hasGitHub) {
    warnings.push("No OAuth provider configured — only credentials login available");
  }

  // Optional enhancements
  if (!env.NCBI_API_KEY) warnings.push("NCBI_API_KEY not set — PubMed rate limited to 3 req/sec");
  if (!env.NEXT_PUBLIC_APP_URL) warnings.push("NEXT_PUBLIC_APP_URL not set — using default https://healthproof.me");

  return {
    ready: errors.length === 0,
    errors,
    warnings,
  };
}
