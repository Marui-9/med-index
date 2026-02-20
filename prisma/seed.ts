/**
 * Prisma seed script for HealthProof.
 *
 * Creates:
 * - 1 admin user (admin@healthproof.app)
 * - 25 gym/fitness health claims with associated markets
 * - Simulated vote counts on active/resolved markets
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *   # or via package.json:
 *   npm run db:seed
 *
 * Idempotent: uses upsert on admin user and checks for existing claims
 * by normalizedTitle before inserting.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEED_CLAIMS } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding HealthProof database...\n");

  // ── 1. Admin user ──────────────────────────────────────────────────────
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123!";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@healthproof.app" },
    update: { isAdmin: true, passwordHash: adminHash },
    create: {
      email: "admin@healthproof.app",
      name: "HealthProof Admin",
      passwordHash: adminHash,
      isAdmin: true,
      credits: 9999,
      reputation: 100,
      emailVerified: new Date(),
    },
  });

  console.log(`✓ Admin user: ${admin.email} (id: ${admin.id})`);

  // ── 2. Claims + Markets ────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;

  for (const seed of SEED_CLAIMS) {
    const normalizedTitle = seed.title.trim().toLowerCase();

    // Check for existing claim (idempotent)
    const existing = await prisma.claim.findUnique({
      where: { normalizedTitle },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.create({
        data: {
          title: seed.title,
          normalizedTitle,
          description: seed.description,
          difficulty: seed.difficulty,
          revealAt:
            seed.marketStatus === "RESOLVED"
              ? new Date(Date.now() - 24 * 60 * 60 * 1000) // Past for resolved
              : new Date(Date.now() + 6 * 60 * 60 * 1000), // Future for active
        },
      });

      await tx.market.create({
        data: {
          claimId: claim.id,
          status: seed.marketStatus,
          yesVotes: seed.yesVotes,
          noVotes: seed.noVotes,
          totalVotes: seed.yesVotes + seed.noVotes,
          aiVerdict: seed.aiVerdict ?? null,
          aiConfidence: seed.aiConfidence ?? null,
          consensusSummary: seed.consensusSummary ?? null,
          resolvedAt:
            seed.marketStatus === "RESOLVED" ? new Date() : null,
        },
      });
    });

    created++;
  }

  console.log(
    `✓ Claims: ${created} created, ${skipped} skipped (already exist)`,
  );
  console.log(`\n✅ Seed complete. Total claims: ${created + skipped}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
