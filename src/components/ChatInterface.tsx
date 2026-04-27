import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Bot, 
  User as UserIcon, 
  Volume2, 
  Loader2, 
  Share2, 
  ArrowDown, 
  Plus, 
  ChevronRight,
  PanelLeft,
  ArrowLeft,
  MessageSquare,
  X,
  History,
  Settings,
  Brain,
  ListTodo,
  Terminal,
  GitBranch,
  CheckCircle2,
  Skull,
  Copy,
  Check,
  MoreVertical,
  Wifi,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Message, Persona, aiService, PERSONAS } from '../services/ai';
import { Conversation, Task, Memory, User } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSendMessage: (content: string) => void;
  onClear: () => void;
  onBack: () => void;
  isLoading: boolean;
  activePersona: Persona;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
  memories: Memory[];
  onDeleteMemory: (id: string) => void;
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  t: any;
  lang: 'en' | 'ar';
  isRtl: boolean;
  onSpeak: (text: string, id: string) => void;
  speakingId: string | null;
  onShare: (title: string, text: string) => void;
  onEditMessage: (id: string, newContent: string) => void;
  onDeleteMessage: (id: string) => void;
  onRegenerate: (id: string) => void;
  suggestions: string[];
  user: User | null;
  isCompact?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onSendMessage, 
  onClear, 
  onBack,
  isLoading, 
  activePersona, 
  personas,
  onSelectPersona,
  memories,
  onDeleteMemory,
  tasks,
  onUpdateTask,
  t, 
  lang,
  isRtl,
  onSpeak,
  speakingId,
  onShare,
  onEditMessage,
  onDeleteMessage,
  onRegenerate,
  suggestions,
  user,
  isCompact = false
}) => {
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState<'agents' | 'memory' | 'tasks' | null>(null);
  const [showGitModal, setShowGitModal] = useState(false);
  const [gitUrl, setGitUrl] = useState('');
  const [gitMessage, setGitMessage] = useState('Export from Ghost & Goblin Platform');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedMessages, setCollapsedMessages] = useState<Record<string, boolean>>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-collapse long messages on mount or when messages change
  useEffect(() => {
    const newCollapses: Record<string, boolean> = { ...collapsedMessages };
    let changed = false;
    messages.forEach(msg => {
      if (msg.content.length > 400 && collapsedMessages[msg.id] === undefined) {
        newCollapses[msg.id] = true;
        changed = true;
      }
    });
    if (changed) setCollapsedMessages(newCollapses);
  }, [messages]);

  const toggleCollapse = (id: string) => {
    setCollapsedMessages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isLongMessage = (content: string) => content.length > 800;

  const isAdmin = user?.role === 'admin';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleGitExport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUrl.trim()) return;
    onSendMessage(`Export the current workspace to Git repository: ${gitUrl} with message: ${gitMessage}`);
    setShowGitModal(false);
    setGitUrl('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
    // Reset textarea height
    const textarea = document.querySelector('textarea[name="chat-input"]') as HTMLTextAreaElement;
    if (textarea) textarea.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
    setInput(target.value);
  };

  const handleEditSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editInput.trim() || isLoading) return;
    onEditMessage(id, editInput);
    setEditingId(null);
    setEditInput('');
  };

  const handleTestConnection = async (personaId: string) => {
    setTestingConnection(personaId);
    try {
      const result = await aiService.testConnection(personaId, undefined, personas);
      if (result.success) {
        setConnectionStatus(prev => ({ ...prev, [personaId]: 'success' }));
      } else {
        setConnectionStatus(prev => ({ ...prev, [personaId]: 'error' }));
        console.error(`Connection test failed for ${personaId}:`, result.message);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [personaId]: 'error' }));
    } finally {
      setTestingConnection(null);
    }
  };

  return (
    <div className="flex-1 flex bg-[#050505] h-full overflow-hidden relative font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSidebar(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: showSidebar ? 280 : 0,
          x: showSidebar ? 0 : (isRtl ? 280 : -280)
        }}
        className={`absolute lg:relative z-50 h-full bg-black border-r border-white/10 flex flex-col overflow-hidden transition-all duration-300 ${isRtl ? 'right-0' : 'left-0'}`}
      >
        <div className="w-[280px] h-full flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
              <History size={12} /> History
            </h3>
            <button 
              onClick={onNewConversation}
              className="w-7 h-7 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Plus size={14} className="text-white" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {conversations.map((conv) => (
              <div 
                key={conv.id}
                className={`group flex items-center gap-2.5 p-2.5 rounded-xl transition-all cursor-pointer ${activeConversationId === conv.id ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5 border border-transparent'}`}
                onClick={() => {
                  onSelectConversation(conv.id);
                  if (window.innerWidth < 1024) setShowSidebar(false);
                }}
              >
                <MessageSquare size={14} className={activeConversationId === conv.id ? 'text-emerald-400' : 'text-white/20'} />
                <div className="flex-1 overflow-hidden">
                  <p className={`text-[11px] font-bold truncate ${activeConversationId === conv.id ? 'text-white' : 'text-white/40'}`}>
                    {conv.title}
                  </p>
                  <p className="text-[7px] font-medium uppercase tracking-widest text-white/20">
                    {isNaN(new Date(conv.updated_at).getTime()) ? "00/00/0000" : new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <MessageSquare size={24} className="text-white/10" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No history found</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#080808] relative">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl z-20 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 group"
            >
              <ArrowLeft size={14} className="text-white/40 group-hover:text-white transition-colors" />
            </button>
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className={`w-8 h-8 border rounded-lg flex items-center justify-center transition-all active:scale-95 ${showSidebar ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
            >
              <PanelLeft size={14} />
            </button>
            
            <div className="h-6 w-px bg-white/10 mx-1" />
            
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center relative overflow-hidden ${activePersona.type === 'ghost' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {activePersona.type === 'ghost' ? <Skull size={18} /> : <Bot size={18} />}
                <motion.div 
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-white/5"
                />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-white leading-none">{activePersona.name}</h2>
                  <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">v2.6.4</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-1 h-1 rounded-full ${activePersona.type === 'ghost' ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`} />
                  <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/40">
                    {activePersona.type === 'ghost' ? 'Ghost Protocol' : 'Goblin Core'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[7px] font-mono uppercase tracking-[0.4em] text-white/10">System Uptime</span>
              <span className="text-[9px] font-mono text-emerald-500/40">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            </div>
            
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 gap-0.5">
              {isAdmin && (
                <button 
                  onClick={() => setShowControlPanel(showControlPanel === 'agents' ? null : 'agents')}
                  className={`p-1.5 rounded-md transition-all ${showControlPanel === 'agents' ? 'bg-blue-500/20 text-blue-400' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                >
                  <Bot size={14} />
                </button>
              )}
              <button 
                onClick={() => setShowControlPanel(showControlPanel === 'memory' ? null : 'memory')}
                className={`p-1.5 rounded-md transition-all ${showControlPanel === 'memory' ? 'bg-purple-500/20 text-purple-400' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
              >
                <Brain size={14} />
              </button>
              <button 
                onClick={() => setShowControlPanel(showControlPanel === 'tasks' ? null : 'tasks')}
                className={`p-1.5 rounded-md transition-all ${showControlPanel === 'tasks' ? 'bg-amber-500/20 text-amber-400' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
              >
                <ListTodo size={14} />
              </button>
            </div>
            
            <div className="w-px h-4 bg-white/10 mx-1" />
            
            <div className="flex items-center gap-0.5">
              {activePersona.id === 'code-agent' && (
                <button 
                  onClick={() => setShowGitModal(true)}
                  className="p-1.5 text-white/20 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-all"
                >
                  <GitBranch size={14} />
                </button>
              )}
              <button 
                onClick={onClear}
                className="p-1.5 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Control Panels */}
        <AnimatePresence>
          {showControlPanel && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900/50 backdrop-blur-xl border-b border-white/10 overflow-hidden"
            >
              <div className="p-4 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {showControlPanel === 'agents' && <Bot className="text-blue-400" size={16} />}
                    {showControlPanel === 'memory' && <Brain className="text-purple-400" size={16} />}
                    {showControlPanel === 'tasks' && <ListTodo className="text-amber-400" size={16} />}
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white">
                      {showControlPanel === 'agents' && 'Intelligence Cores'}
                      {showControlPanel === 'memory' && 'Neural Memory'}
                      {showControlPanel === 'tasks' && 'Active Directives'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowControlPanel(null)}
                    className="p-1 text-white/20 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {showControlPanel === 'agents' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {personas.map((p, idx) => (
                      <button 
                        key={p.id || `persona-${idx}`}
                        onClick={() => { onSelectPersona(p.id); setShowControlPanel(null); }}
                        className={`p-3 rounded-xl border transition-all text-left group relative overflow-hidden ${activePersona.id === p.id ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'}`}
                      >
                        <div className="flex items-center gap-2.5 relative z-10">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activePersona.id === p.id ? 'bg-white/20' : 'bg-white/5 ' + (p.type === 'ghost' ? 'text-orange-400' : 'text-blue-400')}`}>
                            {p.type === 'ghost' ? <Skull size={14} /> : (p.id === 'code-agent' ? <Terminal size={14} /> : <Bot size={14} />)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <p className="text-[9px] font-black uppercase tracking-tight truncate">{p.name}</p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleTestConnection(p.id); }}
                                className={`p-1 rounded-md transition-all ${connectionStatus[p.id] === 'success' ? 'text-emerald-400' : connectionStatus[p.id] === 'error' ? 'text-red-400' : 'text-white/10 hover:text-white'}`}
                              >
                                {testingConnection === p.id ? <RefreshCw size={8} className="animate-spin" /> : (connectionStatus[p.id] === 'success' ? <CheckCircle2 size={8} /> : (connectionStatus[p.id] === 'error' ? <AlertTriangle size={8} /> : <Wifi size={8} />))}
                              </button>
                            </div>
                            <p className={`text-[7px] font-medium uppercase tracking-widest truncate ${activePersona.id === p.id ? 'text-white/60' : 'text-white/20'}`}>{p.capabilities[0]}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showControlPanel === 'memory' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {memories.length === 0 ? (
                      <p className="text-[9px] text-white/20 uppercase tracking-widest text-center py-4 col-span-full">No neural traces found</p>
                    ) : (
                      memories.map((m, idx) => (
                        <div key={m.id || `memory-${idx}`} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start justify-between group">
                          <div className="space-y-1 min-w-0">
                            <p className="text-[11px] text-white/80 leading-snug truncate">{m.content}</p>
                            <div className="flex gap-1.5">
                              {m.tags.slice(0, 2).map((tag, tIdx) => (
                                <span key={`${m.id}-${tag}-${tIdx}`} className="text-[7px] font-black uppercase tracking-widest text-purple-400/60">#{tag}</span>
                              ))}
                            </div>
                          </div>
                          <button 
                            onClick={() => onDeleteMemory(m.id)}
                            className="p-1 text-white/0 group-hover:text-white/20 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {showControlPanel === 'tasks' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {tasks.length === 0 ? (
                      <p className="text-[9px] text-white/20 uppercase tracking-widest text-center py-4 col-span-full">No active directives</p>
                    ) : (
                      tasks.map((t, idx) => (
                        <div key={t.id || `task-${idx}`} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button 
                              onClick={() => onUpdateTask(t.id, { status: t.status === 'completed' ? 'ongoing' : 'completed' })}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${t.status === 'completed' ? 'bg-amber-500 border-amber-400 text-black' : 'border-white/20 hover:border-amber-500/50'}`}
                            >
                              {t.status === 'completed' && <CheckCircle2 size={10} />}
                            </button>
                            <span className={`text-[11px] font-medium truncate ${t.status === 'completed' ? 'text-white/20 line-through' : 'text-white/80'}`}>{t.title}</span>
                          </div>
                          <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0 ${t.priority === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/40'}`}>
                            {t.priority}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-10 scroll-smooth no-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-12 max-w-2xl mx-auto px-4">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 bg-white/5 border border-dashed border-white/20 rounded-full flex items-center justify-center relative group"
                >
                  <Sparkles className="text-emerald-400/40 group-hover:text-emerald-400 transition-colors" size={32} />
                  <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full -z-10" />
                </motion.div>
                <div className="space-y-4">
                  <motion.h1 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-3xl font-black uppercase tracking-[0.2em] text-white leading-tight"
                  >
                    {t.welcome}
                  </motion.h1>
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-[10px] text-white/20 uppercase tracking-[0.5em] max-w-md mx-auto font-mono"
                  >
                    {t.welcomeDesc}
                  </motion.p>
                </div>
                <motion.div 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg"
                >
                  {t.suggestions.map((s: string, i: number) => (
                    <button 
                      key={`welcome-sug-${i}`}
                      onClick={() => onSendMessage(s)}
                      className="p-4 bg-white/5 border border-white/10 rounded-xl text-left text-[9px] font-mono uppercase tracking-widest text-white/40 hover:bg-white/10 hover:border-emerald-500/20 hover:text-white transition-all group flex items-center justify-between"
                    >
                      <span className="truncate mr-2">{s}</span>
                      <ChevronRight size={12} className="text-white/10 group-hover:text-emerald-400 transition-colors shrink-0" />
                    </button>
                  ))}
                </motion.div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full space-y-12 pb-12">
                <AnimatePresence initial={false} mode="popLayout">
                  {messages.map((msg, idx) => (
                      <motion.div
                        key={msg.id || `msg-${idx}-${msg.timestamp}`}
                        layout
                        initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, y: 10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                        transition={{ 
                          type: 'spring', 
                          damping: 30, 
                          stiffness: 200,
                          layout: { duration: 0.3 }
                        }}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group/msg relative mb-8`}
                      >
                        {/* Message Header/Metadata */}
                        <div className={`flex items-center gap-2 mb-2 px-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${msg.role === 'user' ? 'bg-white text-black' : 'bg-white/5 border border-white/10 text-emerald-400'}`}>
                            {msg.role === 'user' ? <UserIcon size={12} /> : (activePersona.type === 'ghost' ? <Skull size={12} /> : <Bot size={12} />)}
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                            {msg.role === 'user' ? 'Authorized User' : (PERSONAS.find(p => p.id === msg.persona)?.name || activePersona.name)}
                          </span>
                          <span className="text-[7px] font-mono text-white/10">
                            [{isNaN(new Date(msg.timestamp).getTime()) ? "00:00:00" : new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                          </span>
                        </div>

                        <div className={`relative max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'} border rounded-2xl p-4 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-white/20`}>
                          {/* Hardware Accents */}
                          <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-white/40 rounded-tl-lg opacity-0 group-hover/msg:opacity-100 transition-opacity" />
                          <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-white/40 rounded-br-lg opacity-0 group-hover/msg:opacity-100 transition-opacity" />

                          <div className={`prose prose-invert prose-sm max-w-none font-medium leading-relaxed ${lang === 'ar' ? 'text-right' : 'text-left'} ${isCompact ? 'text-[12px]' : 'text-[14px]'}`}>
                            {isLongMessage(msg.content) && collapsedMessages[msg.id] !== false ? (
                              <div className="relative">
                                <div className="max-h-[200px] overflow-hidden mask-fade-bottom">
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                                <button 
                                  onClick={() => toggleCollapse(msg.id)}
                                  className="mt-4 w-full py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-400 hover:text-black transition-all flex items-center justify-center gap-2"
                                >
                                  <Zap size={12} /> Expand Transmission ({Math.ceil(msg.content.length / 100)} KB)
                                </button>
                              </div>
                            ) : (
                              <>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                {isLongMessage(msg.content) && (
                                  <button 
                                    onClick={() => toggleCollapse(msg.id)}
                                    className="mt-4 px-4 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                                  >
                                    Collapse Data
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          {/* Action Buttons - Minimal & Hover-only */}
                          <div className={`absolute top-2 ${msg.role === 'user' ? '-left-12' : '-right-12'} flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-all duration-300 transform ${msg.role === 'user' ? 'translate-x-2' : '-translate-x-2'} group-hover/msg:translate-x-0`}>
                            <button 
                              onClick={() => onSpeak(msg.content, msg.id)}
                              className={`p-2 border border-white/10 rounded-lg transition-all ${speakingId === msg.id ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/40 hover:text-emerald-400 hover:bg-white/10'}`}
                              title="Speak"
                            >
                              <Volume2 size={14} />
                            </button>
                            <button 
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-blue-400 hover:bg-white/10 transition-all"
                              title="Copy"
                            >
                              {copiedId === msg.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                            {msg.role === 'model' && (
                              <button 
                                onClick={() => onRegenerate(msg.id)}
                                className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-amber-400 hover:bg-white/10 transition-all"
                                title="Regenerate"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => onDeleteMessage(msg.id)}
                              className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-all"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                  ))}
              </AnimatePresence>
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 sm:gap-6"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-zinc-900 border border-white/10 text-emerald-400 flex items-center justify-center animate-pulse">
                      <Bot size={20} />
                    </div>
                    <div className="p-6 bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl rounded-tl-none shadow-2xl">
                      <div className="flex gap-2">
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-[#050505] border-t border-white/5 relative z-30">
          <div className="max-w-4xl mx-auto space-y-4">
            <AnimatePresence>
              {suggestions.length > 0 && !isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
                >
                  {suggestions.map((s, i) => (
                    <button 
                      key={`chat-sug-${i}`}
                      onClick={() => onSendMessage(s)}
                      className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[8px] font-mono uppercase tracking-widest text-white/20 hover:bg-white/10 hover:text-emerald-400 hover:border-emerald-500/20 whitespace-nowrap transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="relative group">
              <div className="relative flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 pr-3 focus-within:border-white/20 transition-all">
                <textarea 
                  name="chat-input"
                  rows={1}
                  value={input}
                  onChange={adjustTextareaHeight}
                  onKeyDown={handleKeyDown}
                  placeholder={t.placeholder.replace('{name}', activePersona.name)}
                  className="flex-1 pl-4 py-2.5 bg-transparent text-[14px] text-white placeholder:text-white/10 focus:outline-none resize-none max-h-[160px] leading-relaxed no-scrollbar font-sans"
                />
                <div className="flex items-center gap-2 pb-1">
                  <AnimatePresence>
                    {input.trim() && (
                      <motion.button 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        type="button"
                        onClick={() => { setInput(''); const t = document.querySelector('textarea[name="chat-input"]') as any; if(t) t.style.height = 'auto'; }}
                        className="p-2 text-white/20 hover:text-white transition-colors"
                      >
                        <X size={16} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <button 
                    onClick={() => handleSubmit()}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white disabled:opacity-10 transition-all active:scale-95 group/send"
                  >
                    <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                <span className="text-[7px] font-mono text-white/10 uppercase tracking-[0.4em]">Neural Link Established</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[7px] font-mono text-white/10 uppercase tracking-[0.4em]">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-[7px] font-mono text-white/10 uppercase tracking-[0.4em]">Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Git Export Modal */}
      <AnimatePresence>
        {showGitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                    <GitBranch size={20} />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-white">Export to Git</h2>
                </div>
                <button onClick={() => setShowGitModal(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleGitExport} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Repository URL</label>
                  <input 
                    type="url"
                    required
                    placeholder="https://github.com/username/repo.git"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
                  />
                  <p className="text-[8px] text-white/20 uppercase tracking-widest ml-2">Include PAT if private: https://TOKEN@github.com/...</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Commit Message</label>
                  <input 
                    type="text"
                    value={gitMessage}
                    onChange={(e) => setGitMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowGitModal(false)}
                    className="flex-1 py-4 bg-white/5 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    Initiate Export
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
