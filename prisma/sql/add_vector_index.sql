-- pgvector index for DocumentChunk embeddings
--
-- Run after the pgvector extension is enabled and the DocumentChunk table exists.
-- For small datasets (<1 000 chunks) a sequential scan is fine and this index
-- is optional. Apply it when the chunk count grows for faster similarity search.
--
-- Two options (uncomment ONE):
--
-- Option A: IVFFlat — faster to build, requires re-building as data grows.
--   Good for < 100K rows.  Change `lists` based on row count (sqrt(n) is a
--   common heuristic).
--
-- CREATE INDEX IF NOT EXISTS idx_document_chunk_embedding_ivfflat
-- ON "DocumentChunk"
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);
--
-- Option B: HNSW — slower to build, but self-maintains and better recall.
--   Recommended for production when data is growing.

CREATE INDEX IF NOT EXISTS idx_document_chunk_embedding_hnsw
ON "DocumentChunk"
USING hnsw (embedding vector_cosine_ops);
