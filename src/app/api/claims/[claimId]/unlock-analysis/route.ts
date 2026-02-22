import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unlockDeepAnalysis } from "@/lib/coin-service";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/claims/[claimId]/unlock-analysis
 * 
 * Phase 1: Unlock full research breakdown for a claim (5 coins)
 * Replaces the "skip timer" concept with meaningful content unlock
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { claimId } = await params;

    // Verify claim exists
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        market: {
          select: {
            status: true,
            aiConfidence: true,
            consensusSummary: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    // Check if research is complete
    if (!claim.market || claim.market.status === "RESEARCHING") {
      return NextResponse.json(
        { error: "Research not yet complete for this claim" },
        { status: 400 }
      );
    }

    // Unlock deep analysis (idempotent - won't charge twice)
    const result = await unlockDeepAnalysis(session.user.id, claimId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to unlock analysis" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Full research breakdown unlocked!",
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error("[Unlock Analysis] Error:", error);
    return NextResponse.json(
      { error: "Failed to unlock analysis" },
      { status: 500 }
    );
  }
}
