import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminLimiter } from "@/lib/rate-limit";

const claimIdSchema = z.string().min(1).max(100);

// ── POST /api/admin/claims/[claimId]/resolve ─────────────────────────────
// Admin-only: resolve a claim with an AI verdict and confidence score.

const resolveSchema = z.object({
  aiVerdict: z.enum(["YES", "NO"]),
  aiConfidence: z.number().min(0).max(1),
  consensusSummary: z.string().min(10).max(5000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> },
) {
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

    const { claimId: rawId } = await params;
    const idParse = claimIdSchema.safeParse(rawId);
    if (!idParse.success) {
      return NextResponse.json({ error: "Invalid claim ID" }, { status: 400 });
    }
    const claimId = idParse.data;
    const body = await request.json();
    const parsed = resolveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    // Ensure claim exists with market
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { market: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (!claim.market) {
      return NextResponse.json(
        { error: "Claim has no market" },
        { status: 400 },
      );
    }

    if (claim.market.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Claim is already resolved" },
        { status: 409 },
      );
    }

    const { aiVerdict, aiConfidence, consensusSummary } = parsed.data;

    // Update market with verdict
    const market = await prisma.market.update({
      where: { id: claim.market.id },
      data: {
        status: "RESOLVED",
        aiVerdict,
        aiConfidence,
        consensusSummary,
        resolvedAt: new Date(),
      },
    });

    // Also set the claim's revealAt to now so results are immediately visible
    await prisma.claim.update({
      where: { id: claimId },
      data: { revealAt: new Date() },
    });

    // Return full updated claim
    const full = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { market: true },
    });

    return NextResponse.json(full);
  } catch (error) {
    console.error("[Admin Resolve Claim] Error:", error);
    return NextResponse.json(
      { error: "Failed to resolve claim" },
      { status: 500 },
    );
  }
}
