import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Copy, 
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storageService } from '../services/storage';

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 't-1',
    name: 'Code Reviewer',
    description: 'A persona focused on reviewing code for bugs and performance.',
    content: 'You are an expert software engineer. Review the following code for bugs, security vulnerabilities, and performance bottlenecks. Provide clear, actionable feedback.',
    category: 'Development'
  },
  {
    id: 't-2',
    name: 'Creative Writer',
    description: 'Helps with brainstorming and writing fiction.',
    content: 'You are a world-class novelist. Help me brainstorm plot points, develop characters, and write engaging scenes. Your style is descriptive and evocative.',
    category: 'Writing'
  },
  {
    id: 't-3',
    name: 'Data Analyst',
    description: 'Expert in interpreting data and generating reports.',
    content: 'You are a senior data analyst. Help me interpret this data, find trends, and generate a concise report with key insights and recommendations.',
    category: 'Business'
  }
];

interface TemplatesViewProps {
  onBack: () => void;
  onUseTemplate: (content: string) => void;
  t: any;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onBack, onUseTemplate, t }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<Template>>({ name: '', description: '', content: '', category: 'General' });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data } = await storageService.query<Template>('templates', {});
    if (data && data.length > 0) {
      setTemplates(data);
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      // Optionally save defaults to DB
      for (const t of DEFAULT_TEMPLATES) {
        await storageService.upsert('templates', t, { on: 'id' });
      }
    }
  };

  const handleAdd = async () => {
    if (!newTemplate.name || !newTemplate.content) return;
    const template: Template = {
      id: crypto.randomUUID(),
      name: newTemplate.name,
      description: newTemplate.description || '',
      content: newTemplate.content,
      category: newTemplate.category || 'General'
    };
    await storageService.insert('templates', [template]);
    setTemplates([...templates, template]);
    setIsAdding(false);
    setNewTemplate({ name: '', description: '', content: '', category: 'General' });
  };

  const handleDelete = async (id: string) => {
    await storageService.delete('templates', { eq: ['id', id] });
    setTemplates(templates.filter(t => t.id !== id));
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto bg-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} className="text-white/60" />
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Templates</h1>
              <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Pre-defined system instructions</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-emerald-500 text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> New Template
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
          <input 
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((template) => (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-4 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{template.category}</span>
                    <h3 className="text-lg font-bold text-white">{template.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleCopy(template.content, template.id)}
                      className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                    >
                      {copiedId === template.id ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                    <button 
                      onClick={() => handleDelete(template.id)}
                      className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-white/40 line-clamp-2 leading-relaxed">{template.description}</p>
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => onUseTemplate(template.content)}
                    className="flex-1 py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                  >
                    Use Template
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add Modal */}
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6"
            >
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">New Template</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Name</label>
                  <input 
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Category</label>
                  <input 
                    type="text"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Description</label>
                  <input 
                    type="text"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">System Instruction</label>
                  <textarea 
                    rows={4}
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 bg-white/5 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-1 py-4 bg-emerald-500 text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-emerald-400 transition-all"
                >
                  Save Template
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
