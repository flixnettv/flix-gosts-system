import React from 'react';
import { 
  Sparkles, 
  Terminal as TerminalIcon, 
  Settings as SettingsIcon, 
  Brain, 
  Code, 
  Database, 
  Layers, 
  Box, 
  Bot,
  MessageSquare,
  FileText,
  Activity,
  Zap,
  Shield,
  Plus,
  ChevronRight,
  Cpu,
  CheckCircle2,
  Clock,
  PlayCircle,
  Users,
  Lock,
  Skull,
  Folder
} from 'lucide-react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { User } from '../types';
import { userService } from '../services/user';

interface DashboardProps {
  onNavigate: (view: 'chat' | 'terminal' | 'settings' | 'memories' | 'templates' | 'agents' | 'users' | 'collaboration' | 'files') => void;
  activePersonaName: string;
  isDbReady: boolean | null;
  isAiReady: boolean | null;
  isMobileBridgeActive: boolean;
  isPcBridgeActive: boolean;
  isSynced?: boolean;
  isBooted?: boolean;
  checkHealth: (force?: boolean) => void;
  user: User | null;
  stats: {
    memories: number;
    conversations: number;
    agents: number;
    messages: number;
  };
  taskStats: {
    upcoming: number;
    ongoing: number;
    completed: number;
    total: number;
  };
  t: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onNavigate, 
  activePersonaName, 
  isDbReady, 
  isAiReady, 
  isMobileBridgeActive,
  isPcBridgeActive,
  isSynced,
  isBooted,
  checkHealth,
  user,
  stats,
  taskStats,
  t 
}) => {
  const chartData = [
    { name: 'Upcoming', value: taskStats.upcoming, color: '#94a3b8' }, // slate-400
    { name: 'Ongoing', value: taskStats.ongoing, color: '#fbbf24' },  // amber-400
    { name: 'Completed', value: taskStats.completed, color: '#10b981' } // emerald-500
  ].filter(d => d.value > 0);

  // Fallback if no tasks
  const displayData = chartData.length > 0 ? chartData : [
    { name: 'No Tasks', value: 1, color: '#1e293b' } // slate-800
  ];
  const cards = [
    {
      id: 'chat',
      title: t.nexus,
      desc: t.welcomeDesc,
      icon: <MessageSquare className="text-emerald-400" size={24} />,
      color: 'emerald',
      action: () => onNavigate('chat')
    },
    {
      id: 'terminal',
      title: t.terminal,
      desc: t.terminalWelcome,
      icon: <TerminalIcon className="text-amber-400" size={24} />,
      color: 'amber',
      action: () => onNavigate('terminal')
    },
    {
      id: 'memories',
      title: t.memoryTitle,
      desc: t.memoryDesc,
      icon: <Brain className="text-purple-400" size={24} />,
      color: 'purple',
      action: () => onNavigate('memories')
    },
    {
      id: 'agents',
      title: user?.role === 'manager' ? 'Goblin Management' : t.agents,
      desc: user?.role === 'manager' ? 'Manage your assigned worker goblins.' : 'Configure your AI cores and system preferences.',
      icon: user?.role === 'manager' ? <Skull className="text-orange-400" size={24} /> : <Bot className="text-blue-400" size={24} />,
      color: user?.role === 'manager' ? 'orange' : 'blue',
      action: () => onNavigate('agents')
    },
    {
      id: 'templates',
      title: 'Templates',
      desc: 'Pre-defined prompts and system instructions.',
      icon: <FileText className="text-rose-400" size={24} />,
      color: 'rose',
      action: () => onNavigate('templates'),
      restricted: !userService.hasPermission('manage_agents') && !userService.hasPermission('manage_goblins')
    },
    {
      id: 'settings',
      title: t.settings,
      desc: 'Configure your AI cores and system preferences.',
      icon: <SettingsIcon className="text-gray-400" size={24} />,
      color: 'gray',
      action: () => onNavigate('settings')
    },
    {
      id: 'users',
      title: 'User Management',
      desc: 'Manage clients, assign assistants, and generate PIN codes.',
      icon: <Users className="text-emerald-400" size={24} />,
      color: 'emerald',
      action: () => onNavigate('users'),
      restricted: !userService.isAdmin()
    },
    {
      id: 'collaboration',
      title: 'Collaboration',
      desc: 'Monitor multi-agent task delegation and shared workspace.',
      icon: <Users className="text-blue-400" size={24} />,
      color: 'blue',
      action: () => onNavigate('collaboration')
    },
    {
      id: 'files',
      title: 'Local File Bridge',
      desc: 'Direct read/write access to your local workspace files.',
      icon: <Folder className="text-cyan-400" size={24} />,
      color: 'cyan',
      action: () => onNavigate('files')
    }
  ].filter(card => !card.restricted);

  return (
    <div className="flex-1 overflow-auto bg-black p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Sparkles className="text-emerald-400" size={24} />
                )}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${isAiReady ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
                {user?.name ? `Hello, ${user.name}` : t.welcome}
              </h1>
              <div className="flex items-center gap-2.5 mt-0.5">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                  {user?.role || 'Guest'} • {activePersonaName} Core
                </span>
                <span className="w-1 h-1 bg-white/10 rounded-full" />
                <div className="flex items-center gap-1">
                  <div className={`w-1 h-1 rounded-full ${isDbReady ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
                    {isDbReady ? t.online : t.offline}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Status Grid */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3`}>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">AI Core</span>
              <div className="flex items-center gap-2">
                {!isAiReady && (
                  <button 
                    onClick={() => checkHealth(true)} 
                    className="text-[8px] font-black uppercase tracking-widest text-emerald-400 hover:underline"
                  >
                    Retry
                  </button>
                )}
                <div className={`w-1.5 h-1.5 rounded-full ${isAiReady ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
              </div>
            </div>
            <p className="text-sm font-bold text-white truncate">{activePersonaName}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Database</span>
              <div className={`w-1.5 h-1.5 rounded-full ${isDbReady ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`} />
            </div>
            <p className="text-sm font-bold text-white">{isDbReady ? 'Neon' : 'Local'}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">System</span>
              <Activity className="text-emerald-400" size={12} />
            </div>
            <p className="text-sm font-bold text-white">Optimal</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">System Boot</span>
              <div className={`w-1.5 h-1.5 rounded-full ${isBooted ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`} />
            </div>
            <p className="text-sm font-bold text-white">{isBooted ? 'Active' : 'Standby'}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Cloud Sync</span>
              <div className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-amber-500'}`} />
            </div>
            <p className="text-sm font-bold text-white">{isSynced ? 'Synced' : 'Local Only'}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Mobile Bridge</span>
              <div className={`w-1.5 h-1.5 rounded-full ${isMobileBridgeActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
            </div>
            <p className="text-sm font-bold text-white">{isMobileBridgeActive ? 'Active' : 'Inactive'}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">PC Bridge</span>
              <div className={`w-1.5 h-1.5 rounded-full ${isPcBridgeActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
            </div>
            <p className="text-sm font-bold text-white">{isPcBridgeActive ? 'Active' : 'Waiting'}</p>
          </div>
          {user?.role === 'user' && user.pin_code && (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60">System PIN</span>
                <Lock className="text-emerald-500" size={12} />
              </div>
              <p className="text-sm font-mono font-black text-emerald-400 tracking-[0.2em]">{user.pin_code}</p>
            </div>
          )}
        </div>

        {/* Task Statistics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-6 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-1/3 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {displayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-2/3 space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Task Analysis</h3>
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Real-time Performance</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Upcoming</p>
                  <p className="text-xl font-black text-white">{taskStats.upcoming}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Ongoing</p>
                  <p className="text-xl font-black text-white">{taskStats.ongoing}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Completed</p>
                  <p className="text-xl font-black text-white">{taskStats.completed}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-emerald-500 text-black rounded-xl flex items-center justify-center">
                <Zap size={20} />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Efficiency</h3>
                <p className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-widest">System Optimization</p>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Peak efficiency detected. {taskStats.completed} tasks processed.
              </p>
            </div>
            <div className="pt-4">
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Rate</span>
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                  {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((card, idx) => (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={card.action}
              className="group relative p-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-left hover:bg-white/10 hover:border-white/20 transition-all overflow-hidden"
            >
              <div className="relative z-10 space-y-3">
                <div className="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  {React.cloneElement(card.icon as any, { size: 20 })}
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black uppercase tracking-tight text-white">{card.title}</h3>
                  <p className="text-[10px] text-white/40 leading-snug line-clamp-2">{card.desc}</p>
                </div>
                <div className="pt-2 flex items-center text-[8px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                  Open <ChevronRight size={10} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Stats Section */}
        <div className="pt-8 border-t border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="space-y-0.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Memories</p>
              <p className="text-xl font-black text-white">{stats.memories}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Convs</p>
              <p className="text-xl font-black text-white">{stats.conversations}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Agents</p>
              <p className="text-xl font-black text-white">{stats.agents}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Messages</p>
              <p className="text-xl font-black text-white">{stats.messages}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Uptime</p>
              <p className="text-xl font-black text-emerald-400">99.9%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
