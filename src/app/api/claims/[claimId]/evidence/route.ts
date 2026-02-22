import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readLimiter } from "@/lib/rate-limit";

const claimIdSchema = z.string().min(1).max(100);

const querySchema = z.object({
  sort: z.enum(["relevance", "recency", "studyType"]).default("relevance"),
  stance: z.enum(["SUPPORTS", "REFUTES", "NEUTRAL"]).optional(),
});

// ── GET /api/claims/[claimId]/evidence ─────────────────────────────────────
// Returns evidence cards (ClaimPaper records) for a claim.
// Each card includes: paper title, year, study type, stance, AI summary,
// confidence, sample size.

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

    // Parse query params
    const rawParams = Object.fromEntries(request.nextUrl.searchParams);
    const qParse = querySchema.safeParse(rawParams);
    if (!qParse.success) {
      return NextResponse.json(
        { error: qParse.error.errors[0].message },
        { status: 400 },
      );
    }
    const { sort, stance } = qParse.data;

    // Verify claim exists
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: { id: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Build filter
    const where: Record<string, unknown> = { claimId };
    if (stance) {
      where.stance = stance;
    }
    // Only return papers that have been processed (have an AI summary)
    where.aiSummary = { not: null };

    // Build sort order
    let orderBy: Record<string, string>;
    switch (sort) {
      case "recency":
        orderBy = { createdAt: "desc" };
        break;
      case "studyType":
        orderBy = { studyType: "asc" };
        break;
      case "relevance":
      default:
        orderBy = { confidenceScore: "desc" };
        break;
    }

    const claimPapers = await prisma.claimPaper.findMany({
      where,
      orderBy,
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            doi: true,
            pmid: true,
            arxivId: true,
            journal: true,
            publishedYear: true,
            authors: true,
            fullTextUrl: true,
          },
        },
      },
    });

    const evidence = claimPapers.map((cp) => ({
      id: cp.id,
      paperId: cp.paper.id,
      paperTitle: cp.paper.title,
      doi: cp.paper.doi,
      pmid: cp.paper.pmid,
      arxivId: cp.paper.arxivId,
      journal: cp.paper.journal,
      publishedYear: cp.paper.publishedYear,
      authors: cp.paper.authors,
      fullTextUrl: cp.paper.fullTextUrl,
      studyType: cp.studyType,
      stance: cp.stance,
      summary: cp.aiSummary,
      abstractSnippet: cp.abstractSnippet,
      sampleSize: cp.sampleSize,
      confidenceScore: cp.confidenceScore,
      extractionVersion: cp.extractionVersion,
      createdAt: cp.createdAt,
    }));

    return NextResponse.json({
      claimId,
      count: evidence.length,
      evidence,
    });
  } catch (error) {
    console.error("[Evidence] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch evidence" },
      { status: 500 },
    );
  }
}
