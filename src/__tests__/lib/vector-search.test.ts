/**
 * Tests for pgvector similarity search (src/lib/vector-search.ts)
 *
 * Mocks Prisma raw SQL methods to validate query construction,
 * parameter passing, result mapping, and the group-by-paper helper.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the module under test
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  searchSimilarChunks,
  storeChunkWithEmbedding,
  storeChunksWithEmbeddings,
  searchChunksGroupedByPaper,
} from "@/lib/vector-search";

const mockQuery = vi.mocked(prisma.$queryRawUnsafe);
const mockExecute = vi.mocked(prisma.$executeRawUnsafe);
const mockTransaction = vi.mocked(prisma.$transaction);

// ── Fixtures ────────────────────────────────────────────────────────────

/** A small 3-dim fake embedding (real ones are 1536-dim) */
const FAKE_EMBEDDING = [0.1, 0.2, 0.3];

const ROW_A = {
  id: "chunk-1",
  paperId: "paper-1",
  content: "Creatine improves strength.",
  chunkIndex: 0,
  similarity: 0.92,
};

const ROW_B = {
  id: "chunk-2",
  paperId: "paper-2",
  content: "Protein timing is less important.",
  chunkIndex: 0,
  similarity: 0.85,
};

const ROW_C = {
  id: "chunk-3",
  paperId: "paper-1",
  content: "Lean mass increased by 1.4 kg.",
  chunkIndex: 1,
  similarity: 0.80,
};

// ── Setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── searchSimilarChunks ─────────────────────────────────────────────────

describe("searchSimilarChunks", () => {
  it("sends vector literal and default params", async () => {
    mockQuery.mockResolvedValueOnce([ROW_A]);

    const results = await searchSimilarChunks(FAKE_EMBEDDING);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, vec, limit] = mockQuery.mock.calls[0];
    expect(sql).toContain("<=>"); // cosine distance operator
    expect(sql).toContain("DocumentChunk");
    expect(vec).toBe("[0.1,0.2,0.3]");
    expect(limit).toBe(10); // default
    expect(results).toHaveLength(1);
    expect(results[0].similarity).toBe(0.92);
  });

  it("applies custom limit and minSimilarity", async () => {
    mockQuery.mockResolvedValueOnce([]);

    await searchSimilarChunks(FAKE_EMBEDDING, {
      limit: 5,
      minSimilarity: 0.8,
    });

    const [sql, , limit] = mockQuery.mock.calls[0];
    expect(limit).toBe(5);
    expect(sql).toContain("0.8"); // minSimilarity embedded in SQL
  });

  it("filters by paperIds when provided", async () => {
    mockQuery.mockResolvedValueOnce([ROW_A]);

    await searchSimilarChunks(FAKE_EMBEDDING, {
      paperIds: ["paper-1", "paper-2"],
    });

    const [sql, , , paperIds] = mockQuery.mock.calls[0];
    expect(sql).toContain('AND "paperId" = ANY($3::text[])');
    expect(paperIds).toEqual(["paper-1", "paper-2"]);
  });

  it("does not include paper filter when paperIds is empty", async () => {
    mockQuery.mockResolvedValueOnce([]);

    await searchSimilarChunks(FAKE_EMBEDDING, { paperIds: [] });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).not.toContain("ANY");
  });

  it("maps rows to SimilarChunk objects", async () => {
    mockQuery.mockResolvedValueOnce([ROW_A, ROW_B]);

    const results = await searchSimilarChunks(FAKE_EMBEDDING);

    expect(results).toEqual([
      { id: "chunk-1", paperId: "paper-1", content: "Creatine improves strength.", chunkIndex: 0, similarity: 0.92 },
      { id: "chunk-2", paperId: "paper-2", content: "Protein timing is less important.", chunkIndex: 0, similarity: 0.85 },
    ]);
  });
});

// ── storeChunkWithEmbedding ─────────────────────────────────────────────

describe("storeChunkWithEmbedding", () => {
  it("inserts a chunk with vector embedding", async () => {
    mockExecute.mockResolvedValueOnce(1);

    const id = await storeChunkWithEmbedding({
      paperId: "paper-1",
      content: "Some text",
      chunkIndex: 0,
      embedding: FAKE_EMBEDDING,
      tokenCount: 5,
    });

    expect(id).toBeTruthy();
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, , paperId, content, chunkIndex, vecStr, tokenCount] =
      mockExecute.mock.calls[0];
    expect(sql).toContain("INSERT INTO");
    expect(sql).toContain("$5::vector");
    expect(paperId).toBe("paper-1");
    expect(content).toBe("Some text");
    expect(chunkIndex).toBe(0);
    expect(vecStr).toBe("[0.1,0.2,0.3]");
    expect(tokenCount).toBe(5);
  });

  it("uses provided id when given", async () => {
    mockExecute.mockResolvedValueOnce(1);

    const id = await storeChunkWithEmbedding({
      id: "my-custom-id",
      paperId: "paper-1",
      content: "text",
      chunkIndex: 0,
      embedding: FAKE_EMBEDDING,
    });

    expect(id).toBe("my-custom-id");
    const [, insertedId] = mockExecute.mock.calls[0];
    expect(insertedId).toBe("my-custom-id");
  });
});

// ── storeChunksWithEmbeddings ───────────────────────────────────────────

describe("storeChunksWithEmbeddings", () => {
  it("inserts multiple chunks in a transaction", async () => {
    // Mock $transaction to actually call the callback with a mock tx
    const mockTxExecute = vi.fn().mockResolvedValue(1);
    mockTransaction.mockImplementationOnce(async (cb: any) => {
      return cb({ $executeRawUnsafe: mockTxExecute });
    });

    const ids = await storeChunksWithEmbeddings([
      { paperId: "p1", content: "A", chunkIndex: 0, embedding: [1, 2, 3] },
      { paperId: "p1", content: "B", chunkIndex: 1, embedding: [4, 5, 6] },
    ]);

    expect(ids).toHaveLength(2);
    expect(mockTxExecute).toHaveBeenCalledTimes(2);
  });
});

// ── searchChunksGroupedByPaper ──────────────────────────────────────────

describe("searchChunksGroupedByPaper", () => {
  it("groups results by paperId with max chunks per paper", async () => {
    mockQuery.mockResolvedValueOnce([ROW_A, ROW_B, ROW_C]);

    const grouped = await searchChunksGroupedByPaper(FAKE_EMBEDDING, {
      limit: 10,
      chunksPerPaper: 2,
    });

    expect(grouped.size).toBe(2);
    // paper-1 has ROW_A and ROW_C
    expect(grouped.get("paper-1")).toHaveLength(2);
    // paper-2 has ROW_B
    expect(grouped.get("paper-2")).toHaveLength(1);
  });

  it("respects chunksPerPaper limit", async () => {
    // All three chunks from paper-1
    const allP1 = [
      { ...ROW_A, id: "c1", similarity: 0.95 },
      { ...ROW_C, id: "c2", similarity: 0.90 },
      { id: "c3", paperId: "paper-1", content: "Third", chunkIndex: 2, similarity: 0.85 },
    ];
    mockQuery.mockResolvedValueOnce(allP1);

    const grouped = await searchChunksGroupedByPaper(FAKE_EMBEDDING, {
      chunksPerPaper: 2,
    });

    // Should only keep the first 2 for paper-1
    expect(grouped.get("paper-1")).toHaveLength(2);
  });

  it("defaults to 3 chunks per paper", async () => {
    mockQuery.mockResolvedValueOnce([ROW_A, ROW_C]);

    const grouped = await searchChunksGroupedByPaper(FAKE_EMBEDDING);

    // Both belong to paper-1, within default limit of 3
    expect(grouped.get("paper-1")).toHaveLength(2);
  });
});
