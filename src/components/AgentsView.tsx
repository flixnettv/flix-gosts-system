import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Plus, 
  Trash2, 
  Edit2, 
  Copy, 
  CheckCircle2, 
  ArrowLeft, 
  Cpu, 
  Zap, 
  Shield, 
  Sparkles,
  Search,
  MessageSquare,
  Activity,
  ChevronRight,
  Info,
  Ghost,
  Skull
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storageService } from '../services/storage';
import { User, Persona } from '../types';
import { MODELS, PERSONAS, mergePersonas } from '../services/ai';
import { userService } from '../services/user';

interface AgentsViewProps {
  onBack: () => void;
  onSelect: (id: string) => void;
  activeId: string;
  customPersonas: Persona[];
  onUpdate: () => void;
  user: User | null;
  t: any;
}

export const AgentsView: React.FC<AgentsViewProps> = ({ onBack, onSelect, activeId, customPersonas, onUpdate, user, t }) => {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Persona | null>(null);
  const [newAgent, setNewAgent] = useState<Partial<Persona>>({
    name: '',
    description: '',
    systemInstruction: '',
    icon: 'Bot',
    capabilities: [],
    model: 'gemini-2.0-flash',
    type: 'goblin',
    mcpEnabled: false,
    mcpConfig: { endpoint: '', tools: [] }
  });

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canManageGoblins = userService.hasPermission('manage_goblins');
  const allAgents = React.useMemo(() => mergePersonas(PERSONAS, customPersonas), [customPersonas]);
  
  const agents = isAdmin 
    ? allAgents
    : isManager
      ? allAgents.filter(p => p.type === 'goblin' && p.manager_id === user?.assigned_persona_id || p.id === user?.assigned_persona_id)
      : allAgents.filter(p => p.id === user?.assigned_persona_id);

  const isAssignedAgent = (id: string) => id === user?.assigned_persona_id;
  
  const canEdit = (agent: Persona) => {
    if (isAdmin) return true;
    if (isManager && agent.type === 'goblin' && agent.manager_id === user?.assigned_persona_id) return true;
    if (isAssignedAgent(agent.id)) return true; // Clients can change name
    return false;
  };

  const canDelete = (agent: Persona) => {
    if (PERSONAS.some(p => p.id === agent.id)) return false;
    if (isAdmin) return true;
    if (isManager && agent.type === 'goblin' && agent.manager_id === user?.assigned_persona_id) return true;
    return false;
  };

  const handleSave = async () => {
    if (!newAgent.name || !newAgent.systemInstruction) return;
    
    const agent: Persona = {
      id: editingAgent?.id || `agent-${Date.now()}`,
      name: newAgent.name,
      description: newAgent.description || '',
      systemInstruction: newAgent.systemInstruction,
      icon: newAgent.icon || 'Bot',
      capabilities: newAgent.capabilities || [],
      model: newAgent.model || 'gemini-2.0-flash',
      type: newAgent.type || 'goblin',
      manager_id: newAgent.manager_id || (isManager ? user?.assigned_persona_id : undefined),
      customModelId: newAgent.customModelId,
      customApiUrl: newAgent.customApiUrl,
      apiKey: newAgent.apiKey,
      mcpEnabled: newAgent.mcpEnabled,
      mcpConfig: newAgent.mcpConfig
    };

    await storageService.upsert('agents', agent, { on: 'id' });
    
    onUpdate();
    setIsAdding(false);
    setEditingAgent(null);
    setNewAgent({ 
      name: '', 
      description: '', 
      systemInstruction: '', 
      icon: 'Bot', 
      capabilities: [], 
      model: 'models/gemini-1.5-flash', 
      type: 'goblin',
      mcpEnabled: false,
      mcpConfig: { endpoint: '', tools: [] }
    });
  };

  const handleDelete = async (id: string) => {
    const agent = allAgents.find(a => a.id === id);
    if (!agent || !canDelete(agent)) return;
    await storageService.delete('agents', { eq: ['id', id] });
    onUpdate();
  };

  const handleEdit = (agent: Persona) => {
    setEditingAgent(agent);
    setNewAgent(agent);
    setIsAdding(true);
  };

  const filtered = agents.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  const ghosts = allAgents.filter(a => a.type === 'ghost');

  return (
    <div className="flex-1 overflow-auto bg-black p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
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
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">{t.agents}</h1>
              <p className="text-white/40 text-[9px] font-medium uppercase tracking-widest">Manage AI intelligence cores</p>
            </div>
          </div>
          {(isAdmin || canManageGoblins) && (
            <button 
              onClick={() => { 
                setIsAdding(true); 
                setEditingAgent(null); 
                setNewAgent({ 
                  name: '', 
                  description: '', 
                  systemInstruction: '', 
                  icon: 'Bot', 
                  capabilities: [], 
                  model: 'models/gemini-1.5-flash', 
                  type: isManager ? 'goblin' : 'ghost',
                  manager_id: isManager ? user?.assigned_persona_id : undefined,
                  mcpEnabled: false,
                  mcpConfig: { endpoint: '', tools: [] }
                }); 
              }}
              className="px-4 py-2 bg-blue-500 text-white font-black uppercase tracking-widest text-[9px] rounded-lg hover:bg-blue-400 transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              <Plus size={14} /> {t.addAgent}
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input 
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((agent) => (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group relative p-5 bg-white/5 border ${activeId === agent.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10'} rounded-[1.5rem] space-y-4 hover:bg-white/10 transition-all overflow-hidden`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeId === agent.id ? 'bg-blue-500 text-white' : 'bg-white/5 text-blue-400'}`}>
                    {agent.type === 'ghost' ? <Ghost size={20} /> : <Skull size={20} />}
                  </div>
                  <div className="flex items-center gap-1">
                    {canDelete(agent) && (
                      <button 
                        onClick={() => handleDelete(agent.id)}
                        className="p-1.5 bg-white/5 rounded-md text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    {canEdit(agent) && (
                      <button 
                        onClick={() => handleEdit(agent)}
                        className="p-1.5 bg-white/5 rounded-md text-white/40 hover:text-white transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black uppercase tracking-tight text-white">{agent.name}</h3>
                    {activeId === agent.id && <CheckCircle2 size={12} className="text-blue-500" />}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className={`w-fit px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase tracking-widest ${agent.type === 'ghost' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {agent.type === 'ghost' ? 'Ghost' : 'Goblin'}
                    </span>
                    {agent.manager_id && (
                      <span className="text-[7px] text-white/20 font-black uppercase tracking-widest">
                        By {allAgents.find(a => a.id === agent.manager_id)?.name || 'Unknown'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">{agent.description}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.slice(0, 3).map(cap => (
                    <span key={cap} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md text-[8px] text-white/40 font-black uppercase tracking-widest">
                      {cap}
                    </span>
                  ))}
                </div>

                <button 
                  onClick={() => onSelect(agent.id)}
                  disabled={activeId === agent.id}
                  className={`w-full py-2.5 font-black uppercase tracking-widest text-[9px] rounded-lg transition-all ${activeId === agent.id ? 'bg-blue-500/20 text-blue-500 cursor-default' : 'bg-white text-black hover:bg-blue-500 hover:text-white'}`}
                >
                  {activeId === agent.id ? 'Active Core' : 'Switch Core'}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add/Edit Modal */}
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-[1.5rem] p-6 space-y-4 max-h-[90vh] overflow-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase tracking-tighter text-white">{editingAgent ? t.editPersona : t.addAgent}</h2>
                <button onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">{t.agentName}</label>
                    <input 
                      type="text"
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  {(isAdmin || canManageGoblins) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">Agent Type</label>
                        <select 
                          value={newAgent.type}
                          disabled={isManager}
                          onChange={(e) => setNewAgent({ ...newAgent, type: e.target.value as 'ghost' | 'goblin' })}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50 appearance-none disabled:opacity-50"
                        >
                          <option value="ghost" className="bg-zinc-900">Ghost (Manager)</option>
                          <option value="goblin" className="bg-zinc-900">Goblin (Worker)</option>
                        </select>
                      </div>
                      {newAgent.type === 'goblin' && (
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">Assign to Ghost</label>
                          <select 
                            value={newAgent.manager_id}
                            disabled={isManager}
                            onChange={(e) => setNewAgent({ ...newAgent, manager_id: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50 appearance-none disabled:opacity-50"
                          >
                            <option value="" className="bg-zinc-900">Unassigned</option>
                            {ghosts.map(g => (
                              <option key={g.id} value={g.id} className="bg-zinc-900">{g.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">{t.agentDesc}</label>
                        <input 
                          type="text"
                          value={newAgent.description}
                          onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">{t.agentModel}</label>
                        <select 
                          value={newAgent.model}
                          onChange={(e) => setNewAgent({ ...newAgent, model: e.target.value })}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                        >
                          {MODELS.map(m => (
                            <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-3">
                  {(isAdmin || canManageGoblins) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">{t.agentCapabilities}</label>
                        <input 
                          type="text"
                          placeholder="e.g. Coding, Analysis"
                          value={newAgent.capabilities?.join(', ')}
                          onChange={(e) => setNewAgent({ ...newAgent, capabilities: e.target.value.split(',').map(s => s.trim()) })}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">{t.agentInstruction}</label>
                        <textarea 
                          rows={4}
                          value={newAgent.systemInstruction}
                          onChange={(e) => setNewAgent({ ...newAgent, systemInstruction: e.target.value })}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 resize-none text-[11px]"
                        />
                      </div>

                      {/* MCP Configuration */}
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/40">MCP Protocol</label>
                          </div>
                          <button 
                            onClick={() => setNewAgent({ ...newAgent, mcpEnabled: !newAgent.mcpEnabled })}
                            className={`w-10 h-5 rounded-full transition-all relative ${newAgent.mcpEnabled ? 'bg-blue-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${newAgent.mcpEnabled ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>

                        {newAgent.mcpEnabled && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">Endpoint URL</label>
                              <input 
                                type="text"
                                placeholder="https://api.mcp-server.com/v1"
                                value={newAgent.mcpConfig?.endpoint || ''}
                                onChange={(e) => setNewAgent({ 
                                  ...newAgent, 
                                  mcpConfig: { ...(newAgent.mcpConfig || { endpoint: '', tools: [] }), endpoint: e.target.value } 
                                })}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">Tools (Comma separated)</label>
                              <input 
                                type="text"
                                placeholder="google_search, weather_api"
                                value={newAgent.mcpConfig?.tools?.join(', ') || ''}
                                onChange={(e) => setNewAgent({ 
                                  ...newAgent, 
                                  mcpConfig: { ...(newAgent.mcpConfig || { endpoint: '', tools: [] }), tools: e.target.value.split(',').map(s => s.trim()) } 
                                })}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2.5 bg-white/5 text-white font-black uppercase tracking-widest text-[9px] rounded-lg hover:bg-white/10 transition-all"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-blue-500 text-white font-black uppercase tracking-widest text-[9px] rounded-lg hover:bg-blue-400 transition-all"
                >
                  {t.saveAgent}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

const X = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
