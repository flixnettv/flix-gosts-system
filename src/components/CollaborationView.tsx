import React from 'react';
import { 
  Users, 
  ArrowLeft, 
  Bot, 
  Skull, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Activity,
  GitBranch,
  Terminal,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';
import { Task, SubTask } from '../types';
import { Persona } from '../services/ai';

interface CollaborationViewProps {
  onBack: () => void;
  tasks: Task[];
  personas: Persona[];
  t: any;
}

export const CollaborationView: React.FC<CollaborationViewProps> = ({ onBack, tasks, personas, t }) => {
  const activeTasks = tasks.filter(t => t.status === 'ongoing' || (t.sub_tasks && t.sub_tasks.some(st => st.status === 'ongoing' || st.status === 'pending')));

  const getPersona = (id: string) => personas.find(p => p.id === id);

  return (
    <div className="flex-1 flex flex-col bg-black h-full overflow-hidden">
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/50 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={16} className="text-white/60" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users size={16} />
            </div>
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-white">Multi-Agent Collaboration</h2>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60">Active Network</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Active Collaborative Tasks */}
        <section className="space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Activity size={12} /> Active Directives
            </h3>
            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
              {activeTasks.length} Ongoing
            </span>
          </div>

          <div className="grid gap-4">
            {activeTasks.map(task => (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-lg font-black uppercase tracking-tight text-white">{task.title}</h4>
                    <p className="text-xs text-white/40">{task.description || 'No description provided.'}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${task.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                    {task.priority} Priority
                  </div>
                </div>

                {/* Sub-tasks / Delegation Flow */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/20">
                    <ChevronRight size={10} /> Delegation Flow
                  </div>
                  <div className="space-y-2">
                    {task.sub_tasks?.map(st => {
                      const assignee = getPersona(st.assigned_agent_id || '');
                      return (
                        <div key={st.id} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-xl">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${assignee?.type === 'ghost' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {assignee?.type === 'ghost' ? <Skull size={14} /> : <Bot size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white/80 truncate">{st.title}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/20">
                              Assigned to: {assignee?.name || 'Unassigned'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {st.status === 'completed' ? (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                <CheckCircle2 size={10} />
                                <span className="text-[8px] font-black uppercase tracking-widest">Done</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-400 rounded-lg">
                                <Clock size={10} className={st.status === 'ongoing' ? "animate-spin" : ""} />
                                <span className="text-[8px] font-black uppercase tracking-widest">{st.status === 'ongoing' ? 'Processing' : 'Pending'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(!task.sub_tasks || task.sub_tasks.length === 0) && (
                      <p className="text-[9px] text-white/20 uppercase tracking-widest text-center py-4">No sub-tasks delegated yet.</p>
                    )}
                  </div>
                </div>

                {/* Collaborators */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {task.collaborator_ids?.map((id, cIdx) => {
                      const p = getPersona(id);
                      return (
                        <div 
                          key={`${id}-${cIdx}`} 
                          className={`w-7 h-7 rounded-full border-2 border-black flex items-center justify-center ${p?.type === 'ghost' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}
                          title={p?.name}
                        >
                          {p?.type === 'ghost' ? <Skull size={12} /> : <Bot size={12} />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-white/20">
                    {task.collaborator_ids?.length || 0} Agents Collaborating
                  </div>
                </div>
              </motion.div>
            ))}

            {activeTasks.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 bg-white/5 border border-white/10 border-dashed rounded-3xl">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <Users size={24} className="text-white/10" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">No active collaborations</p>
                  <p className="text-[8px] text-white/20 uppercase tracking-widest">Assign tasks to multiple agents to see them here.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Agent Network Status */}
        <section className="space-y-4 max-w-4xl mx-auto">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Bot size={12} /> Agent Network Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {personas.map(p => (
              <div key={p.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.type === 'ghost' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {p.type === 'ghost' ? <Skull size={18} /> : (p.id === 'code-agent' ? <Terminal size={18} /> : <Bot size={18} />)}
                </div>
                <div className="min-w-0">
                  <h5 className="text-[11px] font-black uppercase tracking-tight text-white truncate">{p.name}</h5>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.type === 'ghost' ? 'bg-orange-500' : 'bg-emerald-500'} animate-pulse`} />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Ready</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
