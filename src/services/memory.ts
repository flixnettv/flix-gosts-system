import { storageService } from './storage';
import type { Memory } from '../types';

export type { Memory };

export class MemoryService {
  private memories: Memory[] = [];

  async init(uid: string, onUpdate?: (memories: Memory[]) => void) {
    // Initial fetch
    const { data, error } = await storageService.query<Memory>('memories', {
      eq: ['user_id', uid],
      order: ['timestamp', { ascending: false }]
    });

    if (error) {
      const msg = (error.message || String(error)).toLowerCase();
      if (!msg.includes('authentication failed') && !msg.includes('database_url')) {
        console.error("Error fetching memories:", error);
      }
    } else {
      this.memories = data || [];
      if (onUpdate) onUpdate(this.memories);
    }

    // Subscribe to local storage changes
    storageService.subscribe('memories', (data) => {
      const userMemories = data.filter((m: any) => m.user_id === uid);
      this.memories = userMemories.sort((a: any, b: any) => b.timestamp - a.timestamp);
      if (onUpdate) onUpdate(this.memories);
    });
  }

  async addMemory(uid: string, content: string, importance: number = 3, tags: string[] = []) {
    const newMemory = {
      user_id: uid,
      content,
      timestamp: Date.now(),
      importance,
      category: tags[0] || 'general',
      tags
    };

    const { data, error } = await storageService.insert('memories', [newMemory]);

    if (error) {
      console.error("Error adding memory:", error);
      return null;
    }
    return (data ? data[0] : null) as Memory;
  }

  async getMemories(uid: string): Promise<Memory[]> {
    const { data, error } = await storageService.query<Memory>('memories', {
      eq: ['user_id', uid],
      order: ['timestamp', { ascending: false }]
    });
    if (error) {
      const msg = (error.message || String(error)).toLowerCase();
      if (!msg.includes('authentication failed') && !msg.includes('database_url')) {
        console.error("Error fetching memories:", error);
      }
      return [];
    }
    return data || [];
  }

  async deleteMemory(id: string) {
    const { error } = await storageService.delete('memories', {
      eq: ['id', id]
    });

    if (error) {
      console.error("Error deleting memory:", error);
    }
  }

  async clearMemories(uid: string) {
    const { error } = await storageService.delete('memories', {
      eq: ['user_id', uid]
    });

    if (error) {
      console.error("Error clearing memories:", error);
      return { error };
    }
    
    return { error: null };
  }

  // Search for relevant memories using basic keyword matching
  async getRelevantContext(queryText: string, limit: number = 10): Promise<string> {
    if (this.memories.length === 0) return "";

    const queryTerms = queryText.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    
    const scored = this.memories.map(m => {
      let score = m.importance * 2;
      const contentLower = m.content.toLowerCase();
      
      // Boost score if query terms match
      queryTerms.forEach(term => {
        if (contentLower.includes(term)) score += 5;
      });

      // Boost user profile related memories
      if (m.category === 'user_profile') score += 10;
      if (m.category === 'work') score += 5;

      return { ...m, score };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);
    const context = sorted.slice(0, limit).map(m => `- ${m.content}`).join('\n');
    return context ? `\n\n[LONG-TERM MEMORY CONTEXT]\n${context}` : "";
  }
}

export const memoryService = new MemoryService();
