import { Queue, Worker, Job, type ConnectionOptions } from "bullmq";
import { createRedisConnection } from "@/lib/redis";

// Queue names
export const QUEUE_NAMES = {
  DOSSIER: "dossier-generation",
  PAPER_ALERTS: "paper-alerts",
} as const;

// Job types for type safety
export interface DossierJobData {
  claimId: string;
  triggeredBy: string; // userId or "system"
}

export interface PaperAlertJobData {
  claimId: string;
  userId: string;
}

// Create queues (used by the web app to add jobs)
export const dossierQueue = new Queue<DossierJobData>(QUEUE_NAMES.DOSSIER, {
  connection: createRedisConnection() as unknown as ConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
    },
  },
});

export const paperAlertQueue = new Queue<PaperAlertJobData>(
  QUEUE_NAMES.PAPER_ALERTS,
  {
    connection: createRedisConnection() as unknown as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  }
);

// Helper to add a dossier generation job
export async function enqueueDossierJob(
  claimId: string,
  triggeredBy: string
): Promise<Job<DossierJobData>> {
  // Use claimId as job ID for idempotency - prevents duplicate jobs for same claim
  const job = await dossierQueue.add(
    "generate",
    { claimId, triggeredBy },
    {
      jobId: `dossier-${claimId}`,
    }
  );
  return job;
}

// Helper to get job status
export async function getDossierJobStatus(jobId: string) {
  const job = await dossierQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress as number;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}
