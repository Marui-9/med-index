/**
 * Dossier Worker
 *
 * BullMQ worker that processes dossier-generation jobs through a 10-step
 * RAG pipeline:
 *
 *   1. Load claim from DB
 *   2. Build search queries
 *   3. Search PubMed + arXiv + Semantic Scholar in parallel
 *   4. Deduplicate papers (DOI > PMID > title similarity)
 *   5. Store / upsert papers in DB
 *   6. Chunk text + generate embeddings + store
 *   7. Vector search for relevant chunks
 *   8. Extract evidence per paper (LLM)
 *   9. Synthesize verdict (LLM)
 *  10. Save verdict + update Market + finalise DossierJob
 *
 * Run separately from the Next.js app: `npm run worker`
 * For Railway: Deploy as a separate service or use a Procfile.
 */

import { Worker, Job, type ConnectionOptions } from "bullmq";
import { createRedisConnection } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { QUEUE_NAMES, DossierJobData } from "@/lib/queue";
import { searchPubMed, fetchPubMedArticles, PubMedArticle } from "@/lib/pubmed";
import { searchArxivHealth, ArxivArticle } from "@/lib/arxiv";
import {
  searchHealthPapers,
  SemanticScholarPaper,
} from "@/lib/semantic-scholar";
import { chunkText } from "@/lib/chunker";
import {
  generateEmbedding,
  generateEmbeddings,
  openai,
} from "@/lib/openai";
import {
  storeChunksWithEmbeddings,
  searchChunksGroupedByPaper,
} from "@/lib/vector-search";
import {
  buildEvidenceExtractionPrompt,
  buildVerdictSynthesisPrompt,
  EVIDENCE_EXTRACTION_SYSTEM,
  VERDICT_SYNTHESIS_SYSTEM,
  ExtractedEvidence,
  SynthesisVerdict,
  EvidenceCardForSynthesis,
} from "@/lib/prompts";
import type { Stance } from "@prisma/client";

// ── Constants ───────────────────────────────────────────────────────────

const MAX_PAPERS = 30; // cap per source to control costs
const MAX_PAPERS_FOR_EVIDENCE = 15; // only extract evidence from top N
const EMBEDDING_BATCH_SIZE = 50; // OpenAI batch limit
const EXTRACTION_VERSION = "v1";

// ── Unified paper type used internally during dedup ─────────────────────

interface UnifiedPaper {
  title: string;
  abstract?: string;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  arxivId?: string;
  semanticScholarId?: string;
  authors: string[];
  journal?: string;
  publishedYear?: number;
  fullTextUrl?: string;
}

// ── Helper: normalise title for fuzzy dedup ─────────────────────────────

function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Helper: map LLM stance to Prisma Stance enum ───────────────────────

function mapStance(llmStance: string): Stance {
  switch (llmStance) {
    case "SUPPORTS":
      return "SUPPORTS";
    case "CONTRADICTS":
    case "REFUTES":
      return "REFUTES";
    default:
      return "NEUTRAL";
  }
}

// ── Helper: map verdict to ForecastSide ─────────────────────────────────

function mapVerdict(verdict: string): "YES" | "NO" | null {
  switch (verdict) {
    case "SUPPORTED":
      return "YES";
    case "CONTRADICTED":
      return "NO";
    default:
      return null; // MIXED or INSUFFICIENT → no clear verdict
  }
}

// ── Source → UnifiedPaper converters ─────────────────────────────────────

function fromPubMed(article: PubMedArticle): UnifiedPaper {
  return {
    title: article.title,
    abstract: article.abstract,
    doi: article.doi,
    pmid: article.pmid,
    pmcid: article.pmcid,
    authors: article.authors,
    journal: article.journal,
    publishedYear: article.publishedYear,
    fullTextUrl: article.fullTextUrl,
  };
}

function fromArxiv(article: ArxivArticle): UnifiedPaper {
  return {
    title: article.title,
    abstract: article.abstract,
    doi: article.doi,
    arxivId: article.arxivId,
    authors: article.authors,
    publishedYear: article.publishedYear,
    fullTextUrl: article.pdfUrl,
  };
}

function fromSemanticScholar(paper: SemanticScholarPaper): UnifiedPaper {
  return {
    title: paper.title,
    abstract: paper.abstract ?? undefined,
    doi: paper.externalIds?.DOI,
    pmid: paper.externalIds?.PubMed,
    pmcid: paper.externalIds?.PubMedCentral,
    arxivId: paper.externalIds?.ArXiv,
    semanticScholarId: paper.paperId,
    authors: paper.authors.map((a) => a.name),
    journal: paper.journal?.name,
    publishedYear: paper.year ?? undefined,
  };
}

// ── Deduplication ───────────────────────────────────────────────────────

/**
 * Deduplicate papers by DOI > PMID > arXiv ID > normalised title.
 * Merges identifiers from later duplicates into the first-seen copy.
 */
export function deduplicatePapers(papers: UnifiedPaper[]): UnifiedPaper[] {
  const seen = new Map<string, UnifiedPaper>();
  const titleIndex = new Map<string, string>(); // normTitle → dedup key

  function getKeyAndMerge(paper: UnifiedPaper): string | null {
    // Priority: DOI > PMID > arXivId > title
    const doi = paper.doi?.toLowerCase();
    const pmid = paper.pmid;
    const arxiv = paper.arxivId;
    const normTitle = normaliseTitle(paper.title);

    // Check by DOI
    if (doi && seen.has(`doi:${doi}`)) {
      merge(seen.get(`doi:${doi}`)!, paper);
      return null;
    }
    if (pmid && seen.has(`pmid:${pmid}`)) {
      merge(seen.get(`pmid:${pmid}`)!, paper);
      return null;
    }
    if (arxiv && seen.has(`arxiv:${arxiv}`)) {
      merge(seen.get(`arxiv:${arxiv}`)!, paper);
      return null;
    }
    // Fuzzy title match
    if (titleIndex.has(normTitle)) {
      const existingKey = titleIndex.get(normTitle)!;
      merge(seen.get(existingKey)!, paper);
      return null;
    }

    // Not a duplicate — assign all keys
    const primaryKey =
      (doi ? `doi:${doi}` : null) ??
      (pmid ? `pmid:${pmid}` : null) ??
      (arxiv ? `arxiv:${arxiv}` : null) ??
      `title:${normTitle}`;

    if (doi) seen.set(`doi:${doi}`, paper);
    if (pmid) seen.set(`pmid:${pmid}`, paper);
    if (arxiv) seen.set(`arxiv:${arxiv}`, paper);
    seen.set(primaryKey, paper);
    titleIndex.set(normTitle, primaryKey);
    return primaryKey;
  }

  function merge(target: UnifiedPaper, source: UnifiedPaper) {
    if (!target.doi && source.doi) target.doi = source.doi;
    if (!target.pmid && source.pmid) target.pmid = source.pmid;
    if (!target.pmcid && source.pmcid) target.pmcid = source.pmcid;
    if (!target.arxivId && source.arxivId) target.arxivId = source.arxivId;
    if (!target.semanticScholarId && source.semanticScholarId)
      target.semanticScholarId = source.semanticScholarId;
    if (!target.abstract && source.abstract) target.abstract = source.abstract;
    if (!target.fullTextUrl && source.fullTextUrl)
      target.fullTextUrl = source.fullTextUrl;
    if (!target.journal && source.journal) target.journal = source.journal;
    if (!target.publishedYear && source.publishedYear)
      target.publishedYear = source.publishedYear;
    if (target.authors.length === 0 && source.authors.length > 0)
      target.authors = source.authors;
  }

  const unique: UnifiedPaper[] = [];
  for (const paper of papers) {
    const key = getKeyAndMerge(paper);
    if (key !== null) {
      unique.push(paper);
    }
  }
  return unique;
}

// ── Core pipeline ───────────────────────────────────────────────────────

export async function processDossierJob(
  job: Job<DossierJobData>
): Promise<void> {
  const { claimId } = job.data;
  const log = (msg: string) =>
    console.log(`[Dossier Worker] [${job.id}] ${msg}`);

  log(`Starting job for claim: ${claimId}`);

  try {
    // Update job status in database
    await prisma.dossierJob.updateMany({
      where: { claimId, status: "QUEUED" },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    // ── Step 1: Load claim ────────────────────────────────────────────
    await job.updateProgress(5);
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      throw new Error(`Claim not found: ${claimId}`);
    }
    log(`Loaded claim: "${claim.title}"`);

    // ── Step 2: Build search queries ──────────────────────────────────
    await job.updateProgress(10);
    const baseQuery = claim.title;
    const reviewQuery = `${claim.title} systematic review`;
    log(`Search queries: "${baseQuery}" / "${reviewQuery}"`);

    // ── Step 3: Search sources in parallel ────────────────────────────
    await job.updateProgress(15);
    log("Searching PubMed, arXiv, and Semantic Scholar…");

    const [pubmedResult, arxivResult, s2Result] = await Promise.allSettled([
      searchPubMed(reviewQuery, { maxResults: MAX_PAPERS }).then(
        async (search) => {
          if (search.ids.length === 0) return [];
          return fetchPubMedArticles(search.ids);
        }
      ),
      searchArxivHealth(baseQuery, MAX_PAPERS).then((r) => r.articles),
      searchHealthPapers(baseQuery, MAX_PAPERS).then((r) => r.papers),
    ]);

    const pubmedArticles: PubMedArticle[] =
      pubmedResult.status === "fulfilled" ? pubmedResult.value : [];
    const arxivArticles: ArxivArticle[] =
      arxivResult.status === "fulfilled" ? arxivResult.value : [];
    const s2Papers: SemanticScholarPaper[] =
      s2Result.status === "fulfilled" ? s2Result.value : [];

    // Log any source failures
    if (pubmedResult.status === "rejected")
      log(`PubMed search failed: ${pubmedResult.reason}`);
    if (arxivResult.status === "rejected")
      log(`arXiv search failed: ${arxivResult.reason}`);
    if (s2Result.status === "rejected")
      log(`Semantic Scholar search failed: ${s2Result.reason}`);

    log(
      `Found: PubMed=${pubmedArticles.length}, arXiv=${arxivArticles.length}, S2=${s2Papers.length}`
    );

    // ── Step 4: Deduplicate ───────────────────────────────────────────
    await job.updateProgress(25);

    const allPapers: UnifiedPaper[] = [
      ...pubmedArticles.map(fromPubMed),
      ...s2Papers.map(fromSemanticScholar),
      ...arxivArticles.map(fromArxiv),
    ];

    const uniquePapers = deduplicatePapers(allPapers);
    log(`Deduplicated: ${allPapers.length} → ${uniquePapers.length} papers`);

    if (uniquePapers.length === 0) {
      log("No papers found — marking job as succeeded with no verdict.");
      await prisma.dossierJob.updateMany({
        where: { claimId, status: "RUNNING" },
        data: { status: "SUCCEEDED", finishedAt: new Date(), progress: 100 },
      });
      return;
    }

    // ── Step 5: Upsert papers in DB ───────────────────────────────────
    await job.updateProgress(30);
    log("Storing papers in database…");

    const paperDbIds: string[] = [];
    for (const paper of uniquePapers) {
      // Build a unique where clause — prefer DOI, then PMID, arXiv, S2
      const existing = await prisma.paper.findFirst({
        where: {
          OR: [
            ...(paper.doi ? [{ doi: paper.doi }] : []),
            ...(paper.pmid ? [{ pmid: paper.pmid }] : []),
            ...(paper.arxivId ? [{ arxivId: paper.arxivId }] : []),
            ...(paper.semanticScholarId
              ? [{ semanticScholarId: paper.semanticScholarId }]
              : []),
          ],
        },
      });

      let dbPaper;
      if (existing) {
        dbPaper = await prisma.paper.update({
          where: { id: existing.id },
          data: {
            doi: existing.doi ?? paper.doi,
            pmid: existing.pmid ?? paper.pmid,
            pmcid: existing.pmcid ?? paper.pmcid,
            arxivId: existing.arxivId ?? paper.arxivId,
            semanticScholarId:
              existing.semanticScholarId ?? paper.semanticScholarId,
            abstract: existing.abstract ?? paper.abstract,
            fullTextUrl: existing.fullTextUrl ?? paper.fullTextUrl,
            journal: existing.journal ?? paper.journal,
          },
        });
      } else {
        dbPaper = await prisma.paper.create({
          data: {
            title: paper.title,
            abstract: paper.abstract,
            doi: paper.doi,
            pmid: paper.pmid,
            pmcid: paper.pmcid,
            arxivId: paper.arxivId,
            semanticScholarId: paper.semanticScholarId,
            authors: paper.authors,
            journal: paper.journal,
            publishedYear: paper.publishedYear,
            fullTextUrl: paper.fullTextUrl,
          },
        });
      }

      // Ensure ClaimPaper join row exists
      await prisma.claimPaper.upsert({
        where: {
          claimId_paperId: { claimId, paperId: dbPaper.id },
        },
        create: { claimId, paperId: dbPaper.id },
        update: {},
      });

      paperDbIds.push(dbPaper.id);
    }
    log(`Stored ${paperDbIds.length} papers`);

    // ── Step 6: Chunk + embed + store ─────────────────────────────────
    await job.updateProgress(40);
    log("Chunking and embedding texts…");

    // For each paper with an abstract, chunk it and embed
    const papersForChunking = uniquePapers
      .map((p, i) => ({
        ...p,
        dbId: paperDbIds[i],
      }))
      .filter((p) => p.abstract && p.abstract.length > 50);

    let totalChunksStored = 0;
    // Process in batches to manage memory and API limits
    for (let i = 0; i < papersForChunking.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = papersForChunking.slice(i, i + EMBEDDING_BATCH_SIZE);

      // Chunk all papers in this batch
      const batchChunks: Array<{
        paperId: string;
        content: string;
        chunkIndex: number;
        tokenCount: number;
      }> = [];

      for (const paper of batch) {
        const chunks = chunkText(paper.abstract!, {
          maxChunkTokens: 400,
          overlapTokens: 80,
        });
        for (const chunk of chunks) {
          batchChunks.push({
            paperId: paper.dbId,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            tokenCount: chunk.estimatedTokens,
          });
        }
      }

      if (batchChunks.length === 0) continue;

      // Generate embeddings for all chunks in this batch
      const embeddings = await generateEmbeddings(
        batchChunks.map((c) => c.content)
      );

      // Store chunks with embeddings
      await storeChunksWithEmbeddings(
        batchChunks.map((chunk, idx) => ({
          ...chunk,
          embedding: embeddings[idx],
        }))
      );

      totalChunksStored += batchChunks.length;
    }
    log(`Stored ${totalChunksStored} chunks with embeddings`);

    // ── Step 7: Vector search for relevant chunks ─────────────────────
    await job.updateProgress(55);
    log("Searching for relevant chunks…");

    const queryEmbedding = await generateEmbedding(claim.title);
    const groupedChunks = await searchChunksGroupedByPaper(queryEmbedding, {
      paperIds: paperDbIds,
      limit: MAX_PAPERS_FOR_EVIDENCE,
      minSimilarity: 0.5,
      chunksPerPaper: 3,
    });

    log(`Found relevant chunks for ${groupedChunks.size} papers`);

    // ── Step 8: Extract evidence per paper (LLM) ─────────────────────
    await job.updateProgress(60);
    log("Extracting evidence from papers…");

    // Pick the top papers (those with chunks, plus any remaining up to limit)
    const papersWithEvidence = new Set(groupedChunks.keys());
    const papersToProcess = paperDbIds
      .filter(
        (id) =>
          papersWithEvidence.has(id) ||
          uniquePapers[paperDbIds.indexOf(id)]?.abstract
      )
      .slice(0, MAX_PAPERS_FOR_EVIDENCE);

    const evidenceCards: EvidenceCardForSynthesis[] = [];
    const extractionErrors: string[] = [];

    for (const dbPaperId of papersToProcess) {
      const idx = paperDbIds.indexOf(dbPaperId);
      const paper = uniquePapers[idx];
      if (!paper) continue;

      // Get relevant chunks for this paper
      const chunks = groupedChunks.get(dbPaperId) ?? [];
      const chunkTexts = chunks.map((c) => c.content);

      try {
        const userPrompt = buildEvidenceExtractionPrompt({
          claimTitle: claim.title,
          claimDescription: claim.description ?? undefined,
          paperTitle: paper.title,
          paperAbstract: paper.abstract,
          relevantChunks: chunkTexts.length > 0 ? chunkTexts : undefined,
        });

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: EVIDENCE_EXTRACTION_SYSTEM },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 800,
        });

        const rawJson = response.choices[0]?.message?.content;
        if (!rawJson) {
          extractionErrors.push(`No response for paper: ${paper.title}`);
          continue;
        }

        const evidence: ExtractedEvidence = JSON.parse(rawJson);

        // Save extraction to ClaimPaper
        await prisma.claimPaper.update({
          where: {
            claimId_paperId: { claimId, paperId: dbPaperId },
          },
          data: {
            abstractSnippet: (paper.abstract ?? "").slice(0, 500),
            aiSummary: evidence.summary,
            studyType: evidence.studyType,
            sampleSize: evidence.sampleSize,
            stance: mapStance(evidence.stance),
            confidenceScore: evidence.confidence,
            extractionJson: JSON.parse(JSON.stringify(evidence)),
            extractionVersion: EXTRACTION_VERSION,
          },
        });

        // Build evidence card for synthesis
        evidenceCards.push({
          paperTitle: paper.title,
          publishedYear: paper.publishedYear,
          studyType: evidence.studyType,
          sampleSize: evidence.sampleSize,
          stance: evidence.stance,
          summary: evidence.summary,
          keyFindings: evidence.keyFindings,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        extractionErrors.push(`Paper "${paper.title}": ${msg}`);
        log(`Evidence extraction error: ${msg}`);
      }

      // Update progress proportionally through evidence extraction (60-80%)
      const pctDone =
        (papersToProcess.indexOf(dbPaperId) + 1) / papersToProcess.length;
      await job.updateProgress(Math.round(60 + pctDone * 20));
    }

    log(
      `Extracted evidence from ${evidenceCards.length} papers (${extractionErrors.length} errors)`
    );

    // ── Step 9: Synthesise verdict (LLM) ──────────────────────────────
    await job.updateProgress(85);
    log("Synthesising verdict…");

    let verdict: SynthesisVerdict | null = null;

    if (evidenceCards.length > 0) {
      try {
        const userPrompt = buildVerdictSynthesisPrompt({
          claimTitle: claim.title,
          evidenceCards,
        });

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: VERDICT_SYNTHESIS_SYSTEM },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1200,
        });

        const rawJson = response.choices[0]?.message?.content;
        if (rawJson) {
          verdict = JSON.parse(rawJson) as SynthesisVerdict;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`Verdict synthesis error: ${msg}`);
        // Continue — we can still save partial results
      }
    }

    // ── Step 10: Save verdict + update Market + finalise ──────────────
    await job.updateProgress(95);
    log("Saving verdict and updating market…");

    // Update Market with AI verdict
    if (verdict) {
      await prisma.market.updateMany({
        where: { claimId },
        data: {
          aiConfidence: verdict.confidence,
          aiVerdict: mapVerdict(verdict.verdict),
          consensusSummary: verdict.detailedSummary,
          lastDossierAt: new Date(),
          status: "ACTIVE", // Move from RESEARCHING → ACTIVE
        },
      });
    } else {
      await prisma.market.updateMany({
        where: { claimId },
        data: { lastDossierAt: new Date() },
      });
    }

    // Mark job as succeeded
    await job.updateProgress(100);
    await prisma.dossierJob.updateMany({
      where: { claimId, status: "RUNNING" },
      data: { status: "SUCCEEDED", finishedAt: new Date(), progress: 100 },
    });

    log(
      `Completed: ${uniquePapers.length} papers, ${evidenceCards.length} evidence cards, verdict=${verdict?.verdict ?? "none"}`
    );
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
    connection: createRedisConnection() as unknown as ConnectionOptions,
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
