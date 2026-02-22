import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readLimiter } from "@/lib/rate-limit";

const claimIdSchema = z.string().min(1).max(100);

// ── GET /api/claims/[claimId]/research/status ──────────────────────────────
// Poll dossier job progress for a claim.
// Returns the latest job's status, progress (0-100), and any error.

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

    // Get the most recent dossier job for this claim
    const job = await prisma.dossierJob.findFirst({
      where: { claimId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        progress: true,
        error: true,
        startedAt: true,
        finishedAt: true,
        createdAt: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { status: "NONE", progress: 0, message: "No research has been started" },
      );
    }

    // Build step label from progress
    const stepLabel = getStepLabel(job.progress);

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      stepLabel,
      error: job.error,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      createdAt: job.createdAt,
    });
  } catch (error) {
    console.error("[Research Status] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch research status" },
      { status: 500 },
    );
  }
}

/**
 * Map progress percentage to a human-readable step label.
 */
function getStepLabel(progress: number): string {
  if (progress < 10) return "Queued";
  if (progress < 15) return "Loading claim";
  if (progress < 25) return "Searching papers";
  if (progress < 30) return "Deduplicating results";
  if (progress < 40) return "Storing papers";
  if (progress < 55) return "Generating embeddings";
  if (progress < 60) return "Finding relevant passages";
  if (progress < 85) return "Extracting evidence";
  if (progress < 95) return "Synthesizing verdict";
  if (progress < 100) return "Saving results";
  return "Complete";
}
