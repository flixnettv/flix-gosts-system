import React, { useState, useEffect } from 'react';
import { Bot, Trash2, Edit2, Plus, Users } from 'lucide-react';

export const AdminDashboard = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newAgent, setNewAgent] = useState({ name: '', model: 'gemini-3-flash-preview', memories: '', skills: '' });

  useEffect(() => {
    fetchAgents();
    fetchUsers();
  }, []);

  const fetchAgents = () => fetch('/api/agents').then(res => res.json()).then((data: any) => setAgents(data.agents || []));
  const fetchUsers = () => fetch('/api/query/users?select=id,username').then(res => res.json()).then((data: any) => setUsers(data || []));

  const createAgent = async () => {
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newAgent, skills: newAgent.skills.split(',').map(s => s.trim()) })
    });
    setNewAgent({ name: '', model: 'gemini-1.5-flash', memories: '', skills: '' });
    fetchAgents();
  };

  const deleteAgent = async (id: string) => {
    await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    fetchAgents();
  };

  const assignAgent = async (user_id: string, agent_id: string) => {
    await fetch('/api/assign-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, agent_id })
    });
    alert('Agent assigned!');
  };

  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      
      {/* Agent Creation Form */}
      <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
        <h3 className="text-lg font-semibold">Create New Agent</h3>
        <input className="w-full p-2 bg-black/20 rounded" placeholder="Agent Name" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} />
        <select className="w-full p-2 bg-black/20 rounded" value={newAgent.model} onChange={e => setNewAgent({...newAgent, model: e.target.value})}>
          <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
          <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
          <option value="models/gemini-1.0-pro">Gemini 1.0 Pro (Legacy)</option>
          <option value="groq">Groq (Llama 3)</option>
        </select>
        <textarea className="w-full p-2 bg-black/20 rounded" placeholder="Memories (Context)" value={newAgent.memories} onChange={e => setNewAgent({...newAgent, memories: e.target.value})} />
        <input className="w-full p-2 bg-black/20 rounded" placeholder="Skills (comma separated)" value={newAgent.skills} onChange={e => setNewAgent({...newAgent, skills: e.target.value})} />
        <button onClick={createAgent} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 rounded"><Plus size={18} /> Save Agent</button>
      </div>

      {/* Agents List */}
      <div className="grid grid-cols-1 gap-4">
        <h3 className="text-lg font-semibold">Agents</h3>
        {agents.map(agent => (
          <div key={agent.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
            <div>
              <p className="font-bold">{agent.name}</p>
              <p className="text-xs text-white/50">{agent.model}</p>
            </div>
            <button onClick={() => deleteAgent(agent.id)} className="text-red-400"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>

      {/* User Assignment */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Assign Agents to Users</h3>
        {users.map(user => (
          <div key={user.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
            <span>{user.username}</span>
            <div className="flex gap-2">
              {agents.map(agent => (
                <button key={agent.id} onClick={() => assignAgent(user.id, agent.id)} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                  Assign {agent.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
