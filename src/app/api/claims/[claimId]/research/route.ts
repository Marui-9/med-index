import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueDossierJob } from "@/lib/queue";
import { actionLimiter } from "@/lib/rate-limit";

const claimIdSchema = z.string().min(1).max(100);

// ── POST /api/claims/[claimId]/research ────────────────────────────────────
// Trigger dossier generation for a claim.
// Admin-only for now; enqueues a BullMQ job and returns the DossierJob ID.

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
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { claimId: rawId } = await params;
    const idParse = claimIdSchema.safeParse(rawId);
    if (!idParse.success) {
      return NextResponse.json({ error: "Invalid claim ID" }, { status: 400 });
    }
    const claimId = idParse.data;

    // Verify claim exists
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: { id: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Check for an already running/queued job
    const existingJob = await prisma.dossierJob.findFirst({
      where: {
        claimId,
        status: { in: ["QUEUED", "RUNNING"] },
      },
    });

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.status,
        message: "Research is already in progress for this claim",
      });
    }

    // Create DossierJob record
    const dossierJob = await prisma.dossierJob.create({
      data: {
        claimId,
        requestHash: `research-${claimId}-${Date.now()}`,
      },
    });

    // Enqueue BullMQ job
    await enqueueDossierJob(claimId, session.user.id);

    return NextResponse.json(
      {
        jobId: dossierJob.id,
        status: "QUEUED",
        message: "Research started",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Research Trigger] Error:", error);
    return NextResponse.json(
      { error: "Failed to start research" },
      { status: 500 },
    );
  }
}
