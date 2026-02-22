/**
 * Tests for Semantic Scholar API client (src/lib/semantic-scholar.ts)
 *
 * Uses mocked fetch to validate request construction, response parsing,
 * error handling, and the rate-limiting / retry logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchSemanticScholar,
  getSemanticScholarPaper,
  getRecommendations,
  searchHealthPapers,
} from "@/lib/semantic-scholar";

// ── Mock global fetch ───────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Fixtures ────────────────────────────────────────────────────────────

const PAPER_A = {
  paperId: "abc123",
  externalIds: { DOI: "10.1234/test", PubMed: "33456789" },
  title: "Creatine and lean mass",
  abstract: "This study examined creatine supplementation effects.",
  tldr: { text: "Creatine increases lean mass." },
  authors: [{ name: "Smith J" }, { name: "Doe J" }],
  year: 2023,
  citationCount: 42,
  journal: { name: "J Sports Sci" },
  publicationTypes: ["JournalArticle", "Review"],
};

const PAPER_B = {
  paperId: "def456",
  externalIds: { DOI: "10.5678/test2" },
  title: "Protein timing meta-analysis",
  abstract: null,
  tldr: null,
  authors: [{ name: "Garcia M" }],
  year: 2021,
  citationCount: 15,
  journal: null,
  publicationTypes: null,
};

// ── Setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── searchSemanticScholar ───────────────────────────────────────────────

describe("searchSemanticScholar", () => {
  it("sends correct request params", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ total: 1, offset: 0, data: [PAPER_A] })
    );

    await searchSemanticScholar("creatine muscle mass", 10, 5);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/paper/search?");
    expect(url).toContain("query=creatine+muscle+mass");
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=5");
    expect(url).toContain("fields=");
  });

  it("returns parsed papers", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ total: 2, offset: 0, data: [PAPER_A, PAPER_B] })
    );

    const result = await searchSemanticScholar("creatine");
    expect(result.total).toBe(2);
    expect(result.papers).toHaveLength(2);
    expect(result.papers[0].title).toBe("Creatine and lean mass");
    expect(result.papers[1].abstract).toBeNull();
  });

  it("clamps limit to 100", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ total: 0, offset: 0, data: [] })
    );

    await searchSemanticScholar("test", 200);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("limit=100");
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Server Error", { status: 500, statusText: "Internal Server Error" })
    );

    await expect(searchSemanticScholar("test")).rejects.toThrow(
      /Semantic Scholar search failed.*500/
    );
  });

  it("handles empty result set", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ total: 0, offset: 0, data: [] })
    );

    const result = await searchSemanticScholar("obscure query xyz");
    expect(result.total).toBe(0);
    expect(result.papers).toHaveLength(0);
  });
});

// ── getSemanticScholarPaper ─────────────────────────────────────────────

describe("getSemanticScholarPaper", () => {
  it("fetches paper by Semantic Scholar ID", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(PAPER_A));

    const paper = await getSemanticScholarPaper("abc123");
    expect(paper).not.toBeNull();
    expect(paper!.paperId).toBe("abc123");
    expect(paper!.citationCount).toBe(42);
  });

  it("fetches paper by DOI prefix", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(PAPER_A));

    await getSemanticScholarPaper("DOI:10.1234/test");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/paper/DOI%3A10.1234%2Ftest");
  });

  it("returns null for 404", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const paper = await getSemanticScholarPaper("nonexistent");
    expect(paper).toBeNull();
  });

  it("throws on server error", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Error", { status: 502, statusText: "Bad Gateway" })
    );

    await expect(getSemanticScholarPaper("abc123")).rejects.toThrow(
      /paper fetch failed.*502/
    );
  });
});

// ── getRecommendations ──────────────────────────────────────────────────

describe("getRecommendations", () => {
  it("fetches recommendations for a paper", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ recommendedPapers: [PAPER_B] })
    );

    const recs = await getRecommendations("abc123", 5);
    expect(recs).toHaveLength(1);
    expect(recs[0].title).toBe("Protein timing meta-analysis");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/papers/forpaper/abc123");
    expect(url).toContain("limit=5");
  });

  it("throws on error", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Error", { status: 500, statusText: "Internal Server Error" })
    );

    await expect(getRecommendations("abc123")).rejects.toThrow(
      /recommendations failed/
    );
  });
});

// ── searchHealthPapers ──────────────────────────────────────────────────

describe("searchHealthPapers", () => {
  it("appends 'study' to query for domain relevance", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ total: 1, offset: 0, data: [PAPER_A] })
    );

    await searchHealthPapers("creatine muscle");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("query=creatine+muscle+study");
  });
});

// ── Rate limit retry ────────────────────────────────────────────────────

describe("rate limiting", () => {
  it("retries once on 429 Too Many Requests", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response("Rate limited", { status: 429, statusText: "Too Many Requests" })
      )
      .mockResolvedValueOnce(jsonResponse(PAPER_A));

    const paper = await getSemanticScholarPaper("abc123");
    expect(paper).not.toBeNull();
    // First call returned 429, second was the retry
    expect(mockFetch).toHaveBeenCalledTimes(2);
  }, 10_000);
});
