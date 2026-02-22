/**
 * pgvector Similarity Search
 *
 * Provides cosine-similarity search over DocumentChunk embeddings stored
 * in PostgreSQL via the pgvector extension.
 *
 * Prisma doesn't natively support pgvector operators, so we use raw SQL
 * through `prisma.$queryRawUnsafe`.
 *
 * Prerequisites:
 *   - pgvector extension enabled: CREATE EXTENSION IF NOT EXISTS vector;
 *   - DocumentChunk table with `embedding vector(1536)` column
 *   - Optionally an IVFFlat or HNSW index for performance at scale
 */
import { prisma } from "@/lib/prisma";

// ── Types ───────────────────────────────────────────────────────────────

export interface SimilarChunk {
  id: string;
  paperId: string;
  content: string;
  chunkIndex: number;
  /** Cosine similarity (1.0 = identical, 0.0 = orthogonal) */
  similarity: number;
}

export interface VectorSearchOptions {
  /** Maximum number of results (default 10) */
  limit?: number;
  /** Minimum cosine similarity threshold (default 0.7) */
  minSimilarity?: number;
  /** Restrict search to specific paper IDs */
  paperIds?: string[];
}

// ── Core search ─────────────────────────────────────────────────────────

/**
 * Find DocumentChunks most similar to a query embedding.
 *
 * Uses the pgvector `<=>` cosine distance operator.
 * similarity = 1 - cosine_distance.
 *
 * @param queryEmbedding  1536-dim vector from text-embedding-3-small
 * @param options         Limit, min similarity, optional paper ID filter
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  options: VectorSearchOptions = {}
): Promise<SimilarChunk[]> {
  const { limit = 10, minSimilarity = 0.7, paperIds } = options;

  // Build the vector literal for pgvector
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // Build optional paper ID filter
  const paperFilter = paperIds?.length
    ? `AND "paperId" = ANY($3::text[])`
    : "";

  // Parameters array (positional: $1 = vector, $2 = limit, $3 = paperIds)
  const params: unknown[] = [vectorStr, limit];
  if (paperIds?.length) params.push(paperIds);

  const query = `
    SELECT
      id,
      "paperId",
      content,
      "chunkIndex",
      1 - (embedding <=> $1::vector) AS similarity
    FROM "DocumentChunk"
    WHERE embedding IS NOT NULL
      AND 1 - (embedding <=> $1::vector) >= ${minSimilarity}
      ${paperFilter}
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $2
  `;

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      paperId: string;
      content: string;
      chunkIndex: number;
      similarity: number;
    }>
  >(query, ...params);

  return rows.map((row) => ({
    id: row.id,
    paperId: row.paperId,
    content: row.content,
    chunkIndex: row.chunkIndex,
    similarity: Number(row.similarity),
  }));
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Store a chunk with its embedding in the DocumentChunk table.
 *
 * Uses raw SQL because Prisma can't write to `Unsupported` vector columns.
 */
export async function storeChunkWithEmbedding(params: {
  id?: string;
  paperId: string;
  content: string;
  chunkIndex: number;
  embedding: number[];
  tokenCount?: number;
}): Promise<string> {
  const { paperId, content, chunkIndex, embedding, tokenCount } = params;
  const id = params.id ?? crypto.randomUUID().replace(/-/g, "");
  const vectorStr = `[${embedding.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "DocumentChunk" (id, "paperId", content, "chunkIndex", embedding, "tokenCount", "createdAt")
    VALUES ($1, $2, $3, $4, $5::vector, $6, NOW())
    ON CONFLICT (id) DO UPDATE SET
      embedding = EXCLUDED.embedding,
      content = EXCLUDED.content,
      "tokenCount" = EXCLUDED."tokenCount"
    `,
    id,
    paperId,
    content,
    chunkIndex,
    vectorStr,
    tokenCount ?? null
  );

  return id;
}

/**
 * Store multiple chunks with embeddings in a single transaction.
 */
export async function storeChunksWithEmbeddings(
  chunks: Array<{
    paperId: string;
    content: string;
    chunkIndex: number;
    embedding: number[];
    tokenCount?: number;
  }>
): Promise<string[]> {
  const ids: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const chunk of chunks) {
      const id = crypto.randomUUID().replace(/-/g, "");
      const vectorStr = `[${chunk.embedding.join(",")}]`;
      await tx.$executeRawUnsafe(
        `
        INSERT INTO "DocumentChunk" (id, "paperId", content, "chunkIndex", embedding, "tokenCount", "createdAt")
        VALUES ($1, $2, $3, $4, $5::vector, $6, NOW())
        `,
        id,
        chunk.paperId,
        chunk.content,
        chunk.chunkIndex,
        vectorStr,
        chunk.tokenCount ?? null
      );
      ids.push(id);
    }
  });
  return ids;
}

/**
 * Find the top-K most relevant chunks grouped by paper.
 *
 * Returns a map of paperId → chunks (sorted by similarity desc).
 * Useful for feeding the best context per paper into the LLM.
 */
export async function searchChunksGroupedByPaper(
  queryEmbedding: number[],
  options: VectorSearchOptions & { chunksPerPaper?: number } = {}
): Promise<Map<string, SimilarChunk[]>> {
  const { chunksPerPaper = 3, ...searchOpts } = options;

  // Fetch more than needed so we can pick top-N per paper
  const allChunks = await searchSimilarChunks(queryEmbedding, {
    ...searchOpts,
    limit: (searchOpts.limit ?? 10) * chunksPerPaper,
  });

  const grouped = new Map<string, SimilarChunk[]>();
  for (const chunk of allChunks) {
    const existing = grouped.get(chunk.paperId) ?? [];
    if (existing.length < chunksPerPaper) {
      existing.push(chunk);
      grouped.set(chunk.paperId, existing);
    }
  }

  return grouped;
}
