import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spendVoteCoins } from "@/lib/coin-service";
import { actionLimiter } from "@/lib/rate-limit";

const claimIdSchema = z.string().min(1).max(100);

// ── POST /api/claims/[claimId]/vote ────────────────────────────────────────
// Authenticated users: place a YES/NO vote, deduct 1 coin.
// Returns the created vote with its 6-hour reveal timer.

const voteSchema = z.object({
  side: z.enum(["YES", "NO"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const limited = actionLimiter.check(request);
  if (limited) return limited;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { claimId: rawId } = await params;
    const idParse = claimIdSchema.safeParse(rawId);
    if (!idParse.success) {
      return NextResponse.json({ error: "Invalid claim ID" }, { status: 400 });
    }
    const claimId = idParse.data;

    // Validate body
    const body = await request.json();
    const parsed = voteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { side } = parsed.data;

    // Verify claim exists & is voteable
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { market: { select: { status: true } } },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (!claim.market || claim.market.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This claim is not open for voting" },
        { status: 400 },
      );
    }

    // Check if user already voted on this claim
    const existingVote = await prisma.claimVote.findUnique({
      where: {
        claimId_userId: {
          claimId,
          userId: session.user.id,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted on this claim" },
        { status: 409 },
      );
    }

    // Deduct 1 coin
    const coinResult = await spendVoteCoins(session.user.id, claimId);

    if (!coinResult.success) {
      return NextResponse.json(
        { error: coinResult.error || "Insufficient credits" },
        { status: 400 },
      );
    }

    const now = new Date();
    const revealAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours

    // Create vote + update market counts in a transaction
    const vote = await prisma.$transaction(async (tx) => {
      const newVote = await tx.claimVote.create({
        data: {
          claimId,
          userId: session.user.id,
          side,
          votedAt: now,
          revealAt,
        },
      });

      // Update denormalized market vote counts
      await tx.market.update({
        where: { claimId },
        data: {
          totalVotes: { increment: 1 },
          ...(side === "YES"
            ? { yesVotes: { increment: 1 } }
            : { noVotes: { increment: 1 } }),
        },
      });

      return newVote;
    });

    return NextResponse.json(
      {
        vote: {
          id: vote.id,
          side: vote.side,
          votedAt: vote.votedAt,
          revealAt: vote.revealAt,
        },
        newBalance: coinResult.newBalance,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Vote] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit vote" },
      { status: 500 },
    );
  }
}
