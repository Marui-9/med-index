# RAG Engine — Technical Documentation

> **Retrieval-Augmented Generation (RAG) pipeline for health claim verification.**
>
> This document describes the complete architecture and implementation of
> HealthProof's RAG engine — from paper retrieval to AI verdict delivery.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Module Reference](#4-module-reference)
   - 4.1 Paper Sources
   - 4.2 Text Chunker
   - 4.3 Embedding & Vector Search
   - 4.4 LLM Prompts
   - 4.5 Job Queue
   - 4.6 Dossier Worker (Pipeline)
5. [API Routes](#5-api-routes)
6. [Frontend Components](#6-frontend-components)
7. [Data Flow: End-to-End](#7-data-flow-end-to-end)
8. [Cost Estimates](#8-cost-estimates)
9. [Configuration & Constants](#9-configuration--constants)
10. [Testing](#10-testing)

---

## 1. Overview

When an admin triggers research on a health claim, the RAG engine:

1. **Retrieves** relevant scientific papers from PubMed, arXiv, and Semantic Scholar.
2. **Chunks** paper abstracts into overlapping text segments.
3. **Embeds** those chunks into 1536-dimensional vectors (OpenAI `text-embedding-3-small`).
4. **Stores** the vectors in PostgreSQL via pgvector for cosine-similarity search.
5. **Extracts** per-paper evidence with `gpt-4o-mini` (stance, study type, findings).
6. **Synthesises** a cross-paper verdict with `gpt-4o-mini` (supported / contradicted / mixed / insufficient).
7. **Saves** the verdict to the `Market` table and exposes it through API routes and UI components.

The entire pipeline runs asynchronously in a **BullMQ worker** backed by Redis,
keeping the Next.js request cycle fast.

### Tech Stack

| Layer               | Technology                                       |
| ------------------- | ------------------------------------------------ |
| Framework           | Next.js 15.1 (App Router, TypeScript)            |
| Database            | PostgreSQL + Prisma 6.2 + pgvector               |
| Embeddings          | OpenAI `text-embedding-3-small` (1536 dims)      |
| LLM                 | OpenAI `gpt-4o-mini`                             |
| Job Queue           | BullMQ + Redis                                   |
| Paper Sources       | PubMed E-Utilities, arXiv API, Semantic Scholar   |
| XML Parsing         | `fast-xml-parser` (PubMed), regex (arXiv)        |
| Testing             | Vitest (408 tests across 41 files)               |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP                              │
│                                                                  │
│  ┌─────────────┐    ┌───────────────────┐    ┌───────────────┐  │
│  │  Admin UI   │───▶│ POST /research    │───▶│  BullMQ       │  │
│  │  (trigger)  │    │ (create job)      │    │  Redis Queue  │  │
│  └─────────────┘    └───────────────────┘    └──────┬────────┘  │
│                                                      │           │
│  ┌─────────────┐    ┌───────────────────┐            │           │
│  │  Research   │◀──▶│ GET /status       │            │           │
│  │  Progress   │    │ (poll progress)   │            │           │
│  └─────────────┘    └───────────────────┘            │           │
│                                                      │           │
│  ┌─────────────┐    ┌───────────────────┐            │           │
│  │  Evidence   │◀──▶│ GET /evidence     │            │           │
│  │  List       │    │ (fetch cards)     │            │           │
│  └─────────────┘    └───────────────────┘            │           │
│                                                      │           │
│  ┌─────────────┐    ┌───────────────────┐            │           │
│  │  Verdict    │◀──▶│ GET /verdict      │            │           │
│  │  Card       │    │ (free/locked)     │            │           │
│  └─────────────┘    └───────────────────┘            │           │
└──────────────────────────────────────────────────────┼───────────┘
                                                       │
                                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      DOSSIER WORKER                              │
│                   (separate process)                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  10-Step Pipeline                                        │   │
│  │                                                          │   │
│  │  1. Load claim                                           │   │
│  │  2. Build search queries                                 │   │
│  │  3. Search PubMed + arXiv + S2  ──▶  (parallel)         │   │
│  │  4. Deduplicate papers (DOI > PMID > title)              │   │
│  │  5. Upsert papers in PostgreSQL                          │   │
│  │  6. Chunk abstracts + embed + store vectors              │   │
│  │  7. Vector search (cosine similarity via pgvector)       │   │
│  │  8. Extract evidence per paper (gpt-4o-mini)             │   │
│  │  9. Synthesise cross-paper verdict (gpt-4o-mini)         │   │
│  │ 10. Save verdict → Market table, finalise DossierJob     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  External APIs:                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐             │
│  │  PubMed  │  │  arXiv   │  │ Semantic Scholar  │             │
│  └──────────┘  └──────────┘  └───────────────────┘             │
│                                                                  │
│  AI APIs:                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │ text-embedding-3-small  │  │  gpt-4o-mini (extraction +   │  │
│  │ (embeddings)            │  │  synthesis)                   │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

Six Prisma models support the RAG pipeline:

### Paper

Stores metadata for a scientific paper. Supports five unique external identifiers
to enable deduplication across sources.

| Field               | Type        | Notes                              |
| ------------------- | ----------- | ---------------------------------- |
| `id`                | `String`    | CUID primary key                   |
| `doi`               | `String?`   | Unique, nullable                   |
| `pmid`              | `String?`   | PubMed ID, unique                  |
| `pmcid`             | `String?`   | PubMed Central ID, unique          |
| `arxivId`           | `String?`   | Unique                             |
| `semanticScholarId` | `String?`   | Unique                             |
| `title`             | `String`    |                                    |
| `abstract`          | `String?`   | Full abstract text                 |
| `fullTextUrl`       | `String?`   | Link to open-access PDF            |
| `publishedYear`     | `Int?`      |                                    |
| `journal`           | `String?`   |                                    |
| `authors`           | `String[]`  | Array of author names              |

### ClaimPaper

Join table linking a `Claim` to a `Paper`, with AI-extracted evidence fields.

| Field               | Type        | Notes                                         |
| ------------------- | ----------- | --------------------------------------------- |
| `claimId` + `paperId` | Composite | `@@unique`                                    |
| `abstractSnippet`   | `String?`   | First 500 chars of abstract                   |
| `aiSummary`         | `String?`   | LLM-generated evidence summary                |
| `studyType`         | `String?`   | e.g., "RCT", "Meta-analysis"                  |
| `sampleSize`        | `Int?`      |                                               |
| `pValue`            | `Float?`    |                                               |
| `stance`            | `Stance?`   | `SUPPORTS` / `REFUTES` / `NEUTRAL`            |
| `confidenceScore`   | `Float?`    | AI confidence in the assessment (0.0–1.0)     |
| `extractionJson`    | `Json?`     | Full raw LLM extraction output                |
| `extractionVersion` | `String?`   | Currently `"v1"`                               |

### DocumentChunk

Stores text chunks with their pgvector embeddings.

| Field        | Type                          | Notes                                 |
| ------------ | ----------------------------- | ------------------------------------- |
| `id`         | `String`                      | CUID                                  |
| `paperId`    | `String`                      | FK → Paper                            |
| `content`    | `String`                      | Chunk text                            |
| `chunkIndex` | `Int`                         | Order within the paper                |
| `embedding`  | `Unsupported("vector(1536)")` | pgvector column, cosine-indexed       |
| `tokenCount` | `Int?`                        | Estimated token count                 |

### DossierJob

Tracks the lifecycle of a single research pipeline execution.

| Field         | Type        | Notes                                    |
| ------------- | ----------- | ---------------------------------------- |
| `id`          | `String`    | CUID                                     |
| `claimId`     | `String`    | FK → Claim                               |
| `status`      | `JobStatus` | `QUEUED` → `RUNNING` → `SUCCEEDED`/`FAILED` |
| `requestHash` | `String?`   | Idempotency key, unique                  |
| `progress`    | `Int`       | 0–100                                    |
| `error`       | `String?`   | Error message on failure                 |
| `startedAt`   | `DateTime?` |                                          |
| `finishedAt`  | `DateTime?` |                                          |

### Market (verdict fields)

The `Market` model stores the AI verdict alongside prediction-market data:

| Field              | Type            | Notes                                    |
| ------------------ | --------------- | ---------------------------------------- |
| `aiConfidence`     | `Float?`        | 0.0–1.0, null until research completes   |
| `aiVerdict`        | `ForecastSide?` | `YES` (supported) or `NO` (contradicted) |
| `consensusSummary` | `String?`       | LLM-generated detailed summary           |
| `lastDossierAt`    | `DateTime?`     | Timestamp of last pipeline run           |
| `status`           | `MarketStatus`  | `RESEARCHING` → `ACTIVE` → `RESOLVED`   |

### Enums

```prisma
enum Stance        { SUPPORTS  REFUTES  NEUTRAL }
enum ForecastSide  { YES  NO }
enum JobStatus     { QUEUED  RUNNING  SUCCEEDED  FAILED }
enum MarketStatus  { RESEARCHING  ACTIVE  RESOLVED }
```

---

## 4. Module Reference

### 4.1 Paper Sources

Three external APIs are searched in parallel to maximise coverage.

#### `src/lib/pubmed.ts` — PubMed E-Utilities

Uses the NCBI E-Utilities (ESearch + EFetch) to search PubMed and retrieve
structured article metadata. XML is parsed with `fast-xml-parser`.

| Function               | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `searchPubMed(query, opts)` | ESearch — returns matching PMIDs with count/retmax |
| `fetchPubMedArticles(ids)`  | EFetch — bulk fetches article metadata as XML     |
| `parsePubMedXml(xml)`       | Parses EFetch XML into `PubMedArticle[]`          |
| `searchPMC(query, opts)`    | Searches PubMed Central for full-text articles    |
| `getPMCIdFromPMID(pmid)`    | ID converter — PMID → PMCID                      |

**Key details:**

- Supports structured abstracts (multiple `<AbstractText>` sections).
- Extracts DOI, PMCID, PMID from `<ArticleIdList>`.
- Builds full-text URL from PMCID when available.
- Authors parsed from `<AuthorList>` (LastName + ForeName, or CollectiveName).

#### `src/lib/arxiv.ts` — arXiv API

Queries the arXiv Atom-feed API for health-related preprints.

| Function                   | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `searchArxiv(query, opts)` | General search with optional category filters   |
| `searchArxivHealth(query, n)` | Pre-filtered to health categories (q-bio, stat.AP, physics.med-ph, cs.LG) |
| `getArxivPdfUrl(id)`       | Build PDF URL from arXiv ID                     |
| `getArxivAbsUrl(id)`       | Build abstract page URL from arXiv ID           |

**Health categories searched:** `q-bio.QM`, `q-bio.TO`, `q-bio.NC`,
`physics.med-ph`, `stat.AP`, `cs.LG`.

XML is parsed with regex (lightweight; no external parser dependency).

#### `src/lib/semantic-scholar.ts` — Semantic Scholar API

REST client for the Semantic Scholar Academic Graph API with built-in rate limiting.

| Function                          | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `searchSemanticScholar(query, opts)` | Keyword search with field selection      |
| `getSemanticScholarPaper(id)`     | Single paper lookup by S2 ID or external ID |
| `getRecommendations(paperId, n)`  | Related-paper recommendations               |
| `searchHealthPapers(query, n)`    | Convenience wrapper for health fields       |

**Rate limiting:**

- Free tier (no API key): 3.1 s delay between requests.
- Authenticated tier: 1.1 s delay.
- Automatic 429 retry with exponential backoff.

**External ID support:** DOI, PMID, PubMedCentral, ArXiv IDs can be used for
lookups via `DOI:`, `PMID:`, `PMCID:`, `ArXiv:` prefixes.

---

### 4.2 Text Chunker

**File:** `src/lib/chunker.ts`

Splits paper text into overlapping chunks suitable for embedding.

| Function          | Purpose                                |
| ----------------- | -------------------------------------- |
| `chunkText(text, opts)` | Chunk text with configurable sizes |
| `estimateTokens(text)` | Estimate token count (chars / 4)   |

**Default settings:**

| Parameter         | Default | Description                    |
| ----------------- | ------- | ------------------------------ |
| `maxChunkTokens`  | 500     | Target tokens per chunk        |
| `overlapTokens`   | 100     | Overlap between adjacent chunks |

**Algorithm:**

1. Clean whitespace and normalise text.
2. Split by double-newlines into paragraphs.
3. Greedily pack paragraphs into chunks up to `maxChunkTokens`.
4. If a paragraph exceeds the limit, split at sentence boundaries.
5. If a sentence exceeds the limit, hard-split at the character level.
6. Apply overlap: prepend trailing text from the previous chunk.

**Output structure:**

```typescript
interface TextChunk {
  content: string;
  chunkIndex: number;
  estimatedTokens: number;
}
```

---

### 4.3 Embedding & Vector Search

#### `src/lib/openai.ts` — OpenAI Client

Singleton OpenAI client with hot-reload safety (global caching in dev).

| Function                    | Purpose                             |
| --------------------------- | ----------------------------------- |
| `generateEmbedding(text)`   | Single text → 1536-dim vector       |
| `generateEmbeddings(texts)` | Batch texts → array of vectors      |
| `moderateContent(text)`     | Content moderation (safe/flagged)   |

Model: **`text-embedding-3-small`** — 1536 dimensions, ~$0.02 per 1M tokens.

#### `src/lib/vector-search.ts` — pgvector Operations

Performs cosine-similarity search using Prisma raw SQL queries against the
pgvector `vector(1536)` column.

| Function                          | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `searchSimilarChunks(embedding, opts)` | Find chunks nearest to an embedding     |
| `storeChunkWithEmbedding(data)`   | Insert a single chunk + vector              |
| `storeChunksWithEmbeddings(data)` | Transactional batch insert                  |
| `searchChunksGroupedByPaper(embedding, opts)` | Top-N chunks per paper, grouped   |

**Similarity calculation:**

```sql
SELECT *, 1 - (embedding <=> $1::vector) AS similarity
FROM "DocumentChunk"
WHERE 1 - (embedding <=> $1::vector) >= $2   -- minSimilarity threshold
ORDER BY similarity DESC
LIMIT $3
```

The `<=>` operator is pgvector's cosine distance; `1 - distance` gives a
similarity score in [0, 1].

`searchChunksGroupedByPaper` performs a full search then groups results
client-side, returning a `Map<paperId, ChunkResult[]>` with at most
`chunksPerPaper` entries per paper.

---

### 4.4 LLM Prompts

**File:** `src/lib/prompts.ts`

Two LLM prompt templates power the analysis:

#### Evidence Extraction (per-paper)

**System prompt** (`EVIDENCE_EXTRACTION_SYSTEM`): Instructs the model to act as
a biomedical evidence analyst. Given a health claim, a paper's title/abstract,
and optionally relevant text chunks, produce a JSON assessment.

**User prompt builder:** `buildEvidenceExtractionPrompt(input)` — formats the
claim + paper + chunks into a structured user message.

**Expected JSON output:**

```typescript
interface ExtractedEvidence {
  stance: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
  studyType: string;          // e.g., "RCT", "Meta-analysis", "Cohort"
  sampleSize: number | null;
  summary: string;            // 2-3 sentence evidence summary
  keyFindings: string[];      // Bullet-point findings
  limitations: string[];      // Study limitations
  confidence: number;         // 0.0-1.0
}
```

LLM parameters: `temperature: 0.2`, `max_tokens: 800`,
`response_format: { type: "json_object" }`.

#### Verdict Synthesis (cross-paper)

**System prompt** (`VERDICT_SYNTHESIS_SYSTEM`): Instructs the model to
synthesise all extracted evidence cards into an overall verdict on the claim.

**User prompt builder:** `buildVerdictSynthesisPrompt(input)` — lists every
evidence card (paper title, year, study type, sample size, stance, summary,
key findings) and asks for a final synthesis.

**Expected JSON output:**

```typescript
interface SynthesisVerdict {
  verdict: "SUPPORTED" | "CONTRADICTED" | "MIXED" | "INSUFFICIENT";
  confidence: number;          // 0.0-1.0
  shortSummary: string;        // 1-2 sentences
  detailedSummary: string;     // Multi-paragraph analysis
  evidenceQuality: string;     // Overall quality assessment
  caveats: string[];           // Important limitations
  whatWouldChangeVerdict: string;
  recommendedAction: string;
}
```

LLM parameters: `temperature: 0.3`, `max_tokens: 1200`,
`response_format: { type: "json_object" }`.

---

### 4.5 Job Queue

**File:** `src/lib/queue.ts`

BullMQ queue configuration for async pipeline execution.

**Queues:**

| Queue Name            | Job Data Interface    | Purpose                |
| --------------------- | --------------------- | ---------------------- |
| `dossier-generation`  | `DossierJobData`      | Main RAG pipeline      |
| `paper-alerts`        | `PaperAlertJobData`   | Future: new-paper alerts |

**DossierJobData:**

```typescript
interface DossierJobData {
  claimId: string;
  triggeredBy: string;  // userId or "system"
}
```

**Job options (dossier queue):**

| Option             | Value              | Purpose                        |
| ------------------ | ------------------ | ------------------------------ |
| `attempts`         | 3                  | Auto-retry on failure          |
| `backoff.type`     | `"exponential"`    | 5s → 10s → 20s backoff        |
| `backoff.delay`    | 5000 ms            | Initial retry delay            |
| `removeOnComplete` | keep last 100      | Completed job cleanup          |
| `removeOnFail`     | keep last 500      | Failed job retention           |

**Key functions:**

- `enqueueDossierJob(claimId, triggeredBy)` — Adds a job with
  `jobId: "dossier-${claimId}"` for idempotency (prevents duplicate jobs for
  the same claim).
- `getDossierJobStatus(jobId)` — Returns state, progress, failure reason.

---

### 4.6 Dossier Worker (Core Pipeline)

**File:** `src/workers/dossier-worker.ts`

The heart of the RAG engine — a BullMQ worker that processes dossier-generation
jobs through 10 sequential steps. Runs as a **separate process** from the
Next.js app (`npm run worker`).

**Worker configuration:**

| Setting       | Value |
| ------------- | ----- |
| Concurrency   | 2     |
| Queue         | `dossier-generation` |
| Graceful shutdown | SIGTERM / SIGINT handling |

#### Pipeline Steps

Each step updates `job.progress` so the frontend can display real-time progress.

##### Step 1 — Load Claim (progress: 5%)

Fetches the `Claim` record from the database. Fails the job if the claim
doesn't exist. Updates `DossierJob.status` from `QUEUED` → `RUNNING`.

##### Step 2 — Build Search Queries (progress: 10%)

Generates two search queries from the claim title:

- `baseQuery` = claim title (used for arXiv and Semantic Scholar).
- `reviewQuery` = claim title + `" systematic review"` (used for PubMed to
  prioritise review articles).

##### Step 3 — Search Sources in Parallel (progress: 15%)

Uses `Promise.allSettled` to search all three sources simultaneously, so one
source failure doesn't block the others:

```typescript
const [pubmedResult, arxivResult, s2Result] = await Promise.allSettled([
  searchPubMed(reviewQuery, { maxResults: 30 }).then(fetchPubMedArticles),
  searchArxivHealth(baseQuery, 30),
  searchHealthPapers(baseQuery, 30),
]);
```

Each source is capped at **30 papers** (`MAX_PAPERS`). Failed sources are
logged but don't abort the pipeline.

##### Step 4 — Deduplicate Papers (progress: 25%)

Papers from all three sources are converted to a `UnifiedPaper` type, then
deduplicated using a priority-based key system:

1. **DOI match** (highest priority) — normalised to lowercase.
2. **PMID match**.
3. **arXiv ID match**.
4. **Normalised title match** (fuzzy) — lowercased, non-alphanumeric removed,
   whitespace collapsed.

When a duplicate is detected, identifiers from the duplicate are **merged**
into the first-seen copy (e.g., a PubMed hit missing a DOI gains the DOI from
the Semantic Scholar duplicate).

##### Step 5 — Store / Upsert Papers (progress: 30%)

For each unique paper:

1. Check if it already exists in DB by DOI, PMID, arXiv ID, or S2 ID
   (using `prisma.paper.findFirst` with an `OR` clause).
2. If found → `update` with any missing identifiers/metadata.
3. If not found → `create` new Paper record.
4. Ensure a `ClaimPaper` join row exists (`upsert` on composite key).

##### Step 6 — Chunk + Embed + Store (progress: 40%)

For each paper with an abstract longer than 50 characters:

1. **Chunk** the abstract using `chunkText()` (400 tokens per chunk, 80 token
   overlap — slightly smaller than defaults for abstracts).
2. **Embed** all chunks in the current batch using `generateEmbeddings()`.
3. **Store** chunks with their vector embeddings via
   `storeChunksWithEmbeddings()` (transactional batch insert).

Papers are processed in batches of **50** (`EMBEDDING_BATCH_SIZE`) to manage
memory and respect OpenAI batch limits.

##### Step 7 — Vector Search (progress: 55%)

Embeds the claim title and performs a grouped cosine-similarity search:

```typescript
const queryEmbedding = await generateEmbedding(claim.title);
const groupedChunks = await searchChunksGroupedByPaper(queryEmbedding, {
  paperIds: paperDbIds,
  limit: 15,              // MAX_PAPERS_FOR_EVIDENCE
  minSimilarity: 0.5,
  chunksPerPaper: 3,
});
```

Returns the top 3 most relevant chunks per paper, for up to 15 papers.

##### Step 8 — Extract Evidence per Paper (progress: 60–80%)

For each paper (up to `MAX_PAPERS_FOR_EVIDENCE = 15`):

1. Build a prompt with the claim, paper metadata, and relevant chunks.
2. Call `gpt-4o-mini` with `response_format: { type: "json_object" }`.
3. Parse the JSON response into `ExtractedEvidence`.
4. Save to `ClaimPaper`: stance, study type, sample size, AI summary,
   confidence score, full extraction JSON.
5. Build an `EvidenceCardForSynthesis` for the verdict step.

Progress updates proportionally: 60% + (paper_index / total) × 20%.

Errors are caught per-paper; a failing extraction skips that paper but
doesn't abort the pipeline.

##### Step 9 — Synthesise Verdict (progress: 85%)

If any evidence cards were produced:

1. Build a synthesis prompt listing all evidence cards.
2. Call `gpt-4o-mini` for a cross-paper verdict.
3. Parse the JSON response into `SynthesisVerdict`.

The verdict includes: outcome, confidence, short/detailed summaries, evidence
quality assessment, caveats, and recommended action.

##### Step 10 — Save & Finalise (progress: 95–100%)

1. Update `Market` with `aiConfidence`, `aiVerdict` (mapped: SUPPORTED→YES,
   CONTRADICTED→NO, MIXED/INSUFFICIENT→null), `consensusSummary`, and
   `lastDossierAt`. Set `status` to `ACTIVE`.
2. Update `DossierJob` to `SUCCEEDED` with `progress: 100`.
3. On failure at any step: catch, set `DossierJob.status` to `FAILED` with
   error message, then re-throw for BullMQ retry logic.

---

## 5. API Routes

All routes are under `/api/claims/[claimId]/`. Parameters are validated with Zod.

### POST `/api/claims/[claimId]/research`

**Trigger dossier generation.** Admin-only.

| Aspect      | Detail                                           |
| ----------- | ------------------------------------------------ |
| Auth        | Requires authenticated admin session             |
| Rate limit  | `actionLimiter`                                  |
| Idempotent  | Returns existing job if one is QUEUED/RUNNING    |

**Flow:**

1. Validate session → admin check.
2. Verify claim exists.
3. Check for existing QUEUED/RUNNING job.
4. Create `DossierJob` record.
5. Enqueue BullMQ job.
6. Return `{ jobId, status: "QUEUED" }` (201).

### GET `/api/claims/[claimId]/research/status`

**Poll pipeline progress.** Public (rate-limited).

| Aspect      | Detail                                           |
| ----------- | ------------------------------------------------ |
| Auth        | None required                                    |
| Rate limit  | `readLimiter`                                    |

**Response fields:**

```json
{
  "jobId": "cuid...",
  "status": "RUNNING",
  "progress": 55,
  "stepLabel": "Finding relevant passages",
  "error": null,
  "startedAt": "2025-01-15T...",
  "finishedAt": null,
  "createdAt": "2025-01-15T..."
}
```

**Step labels** (mapped from progress percentage):

| Progress | Label                     |
| -------- | ------------------------- |
| 0–9%     | Queued                    |
| 10–14%   | Loading claim             |
| 15–24%   | Searching papers          |
| 25–29%   | Deduplicating results     |
| 30–39%   | Storing papers            |
| 40–54%   | Generating embeddings     |
| 55–59%   | Finding relevant passages |
| 60–84%   | Extracting evidence       |
| 85–94%   | Synthesizing verdict      |
| 95–99%   | Saving results            |
| 100%     | Complete                  |

### GET `/api/claims/[claimId]/evidence`

**Fetch evidence cards.** Public (rate-limited).

| Aspect      | Detail                                           |
| ----------- | ------------------------------------------------ |
| Auth        | None required                                    |
| Rate limit  | `readLimiter`                                    |

**Query parameters:**

| Param   | Values                                  | Default     |
| ------- | --------------------------------------- | ----------- |
| `sort`  | `relevance` / `recency` / `studyType`  | `relevance` |
| `stance`| `SUPPORTS` / `REFUTES` / `NEUTRAL`     | (none)      |

**Sorting logic:**

- `relevance` → order by `confidenceScore DESC`.
- `recency` → order by `createdAt DESC`.
- `studyType` → order by `studyType ASC`.

Only returns ClaimPaper records that have a non-null `aiSummary` (i.e., papers
that have been through evidence extraction).

**Response:**

```json
{
  "claimId": "...",
  "count": 12,
  "evidence": [
    {
      "id": "...",
      "paperId": "...",
      "paperTitle": "Effects of...",
      "doi": "10.1234/...",
      "pmid": "12345678",
      "journal": "Nature Medicine",
      "publishedYear": 2023,
      "authors": ["Smith J", "Doe A"],
      "studyType": "RCT",
      "stance": "SUPPORTS",
      "summary": "This randomised controlled trial found...",
      "sampleSize": 500,
      "confidenceScore": 0.87,
      "fullTextUrl": "https://..."
    }
  ]
}
```

### GET `/api/claims/[claimId]/verdict`

**Fetch AI verdict.** Supports free and unlocked tiers.

| Aspect      | Detail                                           |
| ----------- | ------------------------------------------------ |
| Auth        | Optional (checked for unlock status)             |
| Rate limit  | `readLimiter`                                    |

**Tier system:**

- **Free tier:** Returns `verdict`, `confidence`, `shortSummary`
  (first sentence of `consensusSummary`).
- **Unlocked tier** (user spent 5 coins via `/unlock-analysis`): Also returns
  `detailedSummary` (full `consensusSummary`).

**Verdict label mapping:**

| `aiVerdict` | `confidence` | Display label  |
| ----------- | ------------ | -------------- |
| `YES`       | any          | "Supported"    |
| `NO`        | any          | "Contradicted" |
| null        | ≥ 0.4        | "Mixed"        |
| null        | < 0.4        | "Insufficient" |

---

## 6. Frontend Components

Four React components render the RAG pipeline's output.

### `<ResearchProgress>`

**File:** `src/components/research-progress.tsx`

Polls `GET /research/status` at a configurable interval and shows a progress
bar with step labels.

| Prop           | Type       | Default | Purpose                        |
| -------------- | ---------- | ------- | ------------------------------ |
| `claimId`      | `string`   | —       | Claim to track                 |
| `onComplete`   | `() => void` | —    | Callback on SUCCEEDED          |
| `pollInterval` | `number`   | 2000 ms | Polling frequency              |

**States rendered:**

- **QUEUED / RUNNING**: Blue progress bar with animated step label.
- **SUCCEEDED**: Green check + "Research complete".
- **FAILED**: Red X + error message.
- **NONE**: Renders nothing (no job exists).

Polling automatically stops on SUCCEEDED, FAILED, or NONE.

### `<VerdictCard>`

**File:** `src/components/verdict-card.tsx`

Displays the AI verdict with a colour-coded badge and confidence meter.

| Prop          | Type             | Purpose                          |
| ------------- | ---------------- | -------------------------------- |
| `claimId`     | `string`         | Claim to display                 |
| `initialData` | `VerdictData?`   | Pre-loaded verdict (skip fetch)  |

**Visual elements:**

- **Verdict badge**: Green (Supported), Red (Contradicted), Yellow (Mixed),
  Grey (Insufficient).
- **Confidence meter**: Horizontal bar showing percentage.
- **Summary**: Short summary (free) or detailed summary (unlocked).
- **Unlock button**: "Unlock full analysis (5 coins)" — calls
  `POST /unlock-analysis`, then refetches verdict data.

**States:** Loading skeleton / not available / verdict display.

### `<EvidenceCard>`

**File:** `src/components/evidence-card.tsx`

Renders a single piece of evidence (one paper's extracted findings).

| Prop       | Type              | Purpose                 |
| ---------- | ----------------- | ----------------------- |
| `evidence` | `EvidenceCardData`| Paper + extraction data |

**Visual elements:**

- Paper title (linked to source via DOI/PMID/arXiv/fullTextUrl).
- **Stance badge**: Green (Supports), Red (Refutes), Grey (Neutral).
- **Study type badge**: Purple (meta-analysis, systematic review), Blue (RCT),
  Sky (cohort), Teal (case-control), Amber (animal), etc.
- Journal, year, sample size metadata.
- AI summary text.
- Confidence score mini-bar.
- "View paper →" external link.

### `<EvidenceList>`

**File:** `src/components/evidence-list.tsx`

Sortable, filterable list of `<EvidenceCard>` components.

| Prop          | Type                | Purpose                      |
| ------------- | ------------------- | ---------------------------- |
| `claimId`     | `string`            | Claim to load evidence for   |
| `initialData` | `EvidenceCardData[]?` | Pre-loaded data (skip fetch) |

**Controls:**

- **Sort dropdown**: By relevance, recency, or study type.
- **Stance filter**: All, Supports, Refutes, Neutral.

Changing sort or filter triggers a new `GET /evidence?sort=...&stance=...` fetch.

**States:** Loading skeletons / error with retry / empty (with filter hint) / list.

---

## 7. Data Flow: End-to-End

```
Admin clicks "Start Research"
        │
        ▼
POST /api/claims/{id}/research
        │
        ├─▶ Create DossierJob (QUEUED)
        ├─▶ enqueueDossierJob() → Redis
        └─▶ Return { jobId, status: "QUEUED" }
        │
        ▼
<ResearchProgress> polls GET /research/status every 2s
        │
        ▼
Dossier Worker picks up job from Redis
        │
        ├─ Step 1:  Load Claim from DB ────────────────────── 5%
        ├─ Step 2:  Build queries ("claim title",            10%
        │           "claim title systematic review")
        ├─ Step 3:  Promise.allSettled([                     15%
        │             PubMed(30) , arXiv(30) , S2(30)
        │           ])
        ├─ Step 4:  Deduplicate by DOI > PMID > title ───── 25%
        │           (merge identifiers across sources)
        ├─ Step 5:  Upsert Papers + ClaimPaper rows ──────── 30%
        ├─ Step 6:  For each paper w/ abstract:              40%
        │             chunk(400 tok, 80 overlap)
        │             embed(text-embedding-3-small)
        │             store in DocumentChunk + pgvector
        ├─ Step 7:  embed(claim.title)                       55%
        │           searchChunksGroupedByPaper()
        │             → top 3 chunks × 15 papers
        ├─ Step 8:  For each paper (up to 15):            60–80%
        │             gpt-4o-mini evidence extraction
        │             → stance, studyType, summary, etc.
        │             save to ClaimPaper
        ├─ Step 9:  gpt-4o-mini verdict synthesis ────────── 85%
        │             → SUPPORTED / CONTRADICTED / MIXED
        │             → confidence, detailed summary
        └─ Step 10: Save verdict to Market ────────────── 95–100%
                    DossierJob → SUCCEEDED
                    Market.status → ACTIVE
        │
        ▼
<ResearchProgress> detects SUCCEEDED, calls onComplete()
        │
        ▼
<VerdictCard> fetches GET /verdict
<EvidenceList> fetches GET /evidence
        │
        ▼
User sees: verdict badge, confidence %, summary,
           sortable evidence cards with study details
```

---

## 8. Cost Estimates

Estimated cost per claim (at OpenAI pricing as of early 2025):

| Operation                    | Model / API                | Est. Tokens | Est. Cost    |
| ---------------------------- | -------------------------- | ----------- | ------------ |
| Embed ~20 chunks             | text-embedding-3-small     | ~10,000     | ~$0.0002     |
| Embed claim title (query)    | text-embedding-3-small     | ~20         | ~$0.0000004  |
| Evidence extraction (×15)    | gpt-4o-mini (in+out)      | ~30,000     | ~$0.003      |
| Verdict synthesis (×1)       | gpt-4o-mini (in+out)      | ~5,000      | ~$0.0005     |
| **Total per claim**          |                            |             | **~$0.004–$0.006** |

External APIs (PubMed, arXiv, Semantic Scholar) are free.

---

## 9. Configuration & Constants

### Worker Constants (`dossier-worker.ts`)

| Constant                  | Value | Purpose                                |
| ------------------------- | ----- | -------------------------------------- |
| `MAX_PAPERS`              | 30    | Max papers fetched per source          |
| `MAX_PAPERS_FOR_EVIDENCE` | 15    | Max papers sent through LLM extraction |
| `EMBEDDING_BATCH_SIZE`    | 50    | Chunks per embedding API call          |
| `EXTRACTION_VERSION`      | `"v1"` | Versioning for extraction schema      |

### Chunker Defaults (in worker)

| Parameter        | Value |
| ---------------- | ----- |
| `maxChunkTokens` | 400   |
| `overlapTokens`  | 80    |

### Vector Search Defaults (in worker)

| Parameter        | Value |
| ---------------- | ----- |
| `minSimilarity`  | 0.5   |
| `chunksPerPaper` | 3     |

### Queue Config

| Setting            | Value                                |
| ------------------ | ------------------------------------ |
| Queue name         | `dossier-generation`                 |
| Worker concurrency | 2                                    |
| Retry attempts     | 3                                    |
| Backoff            | Exponential, starting at 5 s         |
| Job ID             | `dossier-${claimId}` (idempotent)    |

### Environment Variables

| Variable           | Required | Purpose                          |
| ------------------ | -------- | -------------------------------- |
| `OPENAI_API_KEY`   | Yes      | Embeddings + LLM calls           |
| `DATABASE_URL`     | Yes      | PostgreSQL (with pgvector)        |
| `REDIS_URL`        | Yes      | BullMQ job queue                  |
| `SEMANTIC_SCHOLAR_API_KEY` | No | Higher rate limits on S2 API |

---

## 10. Testing

The RAG engine is covered by **408 tests across 41 test files**, all passing.

Key test files and strategies:

| Module               | Tests | Strategy                                      |
| -------------------- | ----- | --------------------------------------------- |
| `pubmed.test.ts`     | ✓     | Mock `fetch`; test XML parsing, error handling |
| `arxiv.test.ts`      | ✓     | Mock `fetch`; test XML regex parsing           |
| `semantic-scholar.test.ts` | ✓ | Mock `fetch`; test rate limiting, retries    |
| `chunker.test.ts`    | ✓     | Pure functions; edge cases (empty, huge text)  |
| `vector-search.test.ts` | ✓  | Mock Prisma `$queryRaw`/`$executeRaw`          |
| `prompts.test.ts`    | ✓     | Snapshot prompt output; verify JSON structure   |
| `dossier-worker.test.ts` | ✓ | Mock all externals; full pipeline integration   |
| `queue.test.ts`      | ✓     | Mock BullMQ Queue; test enqueueing/status       |
| API route tests (×4) | ✓     | Mock Prisma + queue; test auth/validation       |
| Component tests (×4) | ✓     | Mock `fetch` + `next-auth`; test rendering      |

All external dependencies (OpenAI, PubMed, arXiv, S2, Redis, Prisma) are
mocked in tests — no network calls or database access required to run the
test suite.

---

## File Index

| File                                                              | Purpose                           |
| ----------------------------------------------------------------- | --------------------------------- |
| `src/lib/pubmed.ts`                                               | PubMed search + XML parsing       |
| `src/lib/arxiv.ts`                                                | arXiv search + XML parsing        |
| `src/lib/semantic-scholar.ts`                                     | Semantic Scholar client            |
| `src/lib/chunker.ts`                                              | Text chunking                     |
| `src/lib/openai.ts`                                               | OpenAI embeddings + moderation    |
| `src/lib/vector-search.ts`                                        | pgvector cosine similarity search |
| `src/lib/prompts.ts`                                              | LLM prompt templates              |
| `src/lib/queue.ts`                                                | BullMQ queue setup                |
| `src/workers/dossier-worker.ts`                                   | 10-step RAG pipeline worker       |
| `src/app/api/claims/[claimId]/research/route.ts`                  | Trigger research (POST)           |
| `src/app/api/claims/[claimId]/research/status/route.ts`           | Poll progress (GET)               |
| `src/app/api/claims/[claimId]/evidence/route.ts`                  | Fetch evidence cards (GET)        |
| `src/app/api/claims/[claimId]/verdict/route.ts`                   | Fetch verdict (GET)               |
| `src/components/research-progress.tsx`                             | Progress bar component            |
| `src/components/verdict-card.tsx`                                  | Verdict display component         |
| `src/components/evidence-card.tsx`                                 | Single evidence card component    |
| `src/components/evidence-list.tsx`                                 | Evidence list + filters           |
| `prisma/schema.prisma`                                            | Data models                       |
