import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const pineconeApiKey = process.env.PINECONE_API_KEY || '';
const indexName = process.env.PINECONE_INDEX_NAME || 'germanlang';

export const pinecone = pineconeApiKey ? new Pinecone({ apiKey: pineconeApiKey }) : null;

// Generate 768-dim text embedding using Google Gemini embedding-001 model
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    console.warn('Gemini embedding fallback zeros vector:', err);
    return new Array(768).fill(0);
  }
}

// Upsert memory vector to Pinecone
export async function storeMemoryInPinecone(userId: string, conversationSummary: string, messageCount: number) {
  if (!pinecone || !pineconeApiKey) {
    console.warn('Pinecone API Key not configured. Skipping Pinecone vector memory save.');
    return false;
  }

  try {
    const index = pinecone.index(indexName);
    const vector = await getEmbedding(conversationSummary);

    const record = {
      id: `mem_${userId}_${Date.now()}`,
      values: vector,
      metadata: {
        userId,
        summary: conversationSummary,
        messageCount,
        timestamp: new Date().toISOString(),
      },
    };

    await (index.upsert as any)([record]);

    console.log(`Successfully stored long-term memory in Pinecone for user ${userId}`);
    return true;
  } catch (err) {
    console.error('Pinecone store memory error:', err);
    return false;
  }
}

// Query Pinecone for relevant long-term memories with low latency
export async function queryMemoriesFromPinecone(userId: string, queryText: string): Promise<string[]> {
  if (!pinecone || !pineconeApiKey) return [];

  try {
    const index = pinecone.index(indexName);
    const vector = await getEmbedding(queryText);

    const queryResponse = await index.query({
      vector,
      topK: 3,
      includeMetadata: true,
      filter: { userId }
    });

    return queryResponse.matches
      ? queryResponse.matches.map(m => (m.metadata?.summary as string) || '').filter(Boolean)
      : [];
  } catch (err) {
    console.warn('Pinecone memory query skipped:', err);
    return [];
  }
}
