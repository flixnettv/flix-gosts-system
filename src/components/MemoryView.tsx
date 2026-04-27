import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Search, 
  Trash2, 
  Tag, 
  Calendar, 
  ArrowLeft, 
  Plus, 
  Filter,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { memoryService, Memory } from '../services/memory';

interface MemoryViewProps {
  onBack: () => void;
  uid: string;
  t: any;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ onBack, uid, t }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMemories();
  }, [uid]);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const data = await memoryService.getMemories(uid);
      setMemories(data);
    } catch (err) {
      console.error("Failed to load memories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await memoryService.deleteMemory(id);
    setMemories(memories.filter(m => m.id !== id));
  };

  const handleClearAll = async () => {
    if (confirm(t.clearConfirm)) {
      await memoryService.clearMemories(uid);
      setMemories([]);
    }
  };

  const categories = Array.from(new Set(memories.map(m => m.category || 'general')));
  const filtered = memories.filter(m => {
    const matchesSearch = m.content.toLowerCase().includes(search.toLowerCase()) || 
                         m.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = !filter || m.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 overflow-auto bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={16} className="text-white/60" />
            </button>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">{t.memoryTitle}</h1>
              <p className="text-white/40 text-[9px] font-medium uppercase tracking-widest">{t.memoryDesc}</p>
            </div>
          </div>
          <button 
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 font-black uppercase tracking-widest text-[9px] rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Trash2 size={14} /> {t.clearMemory}
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              type="text"
              placeholder="Search memories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button 
              onClick={() => setFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!filter ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === cat ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Memories List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Accessing Neural Cache...</p>
            </div>
          ) : filtered.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filtered.map((memory) => (
                <motion.div
                  key={memory.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="group p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Brain className="text-purple-400" size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest text-purple-400">{memory.category || 'general'}</span>
                          <span className="w-1 h-1 bg-white/10 rounded-full" />
                          <span className="text-[8px] font-medium text-white/40">{new Date(memory.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-white leading-relaxed">{memory.content}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(memory.id!)}
                      className="p-1.5 bg-white/5 rounded-md text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {memory.tags && memory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {memory.tags.map((tag, tIdx) => (
                        <span key={`${memory.id}-${tag}-${tIdx}`} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md text-[8px] text-white/40 flex items-center gap-1">
                          <Tag size={8} /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto">
                <Info className="text-white/20" size={24} />
              </div>
              <p className="text-white/40 text-xs font-medium">{t.memoryEmpty}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
