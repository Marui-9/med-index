import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readLimiter, actionLimiter } from "@/lib/rate-limit";

// ── GET /api/claims ────────────────────────────────────────────────────────
// Public: list claims with optional filters and cursor-based pagination.

const listQuerySchema = z.object({
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  status: z.enum(["RESEARCHING", "ACTIVE", "RESOLVED"]).optional(),
  search: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  const limited = readLimiter.check(request);
  if (limited) return limited;

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { difficulty, status, search, cursor, limit } = parsed.data;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (difficulty) where.difficulty = difficulty;

    if (status) {
      where.market = { status };
    }

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    // Cursor-based pagination
    const findArgs: Record<string, unknown> = {
      where,
      take: limit + 1, // Fetch one extra to detect next page
      orderBy: { createdAt: "desc" as const },
      include: {
        market: {
          select: {
            status: true,
            yesVotes: true,
            noVotes: true,
            totalVotes: true,
            aiVerdict: true,
            aiConfidence: true,
          },
        },
      },
    };

    if (cursor) {
      findArgs.cursor = { id: cursor };
      findArgs.skip = 1; // Skip the cursor item itself
    }

    const claims = await prisma.claim.findMany(findArgs as any);

    // Determine if there's a next page
    let nextCursor: string | null = null;
    if (claims.length > limit) {
      const next = claims.pop(); // Remove the extra item
      nextCursor = next!.id;
    }

    return NextResponse.json({
      claims,
      nextCursor,
    });
  } catch (error) {
    console.error("[Claims List] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 },
    );
  }
}

// ── POST /api/claims ───────────────────────────────────────────────────────
// Admin-only: create a new claim with an associated market.

const createClaimSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(500),
  description: z.string().max(2000).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
});

export async function POST(request: NextRequest) {
  const limited = actionLimiter.check(request);
  if (limited) return limited;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createClaimSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { title, description, difficulty } = parsed.data;
    const normalizedTitle = title.trim().toLowerCase();

    // Check for duplicate
    const existing = await prisma.claim.findUnique({
      where: { normalizedTitle },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A claim with this title already exists" },
        { status: 409 },
      );
    }

    // Create claim + market in a transaction
    const claim = await prisma.$transaction(async (tx) => {
      const newClaim = await tx.claim.create({
        data: {
          title: title.trim(),
          normalizedTitle,
          description: description?.trim() || null,
          difficulty,
          revealAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
        },
      });

      await tx.market.create({
        data: {
          claimId: newClaim.id,
          status: "ACTIVE",
        },
      });

      return newClaim;
    });

    // Re-fetch with market for the response
    const full = await prisma.claim.findUnique({
      where: { id: claim.id },
      include: {
        market: {
          select: {
            id: true,
            status: true,
            yesVotes: true,
            noVotes: true,
            totalVotes: true,
          },
        },
      },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error("[Create Claim] Error:", error);
    return NextResponse.json(
      { error: "Failed to create claim" },
      { status: 500 },
    );
  }
}
