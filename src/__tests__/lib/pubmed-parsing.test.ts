/**
 * Tests for PubMed XML parsing (src/lib/pubmed.ts)
 *
 * Validates that parsePubMedXml correctly extracts structured data from
 * PubMed efetch XML responses, including edge cases like structured
 * abstracts, missing fields, and single-article responses.
 */
import { describe, it, expect } from "vitest";
import { parsePubMedXml } from "@/lib/pubmed";

// ── Fixtures ────────────────────────────────────────────────────────────

/** Realistic PubMed efetch XML with two articles */
const TWO_ARTICLE_XML = `<?xml version="1.0" ?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle, 1st January 2025//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd">
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation Status="MEDLINE" Owner="NLM">
      <PMID Version="1">33456789</PMID>
      <Article PubModel="Print">
        <Journal>
          <Title>Journal of Sports Science</Title>
          <JournalIssue>
            <PubDate>
              <Year>2023</Year>
            </PubDate>
          </JournalIssue>
        </Journal>
        <ArticleTitle>Effects of creatine supplementation on lean body mass: a systematic review</ArticleTitle>
        <Abstract>
          <AbstractText Label="BACKGROUND">Creatine is one of the most popular sports supplements.</AbstractText>
          <AbstractText Label="METHODS">We searched PubMed and Cochrane for RCTs published between 2000 and 2023.</AbstractText>
          <AbstractText Label="RESULTS">Twelve studies met inclusion criteria. Mean lean mass gain was 1.4 kg.</AbstractText>
          <AbstractText Label="CONCLUSIONS">Creatine supplementation produces small but significant increases in lean body mass.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author>
            <LastName>Smith</LastName>
            <ForeName>John A</ForeName>
          </Author>
          <Author>
            <LastName>Doe</LastName>
            <ForeName>Jane B</ForeName>
          </Author>
        </AuthorList>
      </Article>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">33456789</ArticleId>
        <ArticleId IdType="doi">10.1234/jss.2023.001</ArticleId>
        <ArticleId IdType="pmc">PMC9876543</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
  <PubmedArticle>
    <MedlineCitation Status="MEDLINE" Owner="NLM">
      <PMID Version="1">22345678</PMID>
      <Article PubModel="Electronic">
        <Journal>
          <Title>Nutrients</Title>
          <JournalIssue>
            <PubDate>
              <Year>2021</Year>
            </PubDate>
          </JournalIssue>
        </Journal>
        <ArticleTitle>Protein timing and muscle hypertrophy: a meta-analysis</ArticleTitle>
        <Abstract>
          <AbstractText>This meta-analysis examined whether protein timing around resistance exercise affects hypertrophy. Results suggest timing has a minor effect compared to total daily protein intake.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author>
            <LastName>Garcia</LastName>
            <ForeName>Maria</ForeName>
          </Author>
        </AuthorList>
      </Article>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">22345678</ArticleId>
        <ArticleId IdType="doi">10.5678/nut.2021.100</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;

/** Single article (not wrapped in an array by default) */
const SINGLE_ARTICLE_XML = `<?xml version="1.0" ?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation Status="MEDLINE" Owner="NLM">
      <PMID Version="1">11111111</PMID>
      <Article PubModel="Print">
        <Journal>
          <Title>Med Sci Sports Exerc</Title>
          <JournalIssue>
            <PubDate>
              <Year>2020</Year>
            </PubDate>
          </JournalIssue>
        </Journal>
        <ArticleTitle>Cold water immersion and recovery</ArticleTitle>
        <Abstract>
          <AbstractText>Cold water immersion did not improve recovery markers.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author>
            <LastName>Lee</LastName>
            <ForeName>Wei</ForeName>
          </Author>
        </AuthorList>
      </Article>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">11111111</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;

/** Article with MedlineDate instead of Year, and no abstract */
const MEDLINE_DATE_XML = `<?xml version="1.0" ?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation Status="MEDLINE" Owner="NLM">
      <PMID Version="1">99999999</PMID>
      <Article PubModel="Print">
        <Journal>
          <Title>Some Journal</Title>
          <JournalIssue>
            <PubDate>
              <MedlineDate>2019 Jan-Feb</MedlineDate>
            </PubDate>
          </JournalIssue>
        </Journal>
        <ArticleTitle>Vitamin D and bone density</ArticleTitle>
        <AuthorList>
          <Author>
            <CollectiveName>Vitamin D Research Group</CollectiveName>
          </Author>
        </AuthorList>
      </Article>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">99999999</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;

/** Empty response (no articles) */
const EMPTY_XML = `<?xml version="1.0" ?>
<PubmedArticleSet></PubmedArticleSet>`;

// ── Tests ───────────────────────────────────────────────────────────────

describe("parsePubMedXml", () => {
  it("parses multiple articles", () => {
    const articles = parsePubMedXml(TWO_ARTICLE_XML);
    expect(articles).toHaveLength(2);
  });

  it("extracts PMID", () => {
    const [first] = parsePubMedXml(TWO_ARTICLE_XML);
    expect(first.pmid).toBe("33456789");
  });

  it("extracts title", () => {
    const [first] = parsePubMedXml(TWO_ARTICLE_XML);
    expect(first.title).toBe(
      "Effects of creatine supplementation on lean body mass: a systematic review"
    );
  });

  it("extracts DOI", () => {
    const [first] = parsePubMedXml(TWO_ARTICLE_XML);
    expect(first.doi).toBe("10.1234/jss.2023.001");
  });

  it("extracts PMC ID and generates fullTextUrl", () => {
    const [first] = parsePubMedXml(TWO_ARTICLE_XML);
    expect(first.pmcid).toBe("PMC9876543");
    expect(first.fullTextUrl).toContain("PMC9876543");
  });

  it("extracts authors", () => {
    const [first] = parsePubMedXml(TWO_ARTICLE_XML);
    expect(first.authors).toEqual(["Smith John A", "Doe Jane B"]);
  });

  it("extracts journal and year", () => {
    const [first] = parsePubMedXml(TWO_ARTICLE_XML);
    expect(first.journal).toBe("Journal of Sports Science");
    expect(first.publishedYear).toBe(2023);
  });

  it("concatenates structured abstract sections with labels", () => {
    const [first] = parsePubMedXml(TWO_ARTICLE_XML);
    expect(first.abstract).toContain("BACKGROUND:");
    expect(first.abstract).toContain("RESULTS:");
    expect(first.abstract).toContain("1.4 kg");
  });

  it("handles plain (unstructured) abstract", () => {
    const [, second] = parsePubMedXml(TWO_ARTICLE_XML);
    expect(second.abstract).toContain("protein timing");
    // Should NOT have label prefixes
    expect(second.abstract).not.toContain("BACKGROUND:");
  });

  it("handles single article response", () => {
    const articles = parsePubMedXml(SINGLE_ARTICLE_XML);
    expect(articles).toHaveLength(1);
    expect(articles[0].pmid).toBe("11111111");
    expect(articles[0].title).toBe("Cold water immersion and recovery");
  });

  it("returns no PMC ID or fullTextUrl when absent", () => {
    const [article] = parsePubMedXml(SINGLE_ARTICLE_XML);
    expect(article.pmcid).toBeUndefined();
    expect(article.fullTextUrl).toBeUndefined();
  });

  it("parses MedlineDate year fallback", () => {
    const [article] = parsePubMedXml(MEDLINE_DATE_XML);
    expect(article.publishedYear).toBe(2019);
  });

  it("handles missing abstract gracefully", () => {
    const [article] = parsePubMedXml(MEDLINE_DATE_XML);
    expect(article.abstract).toBeUndefined();
  });

  it("handles CollectiveName author", () => {
    const [article] = parsePubMedXml(MEDLINE_DATE_XML);
    expect(article.authors).toEqual(["Vitamin D Research Group"]);
  });

  it("returns empty array for empty response", () => {
    const articles = parsePubMedXml(EMPTY_XML);
    expect(articles).toHaveLength(0);
  });

  it("second article has correct fields", () => {
    const [, second] = parsePubMedXml(TWO_ARTICLE_XML);
    expect(second.pmid).toBe("22345678");
    expect(second.doi).toBe("10.5678/nut.2021.100");
    expect(second.journal).toBe("Nutrients");
    expect(second.publishedYear).toBe(2021);
    expect(second.authors).toEqual(["Garcia Maria"]);
    expect(second.pmcid).toBeUndefined();
  });
});
