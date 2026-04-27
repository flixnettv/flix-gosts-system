import { db } from '../../db';
import { GoogleGenAI } from '@google/genai';

export interface MemoryItem {
  id?: string;
  userId: string;
  content: string;
  category?: string;
  tags?: string[];
  embedding?: number[];
  metadata?: any;
}

export class MemoryEngine {
  private genAI: GoogleGenAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const client = new GoogleGenAI({ apiKey: (this.genAI as any).apiKey });
      const result = await (client as any).models.embedContent({
        model: "text-embedding-004",
        content: { parts: [{ text }] }
      });
      return result.embedding.values;
    } catch (err) {
      console.error("[MemoryEngine] Embedding generation failed:", err);
      return [];
    }
  }

  async addMemory(userId: string, content: string, category = 'general', tags: string[] = []): Promise<MemoryItem> {
    const embedding = await this.generateEmbedding(content);
    
    try {
      const [memory] = await db`
        INSERT INTO memories (user_id, content, category, tags, embedding)
        VALUES (${userId}, ${content}, ${category}, ${tags}, ${embedding})
        RETURNING *
      `;
      return memory as MemoryItem;
    } catch (err) {
      console.error("[MemoryEngine] Failed to add memory:", err);
      throw err;
    }
  }

  async searchMemories(userId: string, query: string, limit = 5): Promise<MemoryItem[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    if (queryEmbedding.length === 0) return [];

    try {
      // Using cosine similarity (1 - distance)
      // Note: We use float8[] and manual calculation if pgvector is not available
      // But we'll try to use the most efficient way available in Postgres
      const memories = await db`
        SELECT *, 
        (1 - (embedding <=> ${queryEmbedding})) as similarity
        FROM memories 
        WHERE user_id = ${userId}
        ORDER BY embedding <=> ${queryEmbedding}
        LIMIT ${limit}
      `;
      return memories as any[];
    } catch (err) {
      // Fallback if <=> operator (pgvector) is not available
      console.warn("[MemoryEngine] pgvector not available, falling back to basic search");
      const memories = await db`
        SELECT * FROM memories 
        WHERE user_id = ${userId} AND content ILIKE ${'%' + query + '%'}
        LIMIT ${limit}
      `;
      return memories as any[];
    }
  }

  async clearMemories(userId: string) {
    await db`DELETE FROM memories WHERE user_id = ${userId}`;
  }
}
