import React from 'react';
import { Bot, Settings, MessageSquare, Shield, Plus } from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab, onNewChat }: { activeTab: string, setActiveTab: (tab: string) => void, onNewChat: () => void }) => {
  return (
    <div className="w-64 bg-black border-r border-white/10 p-4 flex flex-col gap-4">
      <div className="text-xl font-bold flex items-center gap-2">
        <Bot className="text-emerald-500" /> Flix Gosts
      </div>
      <button onClick={onNewChat} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10">
        <Plus size={18} /> New Chat
      </button>
      <nav className="flex flex-col gap-2">
        <button onClick={() => setActiveTab('chat')} className={`p-2 rounded-lg flex items-center gap-2 ${activeTab === 'chat' ? 'bg-white/10' : ''}`}>
          <MessageSquare size={18} /> Chat
        </button>
        <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white/10' : ''}`}>
          <Settings size={18} /> Settings
        </button>
        <button onClick={() => setActiveTab('admin')} className={`p-2 rounded-lg flex items-center gap-2 ${activeTab === 'admin' ? 'bg-white/10' : ''}`}>
          <Shield size={18} /> Admin
        </button>
      </nav>
    </div>
  );
};
