import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readLimiter } from "@/lib/rate-limit";

const claimIdSchema = z.string().min(1).max(100);

// ── GET /api/claims/[claimId] ──────────────────────────────────────────────
// Public: get a single claim with market data and (optionally) the
// current user's vote status.

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

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        market: {
          select: {
            id: true,
            status: true,
            yesVotes: true,
            noVotes: true,
            totalVotes: true,
            aiVerdict: true,
            aiConfidence: true,
            consensusSummary: true,
            resolvedAt: true,
          },
        },
        claimPapers: {
          select: {
            id: true,
            stance: true,
            aiSummary: true,
            studyType: true,
            sampleSize: true,
            paper: {
              select: {
                title: true,
                journal: true,
                publishedYear: true,
                authors: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // If the user is logged in, include their vote for this claim
    let userVote: { side: string; votedAt: Date; revealAt: Date; revealed: boolean } | null = null;

    const session = await auth();
    if (session?.user?.id) {
      const vote = await prisma.claimVote.findUnique({
        where: {
          claimId_userId: {
            claimId,
            userId: session.user.id,
          },
        },
        select: { side: true, votedAt: true, revealAt: true, revealed: true },
      });
      userVote = vote;
    }

    return NextResponse.json({ ...claim, userVote });
  } catch (error) {
    console.error("[Claim Detail] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch claim" },
      { status: 500 },
    );
  }
}
