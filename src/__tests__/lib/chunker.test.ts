/**
 * Tests for text chunking utility (src/lib/chunker.ts)
 *
 * Validates splitting logic, overlap, edge cases (empty text, single
 * chunk, huge paragraphs, huge sentences), and token estimation.
 */
import { describe, it, expect } from "vitest";
import { chunkText, estimateTokens } from "@/lib/chunker";

// ── estimateTokens ──────────────────────────────────────────────────────

describe("estimateTokens", () => {
  it("approximates 1 token per 4 chars", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2); // ceil(5/4)
    expect(estimateTokens("a".repeat(100))).toBe(25);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

// ── chunkText ───────────────────────────────────────────────────────────

describe("chunkText", () => {
  it("returns empty array for empty string", () => {
    expect(chunkText("")).toHaveLength(0);
    expect(chunkText("   ")).toHaveLength(0);
  });

  it("returns single chunk when text is short", () => {
    const chunks = chunkText("This is a short abstract about creatine.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toBe(
      "This is a short abstract about creatine."
    );
    expect(chunks[0].estimatedTokens).toBeGreaterThan(0);
  });

  it("splits long text into multiple chunks", () => {
    // ~500 tokens = 2000 chars per chunk. Generate ~6000 chars of text.
    const paragraph = "This is a sentence about fitness research. ".repeat(50);
    const text = `${paragraph}\n\n${paragraph}\n\n${paragraph}`;

    const chunks = chunkText(text, { maxChunkTokens: 500, overlapTokens: 0 });
    expect(chunks.length).toBeGreaterThan(1);

    // Every chunk (except possibly last) should be ≤ maxChunkTokens
    for (const chunk of chunks) {
      expect(chunk.estimatedTokens).toBeLessThanOrEqual(550); // small tolerance
    }
  });

  it("chunk indices are sequential starting at 0", () => {
    const text = "Word. ".repeat(1000);
    const chunks = chunkText(text, { maxChunkTokens: 100, overlapTokens: 0 });
    chunks.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
    });
  });

  it("applies overlap from previous chunk", () => {
    const text = "Word. ".repeat(1000);
    const chunks = chunkText(text, {
      maxChunkTokens: 100,
      overlapTokens: 20,
    });

    expect(chunks.length).toBeGreaterThan(1);
    // Second chunk should start with text from the end of the first
    // The overlap is taken from the tail of the previous raw chunk
    // so chunk[1].content should contain some text that also appears near the end of chunk[0]
    const overlapRegion = chunks[0].content.slice(-50);
    // At least part of that tail should appear in chunk[1]
    const someOverlapPresent = chunks[1].content.includes(
      overlapRegion.slice(-20)
    );
    expect(someOverlapPresent).toBe(true);
  });

  it("no overlap on first chunk", () => {
    const text = "Sentence one. ".repeat(300);
    const chunks = chunkText(text, {
      maxChunkTokens: 100,
      overlapTokens: 50,
    });
    // First chunk should just be the raw content, no extra prefix
    expect(chunks[0].estimatedTokens).toBeLessThanOrEqual(110);
  });

  it("handles text with no paragraph breaks (splits by sentence)", () => {
    // A single giant paragraph with many sentences
    const text = "Creatine helps. Protein matters. Sleep is key. ".repeat(200);
    const chunks = chunkText(text, { maxChunkTokens: 100, overlapTokens: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
    }
  });

  it("hard-splits a single enormous sentence", () => {
    // One sentence with no periods, longer than maxChunkTokens
    const text = "word ".repeat(1000); // ~5000 chars = ~1250 tokens
    const chunks = chunkText(text, { maxChunkTokens: 200, overlapTokens: 0 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("cleans whitespace and normalises newlines", () => {
    const messy = "  Hello   world.\r\n\r\nSecond  paragraph.\n\n\n\nThird.  ";
    const chunks = chunkText(messy);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(
      "Hello world.\n\nSecond paragraph.\n\nThird."
    );
  });

  it("zero overlap produces no overlap text", () => {
    const text = "A. ".repeat(500);
    const chunks = chunkText(text, { maxChunkTokens: 50, overlapTokens: 0 });
    // With zero overlap, chunks should not share content
    // (aside from possible sentence boundary alignment)
    expect(chunks.length).toBeGreaterThan(1);
    // The total unique chars should approximately equal the cleaned text length
    const totalChars = chunks.reduce((sum, c) => sum + c.content.length, 0);
    const cleanedLen = text.trim().length;
    // With zero overlap total should be close to original (paragraph
    // join chars "\n\n" cause some expansion, so allow 40% tolerance)
    expect(totalChars).toBeLessThan(cleanedLen * 1.4);
  });

  it("uses default options when none provided", () => {
    // Just verify it doesn't throw with defaults
    const text = "Test sentence. ".repeat(400);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(0);
  });
});
