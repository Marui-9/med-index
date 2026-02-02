/**
 * Dossier Worker
 * 
 * This worker processes dossier generation jobs.
 * Run separately from the Next.js app: `npm run worker`
 * 
 * For Railway: Deploy as a separate service or use a Procfile.
 */

import { Worker, Job } from "bullmq";
import { createRedisConnection } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { QUEUE_NAMES, DossierJobData } from "@/lib/queue";

// Placeholder for the actual dossier generation logic
// This will be implemented in Phase 1
async function processDossierJob(job: Job<DossierJobData>): Promise<void> {
  const { claimId } = job.data;

  console.log(`[Dossier Worker] Starting job for claim: ${claimId}`);

  try {
    // Update job status in database
    await prisma.dossierJob.updateMany({
      where: { claimId, status: "QUEUED" },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    // Step 1: Fetch claim details
    await job.updateProgress(10);
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      throw new Error(`Claim not found: ${claimId}`);
    }

    // Step 2: Search PubMed for papers (placeholder)
    await job.updateProgress(20);
    console.log(`[Dossier Worker] Searching PubMed for: "${claim.title}"`);
    // TODO: Implement PubMed search in Phase 1

    // Step 3: Search arXiv for papers (placeholder)
    await job.updateProgress(30);
    console.log(`[Dossier Worker] Searching arXiv for: "${claim.title}"`);
    // TODO: Implement arXiv search in Phase 1

    // Step 4: Deduplicate and store papers (placeholder)
    await job.updateProgress(40);
    // TODO: Implement paper storage in Phase 1

    // Step 5: Generate embeddings (placeholder)
    await job.updateProgress(50);
    // TODO: Implement embedding generation in Phase 1

    // Step 6: Extract evidence from papers (placeholder)
    await job.updateProgress(70);
    // TODO: Implement evidence extraction in Phase 1

    // Step 7: Generate synthesis (placeholder)
    await job.updateProgress(90);
    // TODO: Implement synthesis generation in Phase 1

    // Mark job as complete
    await job.updateProgress(100);
    await prisma.dossierJob.updateMany({
      where: { claimId, status: "RUNNING" },
      data: { status: "SUCCEEDED", finishedAt: new Date(), progress: 100 },
    });

    // Update market with research timestamp
    await prisma.market.updateMany({
      where: { claimId },
      data: { lastDossierAt: new Date() },
    });

    console.log(`[Dossier Worker] Completed job for claim: ${claimId}`);
  } catch (error) {
    console.error(`[Dossier Worker] Failed job for claim: ${claimId}`, error);

    // Mark job as failed in database
    await prisma.dossierJob.updateMany({
      where: { claimId, status: "RUNNING" },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error; // Re-throw to trigger BullMQ retry logic
  }
}

// Create the worker
const worker = new Worker<DossierJobData>(
  QUEUE_NAMES.DOSSIER,
  processDossierJob,
  {
    connection: createRedisConnection(),
    concurrency: 2, // Process 2 jobs at a time
  }
);

// Worker event handlers
worker.on("completed", (job) => {
  console.log(`[Dossier Worker] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, error) => {
  console.error(`[Dossier Worker] Job ${job?.id} failed:`, error.message);
});

worker.on("error", (error) => {
  console.error("[Dossier Worker] Worker error:", error);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Dossier Worker] Received SIGTERM, closing worker...");
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Dossier Worker] Received SIGINT, closing worker...");
  await worker.close();
  process.exit(0);
});

console.log("[Dossier Worker] Worker started and listening for jobs...");
