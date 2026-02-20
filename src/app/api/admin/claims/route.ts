import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminLimiter } from "@/lib/rate-limit";

const adminListSchema = z.object({
  status: z.enum(["RESEARCHING", "ACTIVE", "RESOLVED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

// ── GET /api/admin/claims ────────────────────────────────────────────────
// Admin-only: list all claims with full market details + stats.

export async function GET(request: NextRequest) {
  const limited = adminLimiter.check(request);
  if (limited) return limited;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = adminListSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { status, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) {
      where.market = { status };
    }

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          market: true,
          _count: {
            select: {
              claimVotes: true,
              claimPapers: true,
              dossierJobs: true,
            },
          },
        },
      }),
      prisma.claim.count({ where }),
    ]);

    return NextResponse.json({
      claims,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[Admin Claims List] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 },
    );
  }
}
