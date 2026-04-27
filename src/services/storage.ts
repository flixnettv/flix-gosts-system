import { get, set } from 'idb-keyval';

export class StorageService {
  private useLocalOnly = false;
  private hasInitialized = false;
  private listeners: Record<string, ((data: any) => void)[]> = {};

  subscribe(table: string, callback: (data: any) => void) {
    if (!this.listeners[table]) this.listeners[table] = [];
    this.listeners[table].push(callback);
    return () => {
      this.listeners[table] = this.listeners[table].filter(l => l !== callback);
    };
  }

  private notify(table: string, data: any) {
    if (this.listeners[table]) {
      this.listeners[table].forEach(l => l(data));
    }
  }

  async setLocalOnly(value: boolean) {
    this.useLocalOnly = value;
    this.hasInitialized = true;
    await set('useLocalOnly', value);
  }

  async isLocalOnly(): Promise<boolean> {
    if (this.hasInitialized) return this.useLocalOnly;
    const saved = await get('useLocalOnly');
    this.useLocalOnly = saved || false;
    this.hasInitialized = true;
    return this.useLocalOnly;
  }

  async query<T>(table: string, options: { 
    select?: string; 
    eq?: [string, any]; 
    order?: [string, { ascending: boolean }];
    limit?: number;
  }): Promise<{ data: T[] | null; error: any }> {
    let localOnly = await this.isLocalOnly();
    
    if (!localOnly) {
      try {
        const queryParams = new URLSearchParams();
        if (options.select) queryParams.append('select', options.select);
        if (options.eq) queryParams.append('eq', options.eq.join(','));
        if (options.order) queryParams.append('order', `${options.order[0]},${options.order[1].ascending}`);
        if (options.limit) queryParams.append('limit', options.limit.toString());
        
        const response = await fetch(`/api/query/${table}?${queryParams.toString()}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as { error?: string };
          const errorMsg = errorData.error || '';
          if (errorMsg.toLowerCase().includes('authentication failed') || errorMsg.toLowerCase().includes('database_url')) {
            // Silently switch to local mode for this session and future ones
            if (!this.useLocalOnly) {
              await this.setLocalOnly(true);
              this.notify('storage_mode', { localOnly: true });
            }
            localOnly = true;
            return this.queryLocal<T>(table, options);
          }
          throw new Error(errorMsg || 'Failed to query');
        }
        return { data: await response.json(), error: null };
      } catch (err: any) {
        const msg = (err.message || String(err)).toLowerCase();
        const isAuthError = msg.includes('authentication failed') || msg.includes('database_url') || msg.includes('password authentication');
        const isNetworkError = msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed');
        
        if (!isAuthError && !isNetworkError) {
          console.error(`Neon query error on ${table}:`, err);
        }
        
        // If it's a network error or auth error, we silently fall back to local
        localOnly = true;
      }
    }

    return this.queryLocal<T>(table, options);
  }

  private async queryLocal<T>(table: string, options: any): Promise<{ data: T[] | null; error: any }> {
    // Local Storage Fallback
    try {
      const localData = (await get(`table_${table}`) || []) as any[];
      let filtered = [...localData];
      
      // Deduplicate by ID if exists
      const unique = new Map();
      filtered.forEach(item => {
        const key = item.id || JSON.stringify(item);
        if (!unique.has(key)) unique.set(key, item);
      });
      filtered = Array.from(unique.values());

      if (options.eq) {
        filtered = filtered.filter((item: any) => item[options.eq![0]] === options.eq![1]);
      }
      if (options.order) {
        filtered.sort((a: any, b: any) => {
          const valA = a[options.order![0]];
          const valB = b[options.order![0]];
          if (valA === valB) return 0;
          return options.order![1].ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });
      }
      if (options.limit) {
        filtered = filtered.slice(0, options.limit);
      }
      return { data: filtered as T[], error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async insert(table: string, data: any[]): Promise<{ data: any[] | null; error: any }> {
    const localOnly = await this.isLocalOnly();
    let resData: any[] | null = null;
    let lastError: any = null;

    if (!localOnly) {
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`/api/insert/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as { error?: string };
            const errorMsg = errorData.error || '';
            if (errorMsg.toLowerCase().includes('authentication failed') || errorMsg.toLowerCase().includes('database_url')) {
              await this.setLocalOnly(true);
              this.notify('storage_mode', { localOnly: true });
            }
            throw new Error(errorMsg || `Server error: ${response.status}`);
          }
          
          resData = await response.json();
          break; // Success
        } catch (err: any) {
          lastError = err;
          const msg = (err.message || String(err)).toLowerCase();
          const isAuthError = msg.includes('authentication failed') || msg.includes('database_url') || msg.includes('password authentication');
          
          if (isAuthError) break; // Don't retry auth errors
          
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000)); // Wait before retry
          }
        }
      }
      
      if (!resData && lastError) {
        const msg = (lastError.message || String(lastError)).toLowerCase();
        const isAuthError = msg.includes('authentication failed') || msg.includes('database_url') || msg.includes('password authentication');
        if (!isAuthError) {
          console.error(`Neon insert error on ${table} after ${attempts} attempts:`, lastError);
        }
      }
    }

    // Always update local storage as a cache and for immediate notification
    try {
      const localData = (await get(`table_${table}`) || []) as any[];
      const itemsToStore = resData || data.map(item => ({ 
        id: item.id || crypto.randomUUID(), 
        created_at: item.created_at || new Date().toISOString(),
        ...item 
      }));
      
      // Deduplicate before pushing to local storage
      itemsToStore.forEach(newItem => {
        const index = localData.findIndex((item: any) => (item.id && newItem.id && item.id === newItem.id) || (item.title && newItem.title && item.title === newItem.title));
        if (index >= 0) {
          localData[index] = { ...localData[index], ...newItem };
        } else {
          localData.push(newItem);
        }
      });

      await set(`table_${table}`, localData);
      this.notify(table, localData);
      
      return { data: itemsToStore, error: null };
    } catch (err) {
      return { data: resData, error: err };
    }
  }

  async upsert(table: string, data: any, options: { on: string }): Promise<{ error: any }> {
    const localOnly = await this.isLocalOnly();
    let lastError: any = null;

    if (!localOnly) {
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`/api/upsert/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, options })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as { error?: string };
            const errorMsg = errorData.error || '';
            if (errorMsg.toLowerCase().includes('authentication failed') || errorMsg.toLowerCase().includes('database_url')) {
              await this.setLocalOnly(true);
              this.notify('storage_mode', { localOnly: true });
            }
            throw new Error(errorMsg || `Server error: ${response.status}`);
          }
          
          lastError = null;
          break; // Success
        } catch (err: any) {
          lastError = err;
          const msg = (err.message || String(err)).toLowerCase();
          const isAuthError = msg.includes('authentication failed') || msg.includes('database_url') || msg.includes('password authentication');
          
          if (isAuthError) break; // Don't retry auth errors
          
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000)); // Wait before retry
          }
        }
      }
      
      if (lastError) {
        const msg = (lastError.message || String(lastError)).toLowerCase();
        const isAuthError = msg.includes('authentication failed') || msg.includes('database_url') || msg.includes('password authentication');
        if (!isAuthError) {
          console.error(`Neon upsert error on ${table} after ${attempts} attempts:`, lastError);
        }
      }
    }

    // Update local storage
    try {
      const localData = await get(`table_${table}`) || [];
      const index = localData.findIndex((item: any) => item[options.on] === data[options.on]);
      if (index >= 0) {
        localData[index] = { ...localData[index], ...data };
      } else {
        localData.push(data);
      }
      await set(`table_${table}`, localData);
      this.notify(table, localData);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }

  async delete(table: string, options: { eq: [string, any] }): Promise<{ error: any }> {
    const localOnly = await this.isLocalOnly();
    
    if (!localOnly) {
      try {
        const response = await fetch(`/api/delete/${table}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options)
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as { error?: string };
          const errorMsg = errorData.error || '';
          if (errorMsg.toLowerCase().includes('authentication failed') || errorMsg.toLowerCase().includes('database_url')) {
            await this.setLocalOnly(true);
            this.notify('storage_mode', { localOnly: true });
          }
          throw new Error(errorMsg || 'Failed to delete');
        }
      } catch (err: any) {
        const msg = (err.message || String(err)).toLowerCase();
        const isAuthError = msg.includes('authentication failed') || msg.includes('database_url') || msg.includes('password authentication');
        if (!isAuthError) {
          console.error(`Neon delete error on ${table}:`, err);
        }
      }
    }

    // Always update local storage
    try {
      const localData = await get(`table_${table}`) || [];
      const filtered = localData.filter((item: any) => item[options.eq[0]] !== options.eq[1]);
      const changed = localData.length !== filtered.length;
      if (changed) {
        await set(`table_${table}`, filtered);
        this.notify(table, filtered);
      }
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }

  async syncToCloud(): Promise<{ success: boolean; error: any }> {
    const localOnly = await get('useLocalOnly');
    if (localOnly) return { success: false, error: 'Still in local-only mode' };

    try {
      const tables = ['conversations', 'messages', 'memories', 'agents', 'tasks', 'templates'];
      for (const table of tables) {
        const localData = (await get(`table_${table}`) || []) as any[];
        if (localData.length > 0) {
          // Push to cloud using upsert logic or bulk insert
          // For simplicity, we'll try to insert/upsert each item
          for (const item of localData) {
            await this.upsert(table, item, { on: 'id' });
          }
        }
      }
      return { success: true, error: null };
    } catch (err) {
      console.error('Sync to cloud failed:', err);
      return { success: false, error: err };
    }
  }
}

export const storageService = new StorageService();
