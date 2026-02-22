/**
 * PubMed E-utilities API Client
 * Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 */
import { XMLParser } from "fast-xml-parser";

const PUBMED_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

/** Shared XML parser configured for PubMed efetch responses */
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Preserve numeric-looking node text as strings (e.g. PMIDs, DOIs)
  parseTagValue: false,
  isArray: (name) =>
    ["PubmedArticle", "Author", "AbstractText", "ArticleId"].includes(name),
});

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
 * Fetch detailed article information for given PubMed IDs.
 * Uses PubMed efetch with XML format, parsed via fast-xml-parser.
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
  return parsePubMedXml(xmlText);
}

// ── XML helpers ─────────────────────────────────────────────────────────

/**
 * Parse PubMed efetch XML into structured article objects.
 * Exported for testing.
 */
export function parsePubMedXml(xmlText: string): PubMedArticle[] {
  const parsed = xmlParser.parse(xmlText);

  const articles: unknown[] =
    parsed?.PubmedArticleSet?.PubmedArticle ?? [];

  return articles.map(parseOneArticle);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseOneArticle(article: any): PubMedArticle {
  const medline = article?.MedlineCitation;
  const pubmedData = article?.PubmedData;

  // PMID
  const pmidNode = medline?.PMID;
  const pmid: string = typeof pmidNode === "object" ? pmidNode["#text"] : String(pmidNode ?? "");

  // Title
  const title: string = medline?.Article?.ArticleTitle ?? "";

  // Abstract — may be a single string or an array of labelled sections
  const abstractNode = medline?.Article?.Abstract?.AbstractText;
  const abstract = extractAbstract(abstractNode);

  // Authors
  const authorList: any[] = medline?.Article?.AuthorList?.Author ?? [];
  const authors: string[] = authorList
    .map((a: any) => {
      if (a.CollectiveName) return String(a.CollectiveName);
      const last = a.LastName ?? "";
      const fore = a.ForeName ?? a.Initials ?? "";
      return `${last} ${fore}`.trim();
    })
    .filter(Boolean);

  // Journal + year
  const journal: string | undefined =
    medline?.Article?.Journal?.Title ?? undefined;
  const pubDate = medline?.Article?.Journal?.JournalIssue?.PubDate;
  const publishedYear = parseYear(pubDate);

  // DOI + PMC ID from ArticleIdList
  const idList: any[] = pubmedData?.ArticleIdList?.ArticleId ?? [];
  const doi = extractId(idList, "doi");
  const pmcid = extractId(idList, "pmc");

  // Full-text URL (PMC)
  const fullTextUrl = pmcid ? getPMCFullTextUrl(pmcid) : undefined;

  return { pmid, title, abstract, authors, journal, publishedYear, doi, pmcid, fullTextUrl };
}

/** Collapse structured or plain abstract into a single string. */
function extractAbstract(node: unknown): string | undefined {
  if (!node) return undefined;
  if (typeof node === "string") return node;

  // Array of labelled sections (e.g. BACKGROUND, METHODS, …)
  if (Array.isArray(node)) {
    return node
      .map((section: any) => {
        const label: string = section?.["@_Label"] ?? "";
        const text: string = typeof section === "object" ? (section["#text"] ?? "") : String(section);
        return label ? `${label}: ${text}` : text;
      })
      .filter(Boolean)
      .join("\n");
  }

  // Single object with #text
  if (typeof node === "object" && node !== null) {
    return (node as any)["#text"] ?? String(node);
  }

  return String(node);
}

/** Extract an ID by IdType attribute from PubmedData > ArticleIdList */
function extractId(idList: any[], idType: string): string | undefined {
  const entry = idList.find((id: any) => id?.["@_IdType"] === idType);
  if (!entry) return undefined;
  const val = typeof entry === "object" ? entry["#text"] : entry;
  return val ? String(val) : undefined;
}

/** Parse year from PubDate (which may have Year, MedlineDate, etc.) */
function parseYear(pubDate: any): number | undefined {
  if (!pubDate) return undefined;
  if (pubDate.Year) return parseInt(String(pubDate.Year), 10) || undefined;
  // MedlineDate is a freeform string like "2020 Jan-Feb"
  if (pubDate.MedlineDate) {
    const match = String(pubDate.MedlineDate).match(/\d{4}/);
    return match ? parseInt(match[0], 10) : undefined;
  }
  return undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
