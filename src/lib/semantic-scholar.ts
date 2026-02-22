/**
 * Semantic Scholar Academic Graph API Client
 * Documentation: https://api.semanticscholar.org/api-docs/graph
 *
 * Free tier: 100 requests / 5 minutes (no key required).
 * With API key: 1 req/sec sustained.
 * Get a key at https://www.semanticscholar.org/product/api#api-key
 */

const S2_BASE_URL = "https://api.semanticscholar.org/graph/v1";
const S2_RECOMMEND_URL = "https://api.semanticscholar.org/recommendations/v1";

/** Fields we request from every paper endpoint */
const PAPER_FIELDS = [
  "paperId",
  "externalIds",
  "title",
  "abstract",
  "tldr",
  "authors",
  "year",
  "citationCount",
  "journal",
  "publicationTypes",
].join(",");

// ── Types ───────────────────────────────────────────────────────────────

export interface SemanticScholarPaper {
  paperId: string;
  externalIds: {
    DOI?: string;
    PubMed?: string;
    ArXiv?: string;
    PubMedCentral?: string;
  } | null;
  title: string;
  abstract: string | null;
  tldr: { text: string } | null;
  authors: { name: string }[];
  year: number | null;
  citationCount: number;
  journal: { name: string } | null;
  publicationTypes: string[] | null;
}

export interface SemanticScholarSearchResult {
  total: number;
  offset: number;
  papers: SemanticScholarPaper[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Build request headers (injects API key when available).
 */
function headers(): HeadersInit {
  const h: HeadersInit = { Accept: "application/json" };
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (key) h["x-api-key"] = key;
  return h;
}

/**
 * Rate-limit helper — waits between requests to stay within free tier.
 * With key: 1 req/sec. Without key: 100 req / 5 min ≈ 3 sec between.
 * Set SEMANTIC_SCHOLAR_NO_THROTTLE=1 in test environment to skip delays.
 */
const RATE_LIMIT_MS =
  process.env.NODE_ENV === "test"
    ? 0
    : process.env.SEMANTIC_SCHOLAR_API_KEY
      ? 1_100
      : 3_100;
let _lastRequestTime = 0;

async function rateLimitedFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const now = Date.now();
  const wait = RATE_LIMIT_MS - (now - _lastRequestTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  _lastRequestTime = Date.now();

  const response = await fetch(url, { ...init, headers: headers() });

  if (response.status === 429) {
    // Back off and retry once
    const backoff = process.env.NODE_ENV === "test" ? 0 : 5_000;
    await new Promise((r) => setTimeout(r, backoff));
    _lastRequestTime = Date.now();
    return fetch(url, { ...init, headers: headers() });
  }

  return response;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Search for papers by keyword query.
 *
 * @param query  Free-text search (e.g. "creatine muscle mass")
 * @param limit  Max papers to return (1-100, default 20)
 * @param offset Pagination offset (default 0)
 */
export async function searchSemanticScholar(
  query: string,
  limit = 20,
  offset = 0
): Promise<SemanticScholarSearchResult> {
  const params = new URLSearchParams({
    query,
    limit: String(Math.min(limit, 100)),
    offset: String(offset),
    fields: PAPER_FIELDS,
  });

  const response = await rateLimitedFetch(
    `${S2_BASE_URL}/paper/search?${params}`
  );

  if (!response.ok) {
    throw new Error(
      `Semantic Scholar search failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return {
    total: data.total ?? 0,
    offset: data.offset ?? offset,
    papers: (data.data ?? []) as SemanticScholarPaper[],
  };
}

/**
 * Fetch a single paper by external identifier.
 *
 * Supported id formats:
 *   - Semantic Scholar ID: "649def34f8be52c8b66281af98ae884c09aef38b"
 *   - DOI:   "DOI:10.1234/example"
 *   - PMID:  "PMID:12345678"
 *   - arXiv: "ARXIV:2106.15928"
 *   - PMC:   "PMCID:PMC12345"
 */
export async function getSemanticScholarPaper(
  externalId: string
): Promise<SemanticScholarPaper | null> {
  const response = await rateLimitedFetch(
    `${S2_BASE_URL}/paper/${encodeURIComponent(externalId)}?fields=${PAPER_FIELDS}`
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(
      `Semantic Scholar paper fetch failed: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as SemanticScholarPaper;
}

/**
 * Get recommended papers similar to a given paper.
 *
 * Uses the Semantic Scholar recommendations API.
 *
 * @param paperId  Semantic Scholar paper ID
 * @param limit    Max recommendations (1-100, default 10)
 */
export async function getRecommendations(
  paperId: string,
  limit = 10
): Promise<SemanticScholarPaper[]> {
  const params = new URLSearchParams({
    fields: PAPER_FIELDS,
    limit: String(Math.min(limit, 100)),
  });

  const response = await rateLimitedFetch(
    `${S2_RECOMMEND_URL}/papers/forpaper/${encodeURIComponent(paperId)}?${params}`
  );

  if (!response.ok) {
    throw new Error(
      `Semantic Scholar recommendations failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return (data.recommendedPapers ?? []) as SemanticScholarPaper[];
}

/**
 * Convenience: search specifically for health/fitness research papers.
 * Appends relevant terms to improve result quality for our domain.
 */
export async function searchHealthPapers(
  query: string,
  limit = 20
): Promise<SemanticScholarSearchResult> {
  // Semantic Scholar handles broad queries well — adding "study" nudges
  // toward empirical research rather than news articles.
  const refinedQuery = `${query} study`;
  return searchSemanticScholar(refinedQuery, limit);
}
