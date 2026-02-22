/**
 * Text Chunking Utility
 *
 * Splits paper text (abstract or full-text) into overlapping chunks sized
 * for the embedding model (text-embedding-3-small, 8 191 token limit).
 *
 * Design choices:
 *   - Target ~500 tokens per chunk (~2 000 chars) — sweet spot for retrieval.
 *   - ~100 token overlap (~400 chars) so no sentence is lost at boundaries.
 *   - Split priority: paragraph > sentence > word (preserves semantics).
 *   - Token count is approximated at 1 token ≈ 4 chars (accurate enough for
 *     chunking; exact counting via tiktoken adds ~4 MB to the bundle).
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface Chunk {
  /** The chunk text content */
  content: string;
  /** Zero-based position in the sequence */
  chunkIndex: number;
  /** Approximate token count (chars / 4) */
  estimatedTokens: number;
}

export interface ChunkOptions {
  /** Target maximum tokens per chunk (default 500) */
  maxChunkTokens?: number;
  /** Overlap tokens carried from previous chunk (default 100) */
  overlapTokens?: number;
}

// ── Constants ───────────────────────────────────────────────────────────

const CHARS_PER_TOKEN = 4;
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_OVERLAP_TOKENS = 100;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Approximate token count for a string. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Convert a token count to an approximate character count. */
function tokensToChars(tokens: number): number {
  return tokens * CHARS_PER_TOKEN;
}

/**
 * Split text into sentences using common sentence-ending punctuation.
 * Keeps the delimiter attached to the sentence.
 */
function splitSentences(text: string): string[] {
  // Match sentence-ending punctuation followed by whitespace or end-of-string.
  // Handles ". ", "? ", "! ", and .\n etc.  Avoids splitting on abbreviations
  // like "et al." or "Dr." by requiring at least 2 chars before the period,
  // but this is a best-effort heuristic — not a full NLP sentence tokenizer.
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.filter((s) => s.length > 0);
}

/**
 * Clean raw text: normalise whitespace, trim, collapse blank lines.
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Core ────────────────────────────────────────────────────────────────

/**
 * Split `text` into overlapping chunks suitable for embedding.
 *
 * Algorithm:
 *   1. Clean and split into paragraphs.
 *   2. Greedily pack paragraphs into chunks up to the token limit.
 *   3. If a single paragraph exceeds the limit, split it by sentences.
 *   4. If a single sentence still exceeds the limit, hard-split by chars.
 *   5. Apply overlap: prepend the tail of the previous chunk.
 */
export function chunkText(text: string, options?: ChunkOptions): Chunk[] {
  const maxTokens = options?.maxChunkTokens ?? DEFAULT_MAX_TOKENS;
  const overlapTokens = options?.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
  const maxChars = tokensToChars(maxTokens);
  const overlapChars = tokensToChars(overlapTokens);

  const cleaned = cleanText(text);
  if (cleaned.length === 0) return [];

  // If the whole text fits in one chunk, return it directly.
  if (cleaned.length <= maxChars) {
    return [
      {
        content: cleaned,
        chunkIndex: 0,
        estimatedTokens: estimateTokens(cleaned),
      },
    ];
  }

  // Split into paragraphs (double newline)
  const paragraphs = cleaned.split(/\n\n+/).filter((p) => p.length > 0);

  // Flatten paragraphs into sentence-level segments.  If a paragraph fits
  // within the chunk budget we keep it whole; otherwise we split by sentence.
  const segments: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      segments.push(para);
    } else {
      // Paragraph too large — split into sentences
      const sentences = splitSentences(para);
      for (const sentence of sentences) {
        if (sentence.length <= maxChars) {
          segments.push(sentence);
        } else {
          // Single sentence exceeds limit — hard-split by chars
          for (let i = 0; i < sentence.length; i += maxChars) {
            segments.push(sentence.slice(i, i + maxChars));
          }
        }
      }
    }
  }

  // Greedily pack segments into chunks
  const rawChunks: string[] = [];
  let current = "";

  for (const segment of segments) {
    const candidate = current.length === 0 ? segment : `${current}\n\n${segment}`;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current.length > 0) rawChunks.push(current);
      current = segment;
    }
  }
  if (current.length > 0) rawChunks.push(current);

  // Apply overlap
  const chunks: Chunk[] = rawChunks.map((content, i) => {
    if (i === 0 || overlapChars === 0) {
      return {
        content,
        chunkIndex: i,
        estimatedTokens: estimateTokens(content),
      };
    }

    // Take the tail of the previous raw chunk as overlap prefix
    const prevChunk = rawChunks[i - 1];
    const overlapText = prevChunk.slice(-overlapChars);
    // Find a word boundary to avoid cutting mid-word
    const boundaryIdx = overlapText.indexOf(" ");
    const cleanOverlap =
      boundaryIdx >= 0 ? overlapText.slice(boundaryIdx + 1) : overlapText;

    const withOverlap = `${cleanOverlap}\n\n${content}`;
    return {
      content: withOverlap,
      chunkIndex: i,
      estimatedTokens: estimateTokens(withOverlap),
    };
  });

  return chunks;
}
