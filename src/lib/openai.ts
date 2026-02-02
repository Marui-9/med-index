import OpenAI from "openai";

// Singleton OpenAI client
const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;

/**
 * Generate embeddings for text using text-embedding-3-small
 * Returns a 1536-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

/**
 * Moderate content using OpenAI's moderation API
 * Returns true if the content is safe, false if it's flagged
 */
export async function moderateContent(
  text: string
): Promise<{ safe: boolean; categories: string[] }> {
  const response = await openai.moderations.create({
    input: text,
  });

  const result = response.results[0];
  const flaggedCategories = Object.entries(result.categories)
    .filter(([_, flagged]) => flagged)
    .map(([category]) => category);

  return {
    safe: !result.flagged,
    categories: flaggedCategories,
  };
}

export default openai;
