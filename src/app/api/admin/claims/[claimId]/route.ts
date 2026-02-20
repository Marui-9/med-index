import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminLimiter } from "@/lib/rate-limit";

const claimIdSchema = z.string().min(1).max(100);

// ── PATCH /api/admin/claims/[claimId] ────────────────────────────────────
// Admin-only: update claim title, description, difficulty, status.

const updateClaimSchema = z.object({
  title: z.string().min(10).max(500).optional(),
  description: z.string().max(2000).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  status: z.enum(["RESEARCHING", "ACTIVE", "RESOLVED"]).optional(),
});

export async function PATCH(
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
    const parsed = updateClaimSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    // Ensure claim exists
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { market: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const { title, description, difficulty, status } = parsed.data;

    // Build claim update
    const claimUpdate: Record<string, unknown> = {};
    if (title !== undefined) {
      claimUpdate.title = title.trim();
      claimUpdate.normalizedTitle = title.trim().toLowerCase();
    }
    if (description !== undefined) {
      claimUpdate.description = description.trim() || null;
    }
    if (difficulty !== undefined) {
      claimUpdate.difficulty = difficulty;
    }

    // Update claim
    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: claimUpdate,
    });

    // Update market status if provided
    if (status !== undefined && claim.market) {
      await prisma.market.update({
        where: { id: claim.market.id },
        data: {
          status,
          ...(status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
        },
      });
    }

    // Return full claim with market
    const full = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { market: true },
    });

    return NextResponse.json(full);
  } catch (error) {
    console.error("[Admin Update Claim] Error:", error);
    return NextResponse.json(
      { error: "Failed to update claim" },
      { status: 500 },
    );
  }
}

// ── DELETE /api/admin/claims/[claimId] ───────────────────────────────────
// Admin-only: permanently delete a claim and all related data.

export async function DELETE(
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
    const deleteIdParse = claimIdSchema.safeParse(rawId);
    if (!deleteIdParse.success) {
      return NextResponse.json({ error: "Invalid claim ID" }, { status: 400 });
    }
    const claimId = deleteIdParse.data;

    // Ensure claim exists
    const claim = await prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Cascade delete (schema has onDelete: Cascade for most relations)
    await prisma.claim.delete({ where: { id: claimId } });

    return NextResponse.json({ deleted: true, id: claimId });
  } catch (error) {
    console.error("[Admin Delete Claim] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete claim" },
      { status: 500 },
    );
  }
}
