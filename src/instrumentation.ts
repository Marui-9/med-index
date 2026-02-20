/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the server starts. Used to validate env vars
 * before any requests are served. See:
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only validate on the server (not edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env");
    try {
      validateEnv();
      console.log("✓ Environment variables validated");
    } catch (error) {
      // In development, log but don't crash (env might be partially set)
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
      console.warn("⚠ Environment validation warnings (non-fatal in dev)");
    }
  }
}
