import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readLimiter } from "@/lib/rate-limit";

const claimIdSchema = z.string().min(1).max(100);

// ── GET /api/claims/[claimId]/verdict ──────────────────────────────────────
// Returns the AI verdict for a claim.
//
// Free tier: short summary + verdict + confidence + strength.
// Unlocked (5 coins via /unlock-analysis): adds detailed summary, caveats,
// "what would change verdict", and recommended action.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const limited = readLimiter.check(request);
  if (limited) return limited;

  try {
    const { claimId: rawId } = await params;
    const idParse = claimIdSchema.safeParse(rawId);
    if (!idParse.success) {
      return NextResponse.json({ error: "Invalid claim ID" }, { status: 400 });
    }
    const claimId = idParse.data;

    // Get market data with AI verdict
    const market = await prisma.market.findUnique({
      where: { claimId },
      select: {
        aiConfidence: true,
        aiVerdict: true,
        consensusSummary: true,
        lastDossierAt: true,
        status: true,
      },
    });

    if (!market) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (market.aiConfidence == null) {
      return NextResponse.json({
        available: false,
        status: market.status,
        message: "AI verdict not yet available. Research may still be in progress.",
      });
    }

    // Check if user has unlocked deep analysis
    const session = await auth();
    let unlocked = false;

    if (session?.user?.id) {
      const unlock = await prisma.creditEvent.findFirst({
        where: {
          userId: session.user.id,
          type: "DEEP_ANALYSIS_UNLOCK",
          refId: claimId,
        },
      });
      unlocked = !!unlock;
    }

    // --- Extract verdict details from consensusSummary ---
    // The consensusSummary stores the detailedSummary from the SynthesisVerdict.
    // For the "locked" tier, we produce a truncated version.

    // Map aiVerdict (YES/NO/null) to verdict label
    const verdictLabel = mapVerdictLabel(market.aiVerdict, market.aiConfidence);

    // Free response (always returned)
    const response: Record<string, unknown> = {
      available: true,
      verdict: verdictLabel,
      aiVerdict: market.aiVerdict,
      confidence: market.aiConfidence,
      lastUpdated: market.lastDossierAt,
      unlocked,
    };

    if (unlocked) {
      // Full deep analysis
      response.detailedSummary = market.consensusSummary;
    } else {
      // Free tier: first sentence of consensus summary
      response.shortSummary = extractFirstSentence(market.consensusSummary);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Verdict] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch verdict" },
      { status: 500 },
    );
  }
}

/**
 * Map YES/NO/null verdict to a display label.
 */
function mapVerdictLabel(
  aiVerdict: string | null,
  confidence: number | null,
): string {
  if (aiVerdict === "YES") return "Supported";
  if (aiVerdict === "NO") return "Contradicted";
  if (confidence != null && confidence >= 0.4) return "Mixed";
  return "Insufficient";
}

/**
 * Extract the first sentence from a text block for the free-tier summary.
 */
function extractFirstSentence(text: string | null): string {
  if (!text) return "No summary available.";
  // Match up to the first sentence-ending punctuation followed by a space or end
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1] : text.slice(0, 200);
}
