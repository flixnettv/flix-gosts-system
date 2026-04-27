import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ArrowLeft, 
  User as UserIcon, 
  Shield, 
  Key, 
  RefreshCw, 
  Bot, 
  CheckCircle2, 
  Search,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { userService } from '../services/user';
import { storageService } from '../services/storage';
import { User, Persona } from '../types';
import { PERSONAS, mergePersonas } from '../services/ai';

interface UsersViewProps {
  onBack: () => void;
  personas: Persona[];
  t: any;
}

export const UsersView: React.FC<UsersViewProps> = ({ onBack, personas, t }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  const allPersonas = personas;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await userService.getAllUsers();
    setUsers(data);
    setIsLoading(false);
  };

  const handleGeneratePin = async (userId: string) => {
    await userService.generatePin(userId);
    await loadUsers();
  };

  const handleAssignPersona = async (userId: string, personaId: string) => {
    await userService.assignAssistant(userId, personaId);
    setAssigningUserId(null);
    await loadUsers();
  };

  const handleUpdateRole = async (userId: string, role: User['role']) => {
    await userService.updateUser(userId, { role });
    await loadUsers();
  };

  const filtered = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 overflow-auto bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">User Management</h1>
              <p className="text-white/40 text-[9px] font-medium uppercase tracking-widest">Manage clients, assign assistants, and generate PINs</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input 
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white/5 border border-white/10 rounded-[1.5rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40">User</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40">Role</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40">Assigned Assistant</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40">PIN Code</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/20 text-[10px] uppercase tracking-widest font-black">Loading system data...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/20 text-[10px] uppercase tracking-widest font-black">No users found in the system.</td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <UserIcon size={16} className="text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{u.name || 'Anonymous'}</p>
                            <p className="text-[9px] text-white/40 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value as User['role'])}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-black border border-white/10 text-white focus:border-emerald-500/50 appearance-none cursor-pointer ${u.role === 'admin' ? 'text-purple-400 border-purple-500/30' : u.role === 'manager' ? 'text-amber-400 border-amber-500/30' : 'text-blue-400 border-blue-500/30'}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Ghost (Manager)</option>
                          <option value="user">Client (User)</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {assigningUserId === u.id ? (
                          <select 
                            className="bg-black border border-white/10 rounded-lg text-[10px] text-white p-1.5 focus:border-emerald-500/50"
                            onChange={(e) => handleAssignPersona(u.id, e.target.value)}
                            defaultValue={u.assigned_persona_id || ''}
                          >
                            <option value="">Unassigned</option>
                            {allPersonas.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Bot size={14} className="text-white/40" />
                            <span className="text-[10px] text-white/60">
                              {allPersonas.find(p => p.id === u.assigned_persona_id)?.name || 'None'}
                            </span>
                            <button 
                              onClick={() => setAssigningUserId(u.id)}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                            >
                              <RefreshCw size={10} className="text-white/20" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Lock size={12} className="text-white/20" />
                          <span className="text-[10px] font-mono text-emerald-400 tracking-widest">
                            {u.pin_code || '------'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleGeneratePin(u.id)}
                          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Key size={12} /> Generate PIN
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
