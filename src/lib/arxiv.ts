/**
 * arXiv API Client
 * Documentation: https://info.arxiv.org/help/api/index.html
 */

const ARXIV_BASE_URL = "http://export.arxiv.org/api/query";

export interface ArxivArticle {
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedDate: string;
  publishedYear: number;
  pdfUrl: string;
  categories: string[];
  doi?: string;
}

export interface ArxivSearchResult {
  totalResults: number;
  articles: ArxivArticle[];
}

/**
 * Search arXiv for articles matching a query
 * Focus on health/biomedical categories: q-bio, physics.med-ph, stat.AP
 */
export async function searchArxiv(
  query: string,
  options: {
    maxResults?: number;
    start?: number;
    categories?: string[];
  } = {}
): Promise<ArxivSearchResult> {
  const { maxResults = 20, start = 0, categories = [] } = options;

  // Build search query
  let searchQuery = `all:${encodeURIComponent(query)}`;
  
  // Add category filter for health-related papers
  if (categories.length > 0) {
    const catFilter = categories.map((cat) => `cat:${cat}`).join("+OR+");
    searchQuery = `(${searchQuery})+AND+(${catFilter})`;
  }

  const params = new URLSearchParams({
    search_query: searchQuery,
    start: start.toString(),
    max_results: maxResults.toString(),
    sortBy: "relevance",
    sortOrder: "descending",
  });

  const response = await fetch(`${ARXIV_BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`arXiv search failed: ${response.statusText}`);
  }

  const xmlText = await response.text();
  
  // Parse XML response
  // TODO: Use proper XML parser in Phase 1
  // For now, return basic structure
  return parseArxivResponse(xmlText);
}

/**
 * Search arXiv specifically for health/biomedical papers
 */
export async function searchArxivHealth(
  query: string,
  maxResults: number = 20
): Promise<ArxivSearchResult> {
  // Health-related arXiv categories
  const healthCategories = [
    "q-bio.QM", // Quantitative Methods (biology)
    "q-bio.TO", // Tissues and Organs
    "q-bio.NC", // Neurons and Cognition
    "physics.med-ph", // Medical Physics
    "stat.AP", // Statistics Applications
    "cs.LG", // Machine Learning (for health AI papers)
  ];

  return searchArxiv(query, {
    maxResults,
    categories: healthCategories,
  });
}

/**
 * Parse arXiv XML response
 * Basic implementation - will be enhanced in Phase 1
 */
function parseArxivResponse(xmlText: string): ArxivSearchResult {
  const articles: ArxivArticle[] = [];

  // Extract total results
  const totalMatch = xmlText.match(
    /<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/
  );
  const totalResults = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  // Extract entries (basic regex parsing - proper XML in Phase 1)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryXml = match[1];

    // Extract ID
    const idMatch = entryXml.match(/<id>http:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/);
    const arxivId = idMatch ? idMatch[1] : "";

    // Extract title
    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(/\s+/g, " ").trim()
      : "";

    // Extract abstract
    const abstractMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
    const abstract = abstractMatch
      ? abstractMatch[1].replace(/\s+/g, " ").trim()
      : "";

    // Extract published date
    const publishedMatch = entryXml.match(/<published>([^<]+)<\/published>/);
    const publishedDate = publishedMatch ? publishedMatch[1] : "";
    const publishedYear = publishedDate
      ? parseInt(publishedDate.substring(0, 4), 10)
      : 0;

    // Extract authors
    const authors: string[] = [];
    const authorRegex = /<author>\s*<name>([^<]+)<\/name>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
      authors.push(authorMatch[1]);
    }

    // Extract categories
    const categories: string[] = [];
    const categoryRegex = /<category[^>]*term="([^"]+)"/g;
    let categoryMatch;
    while ((categoryMatch = categoryRegex.exec(entryXml)) !== null) {
      categories.push(categoryMatch[1]);
    }

    // Extract DOI if present
    const doiMatch = entryXml.match(
      /<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/
    );
    const doi = doiMatch ? doiMatch[1] : undefined;

    if (arxivId) {
      articles.push({
        arxivId,
        title,
        abstract,
        authors,
        publishedDate,
        publishedYear,
        pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        categories,
        doi,
      });
    }
  }

  return {
    totalResults,
    articles,
  };
}

/**
 * Get arXiv PDF URL from arXiv ID
 */
export function getArxivPdfUrl(arxivId: string): string {
  return `https://arxiv.org/pdf/${arxivId}.pdf`;
}

/**
 * Get arXiv abstract page URL
 */
export function getArxivAbsUrl(arxivId: string): string {
  return `https://arxiv.org/abs/${arxivId}`;
}
