import { NextResponse } from "next/server";
import { checkProductionReadiness } from "@/lib/env";

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and Railway deploy checks.
 * Returns 200 if the app is running, with env readiness details.
 * Does NOT expose secret values — only presence/absence booleans.
 */
export async function GET() {
  const start = Date.now();
  const { ready, errors, warnings } = checkProductionReadiness();

  // Attempt a lightweight DB ping
  let dbConnected = false;
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    // DB unreachable — not fatal for health check response
  }

  // Attempt Redis ping
  let redisConnected = false;
  try {
    if (process.env.REDIS_URL) {
      const { redis } = await import("@/lib/redis");
      await redis.ping();
      redisConnected = true;
    }
  } catch {
    // Redis unreachable
  }

  const latencyMs = Date.now() - start;

  return NextResponse.json(
    {
      status: ready && dbConnected ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latencyMs,
      services: {
        database: dbConnected ? "connected" : "unreachable",
        redis: redisConnected
          ? "connected"
          : process.env.REDIS_URL
            ? "unreachable"
            : "not configured",
      },
      env: {
        ready,
        errors,
        warnings,
      },
      version: process.env.npm_package_version || "unknown",
      nodeEnv: process.env.NODE_ENV || "development",
    },
    { status: ready && dbConnected ? 200 : 503 },
  );
}
