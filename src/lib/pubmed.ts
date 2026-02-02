/**
 * PubMed E-utilities API Client
 * Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 */

const PUBMED_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export interface PubMedArticle {
  pmid: string;
  pmcid?: string;
  doi?: string;
  title: string;
  abstract?: string;
  authors: string[];
  journal?: string;
  publishedYear?: number;
  fullTextUrl?: string;
}

export interface PubMedSearchResult {
  count: number;
  ids: string[];
}

/**
 * Search PubMed for articles matching a query
 */
export async function searchPubMed(
  query: string,
  options: {
    maxResults?: number;
    retStart?: number;
  } = {}
): Promise<PubMedSearchResult> {
  const { maxResults = 20, retStart = 0 } = options;

  const params = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: maxResults.toString(),
    retstart: retStart.toString(),
    retmode: "json",
    ...(process.env.NCBI_API_KEY && { api_key: process.env.NCBI_API_KEY }),
  });

  const response = await fetch(`${PUBMED_BASE_URL}/esearch.fcgi?${params}`);

  if (!response.ok) {
    throw new Error(`PubMed search failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    count: parseInt(data.esearchresult.count, 10),
    ids: data.esearchresult.idlist || [],
  };
}

/**
 * Fetch detailed article information for given PubMed IDs
 */
export async function fetchPubMedArticles(
  pmids: string[]
): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];

  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "xml",
    ...(process.env.NCBI_API_KEY && { api_key: process.env.NCBI_API_KEY }),
  });

  const response = await fetch(`${PUBMED_BASE_URL}/efetch.fcgi?${params}`);

  if (!response.ok) {
    throw new Error(`PubMed fetch failed: ${response.statusText}`);
  }

  const xmlText = await response.text();
  
  // Parse XML - in Phase 1, we'll use a proper XML parser
  // For now, return a placeholder structure
  // TODO: Implement full XML parsing in Phase 1
  return pmids.map((pmid) => ({
    pmid,
    title: `Article ${pmid}`, // Placeholder
    authors: [],
    abstract: undefined,
  }));
}

/**
 * Search PubMed Central for open access full-text articles
 */
export async function searchPMC(
  query: string,
  options: { maxResults?: number } = {}
): Promise<PubMedSearchResult> {
  const { maxResults = 20 } = options;

  const params = new URLSearchParams({
    db: "pmc",
    term: `${query} AND open access[filter]`,
    retmax: maxResults.toString(),
    retmode: "json",
    ...(process.env.NCBI_API_KEY && { api_key: process.env.NCBI_API_KEY }),
  });

  const response = await fetch(`${PUBMED_BASE_URL}/esearch.fcgi?${params}`);

  if (!response.ok) {
    throw new Error(`PMC search failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    count: parseInt(data.esearchresult.count, 10),
    ids: data.esearchresult.idlist || [],
  };
}

/**
 * Get PMC ID from PubMed ID (for open access full-text link)
 */
export async function getPMCIdFromPMID(pmid: string): Promise<string | null> {
  const params = new URLSearchParams({
    dbfrom: "pubmed",
    db: "pmc",
    id: pmid,
    retmode: "json",
    ...(process.env.NCBI_API_KEY && { api_key: process.env.NCBI_API_KEY }),
  });

  const response = await fetch(`${PUBMED_BASE_URL}/elink.fcgi?${params}`);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  // Extract PMC ID from link results
  const linkset = data.linksets?.[0];
  const pmcLink = linkset?.linksetdbs?.find(
    (db: { dbto: string }) => db.dbto === "pmc"
  );

  return pmcLink?.links?.[0] || null;
}

/**
 * Generate full-text URL for PMC article
 */
export function getPMCFullTextUrl(pmcid: string): string {
  return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcid}/`;
}

/**
 * Generate PDF URL for PMC article
 */
export function getPMCPdfUrl(pmcid: string): string {
  return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcid}/pdf/`;
}
