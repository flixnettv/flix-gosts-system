import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  ArrowLeft, 
  Globe, 
  Database, 
  Cpu, 
  Shield, 
  Zap, 
  Trash2, 
  RefreshCw, 
  Key, 
  Lock, 
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  Languages,
  Moon,
  Sun,
  Layout,
  FileText,
  Copy,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storageService } from '../services/storage';

import { userService } from '../services/user';

interface SettingsViewProps {
  onBack: () => void;
  lang: 'en' | 'ar';
  onLangChange: (lang: 'en' | 'ar') => void;
  isLocalOnly: boolean;
  onLocalOnlyChange: (val: boolean) => void;
  isCompact: boolean;
  onCompactChange: (val: boolean) => void;
  theme: 'dark' | 'light';
  onThemeChange: (val: 'dark' | 'light') => void;
  apiKeys: Record<string, string>;
  onApiKeysChange: (keys: Record<string, string>) => void;
  onClearAllData: () => void;
  onPruneMessages: () => void;
  t: any;
  isDbReady: boolean | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  onBack, 
  lang, 
  onLangChange, 
  isLocalOnly, 
  onLocalOnlyChange, 
  apiKeys, 
  onApiKeysChange, 
  onClearAllData,
  onPruneMessages,
  t,
  isDbReady,
  isCompact,
  onCompactChange,
  theme,
  onThemeChange
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'storage' | 'system' | 'bridge'>('general');
  const [localKeys, setLocalKeys] = useState(apiKeys);
  const [copied, setCopied] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dbHelper, setDbHelper] = useState({
    host: '',
    user: '',
    password: '',
    database: '',
    port: '5432'
  });

  const generatedUrl = dbHelper.host && dbHelper.user && dbHelper.password && dbHelper.database
    ? `postgresql://${encodeURIComponent(dbHelper.user)}:${encodeURIComponent(dbHelper.password)}@${dbHelper.host}:${dbHelper.port}/${dbHelper.database}?sslmode=require`
    : '';

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  const validateKey = (key: string): string | null => {
    if (!key) return null; // Optional keys are fine if empty
    if (key.length < 20) return "Key must be at least 20 characters long.";
    if (/\s/.test(key)) return "Key cannot contain spaces.";
    return null;
  };

  const handleSaveKeys = () => {
    const newErrors: Record<string, string> = {};
    const geminiError = validateKey(localKeys.gemini);
    const orError = validateKey(localKeys.openrouter);
    const hfError = validateKey(localKeys.huggingface);
    const groqError = validateKey(localKeys.groq);
    const githubError = validateKey(localKeys.github_pat);

    if (geminiError) newErrors.gemini = geminiError;
    if (orError) newErrors.openrouter = orError;
    if (hfError) newErrors.huggingface = hfError;
    if (groqError) newErrors.groq = groqError;
    if (githubError) newErrors.github_pat = githubError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onApiKeysChange(localKeys);
  };

  const SQL_SCHEMA = `
-- Flix Gosts Database Schema
-- Run this in your Neon SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  telegram_chat_id BIGINT UNIQUE,
  telegram_token TEXT UNIQUE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  persona TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  importance INTEGER DEFAULT 1,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  system_instruction TEXT NOT NULL,
  icon TEXT DEFAULT 'Bot',
  capabilities TEXT[] DEFAULT '{}',
  model TEXT DEFAULT 'gemini-2.0-flash',
  type TEXT DEFAULT 'goblin',
  role TEXT DEFAULT '',
  manager_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  service_name TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, service_name)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
`.trim();

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied('schema');
    setTimeout(() => setCopied(null), 2000);
  };

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
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white">{t.settings}</h1>
              <p className="text-white/40 text-sm font-medium uppercase tracking-widest">System Preferences & Configuration</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/10">
          {[
            { id: 'general', icon: <Globe size={16} />, label: t.general },
            { id: 'api', icon: <Key size={16} />, label: t.apiKeys, restricted: !userService.hasPermission('manage_api_keys') },
            { id: 'storage', icon: <Database size={16} />, label: t.storage, restricted: !userService.hasPermission('manage_api_keys') },
            { id: 'system', icon: <Cpu size={16} />, label: 'System' },
            { id: 'bridge', icon: <RefreshCw size={16} />, label: 'Bridge' }
          ].filter(tab => !tab.restricted).map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-t-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white/10 text-white border-b-2 border-emerald-500' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-8 pt-4">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                  <Languages className="text-emerald-400" size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">{t.nexus} Language</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => onLangChange('en')}
                    className={`p-4 rounded-2xl border transition-all ${lang === 'en' ? 'bg-emerald-500 border-emerald-500 text-black font-black' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    English (US)
                  </button>
                  <button 
                    onClick={() => onLangChange('ar')}
                    className={`p-4 rounded-2xl border transition-all ${lang === 'ar' ? 'bg-emerald-500 border-emerald-500 text-black font-black' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    العربية (AR)
                  </button>
                </div>
              </div>

              <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                  <Layout className="text-blue-400" size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">Interface Mode</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => onThemeChange('dark')}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-emerald-500 border-emerald-500 text-black font-black' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    <Moon size={18} /> Stealth Mode (Dark)
                  </button>
                  <button 
                    onClick={() => onThemeChange('light')}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-center gap-2 ${theme === 'light' ? 'bg-emerald-500 border-emerald-500 text-black font-black' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    <Sun size={18} /> Light Mode
                  </button>
                </div>
              </div>

              <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                  <Zap className="text-amber-400" size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">Chat Density</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => onCompactChange(false)}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-center gap-2 ${!isCompact ? 'bg-emerald-500 border-emerald-500 text-black font-black' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    <Layout size={18} /> Default
                  </button>
                  <button 
                    onClick={() => onCompactChange(true)}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-center gap-2 ${isCompact ? 'bg-emerald-500 border-emerald-500 text-black font-black' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    <Zap size={18} /> Compact
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="text-amber-400" size={24} />
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Intelligence Core Keys</h3>
                  </div>
                  <button 
                    onClick={handleSaveKeys}
                    className="px-6 py-2 bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-400 transition-all"
                  >
                    {t.saveKeys}
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Groq API Key (Primary)</label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={localKeys.groq}
                        onChange={(e) => {
                          setLocalKeys({ ...localKeys, groq: e.target.value });
                          setErrors({ ...errors, groq: '' });
                        }}
                        placeholder="Enter Groq API Key..."
                        className={`w-full pl-4 pr-12 py-3 bg-white/5 border rounded-xl text-white focus:outline-none ${errors.groq ? 'border-red-500' : 'border-white/10 focus:border-amber-500/50'}`}
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    </div>
                    {errors.groq && <p className="text-[10px] text-red-500 ml-2">{errors.groq}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Gemini API Key (Secondary/Background)</label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={localKeys.gemini}
                        onChange={(e) => {
                          setLocalKeys({ ...localKeys, gemini: e.target.value });
                          setErrors({ ...errors, gemini: '' });
                        }}
                        placeholder="Enter Gemini API Key..."
                        className={`w-full pl-4 pr-12 py-3 bg-white/5 border rounded-xl text-white focus:outline-none ${errors.gemini ? 'border-red-500' : 'border-white/10 focus:border-amber-500/50'}`}
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    </div>
                    {errors.gemini && <p className="text-[10px] text-red-500 ml-2">{errors.gemini}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">GitHub Personal Access Token (Bureau)</label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={localKeys.github_pat}
                        onChange={(e) => {
                          setLocalKeys({ ...localKeys, github_pat: e.target.value });
                          setErrors({ ...errors, github_pat: '' });
                        }}
                        placeholder="Enter GitHub PAT..."
                        className={`w-full pl-4 pr-12 py-3 bg-white/5 border rounded-xl text-white focus:outline-none ${errors.github_pat ? 'border-red-500' : 'border-white/10 focus:border-amber-500/50'}`}
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    </div>
                    {errors.github_pat && <p className="text-[10px] text-red-500 ml-2">{errors.github_pat}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Groq API Key (High Speed)</label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={localKeys.groq}
                        onChange={(e) => {
                          setLocalKeys({ ...localKeys, groq: e.target.value });
                          setErrors({ ...errors, groq: '' });
                        }}
                        placeholder="Enter Groq API Key..."
                        className={`w-full pl-4 pr-12 py-3 bg-white/5 border rounded-xl text-white focus:outline-none ${errors.groq ? 'border-red-500' : 'border-white/10 focus:border-amber-500/50'}`}
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    </div>
                    {errors.groq && <p className="text-[10px] text-red-500 ml-2">{errors.groq}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">OpenRouter API Key (Free Models)</label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={localKeys.openrouter}
                        onChange={(e) => {
                          setLocalKeys({ ...localKeys, openrouter: e.target.value });
                          setErrors({ ...errors, openrouter: '' });
                        }}
                        placeholder="Enter OpenRouter API Key..."
                        className={`w-full pl-4 pr-12 py-3 bg-white/5 border rounded-xl text-white focus:outline-none ${errors.openrouter ? 'border-red-500' : 'border-white/10 focus:border-amber-500/50'}`}
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    </div>
                    {errors.openrouter && <p className="text-[10px] text-red-500 ml-2">{errors.openrouter}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Hugging Face API Key (Fallback)</label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={localKeys.huggingface}
                        onChange={(e) => {
                          setLocalKeys({ ...localKeys, huggingface: e.target.value });
                          setErrors({ ...errors, huggingface: '' });
                        }}
                        placeholder="Enter Hugging Face API Key..."
                        className={`w-full pl-4 pr-12 py-3 bg-white/5 border rounded-xl text-white focus:outline-none ${errors.huggingface ? 'border-red-500' : 'border-white/10 focus:border-amber-500/50'}`}
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    </div>
                    {errors.huggingface && <p className="text-[10px] text-red-500 ml-2">{errors.huggingface}</p>}
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/60">Telegram Integration</h4>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Telegram Bot Token</label>
                      <div className="relative">
                        <input 
                          type="password"
                          value={localKeys.telegram_bot_token}
                          onChange={(e) => {
                            setLocalKeys({ ...localKeys, telegram_bot_token: e.target.value });
                          }}
                          placeholder="Enter Telegram Bot Token..."
                          className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                        />
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Application URL (for Webhooks)</label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={localKeys.app_url}
                          onChange={(e) => {
                            setLocalKeys({ ...localKeys, app_url: e.target.value });
                          }}
                          placeholder="https://your-app-url.com"
                          className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                        />
                        <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                      </div>
                      <p className="text-[9px] text-white/30 ml-2 italic">Required for Telegram to send messages to this app.</p>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-3">
                    <div className="flex gap-3">
                      <Info className="text-amber-400 shrink-0" size={18} />
                      <p className="text-xs text-amber-400/80 leading-relaxed">
                        Keys are stored in your browser's encrypted local storage. If you provide a custom key, it will override the system default.
                      </p>
                    </div>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <ExternalLink size={12} /> Get a free Gemini API Key
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                  <Database className="text-blue-400" size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">{t.storageMode}</h3>
                </div>
                
                {!isDbReady && !isLocalOnly && (
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-500 shrink-0" size={20} />
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-tight text-red-500">Database Connection Failed</h4>
                        <p className="text-xs text-red-500/80 leading-relaxed">
                          Your <code className="bg-red-500/20 px-1 rounded">DATABASE_URL</code> is incorrect or authentication failed. 
                          This is often caused by special characters in your password (like <code className="bg-red-500/20 px-1 rounded">@</code> or <code className="bg-red-500/20 px-1 rounded">#</code>) not being URL-encoded.
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-red-500/10 space-y-4">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Connection Helper</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-white/30 ml-1">Host (e.g. ep-blue-sky-123.aws.neon.tech)</label>
                          <input 
                            type="text" 
                            value={dbHelper.host}
                            onChange={(e) => setDbHelper({...dbHelper, host: e.target.value})}
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
                            placeholder="Host..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-white/30 ml-1">Database Name</label>
                          <input 
                            type="text" 
                            value={dbHelper.database}
                            onChange={(e) => setDbHelper({...dbHelper, database: e.target.value})}
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
                            placeholder="neondb..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-white/30 ml-1">Username</label>
                          <input 
                            type="text" 
                            value={dbHelper.user}
                            onChange={(e) => setDbHelper({...dbHelper, user: e.target.value})}
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
                            placeholder="Username..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-white/30 ml-1">Password</label>
                          <input 
                            type="password" 
                            value={dbHelper.password}
                            onChange={(e) => setDbHelper({...dbHelper, password: e.target.value})}
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
                            placeholder="Password..."
                          />
                        </div>
                      </div>
                      
                      {generatedUrl && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="text-[8px] font-black uppercase tracking-widest text-emerald-400 ml-1">Correctly Encoded DATABASE_URL</label>
                          <div className="relative group">
                            <div className="w-full p-3 bg-black border border-emerald-500/30 rounded-xl text-[10px] font-mono text-emerald-400 break-all pr-12">
                              {generatedUrl}
                            </div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(generatedUrl);
                                setCopied('db_url');
                                setTimeout(() => setCopied(null), 2000);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-all"
                            >
                              {copied === 'db_url' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                          <p className="text-[9px] text-white/40 italic">Copy this and paste it into the <b>DATABASE_URL</b> field in the <b>Settings</b> menu of AI Studio.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => onLocalOnlyChange(true)}
                    className={`p-6 rounded-3xl border text-left space-y-2 transition-all ${isLocalOnly ? 'bg-blue-500 border-blue-500 text-black' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-black uppercase tracking-widest text-xs">{t.localOnly}</h4>
                      {isLocalOnly && <CheckCircle2 size={16} />}
                    </div>
                    <p className="text-[10px] leading-relaxed opacity-60">Data stays in your browser. No cloud sync. Works offline.</p>
                  </button>
                  <button 
                    onClick={() => onLocalOnlyChange(false)}
                    className={`p-6 rounded-3xl border text-left space-y-2 transition-all ${!isLocalOnly ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-black uppercase tracking-widest text-xs">Neon Cloud Sync</h4>
                      {!isLocalOnly && <CheckCircle2 size={16} />}
                    </div>
                    <p className="text-[10px] leading-relaxed opacity-60">Sync your data across devices using a secure Neon database.</p>
                  </button>
                </div>
              </div>

              {!isLocalOnly && (
                <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="text-purple-400" size={24} />
                      <h3 className="text-xl font-black uppercase tracking-tight text-white">{t.sqlSchema}</h3>
                    </div>
                    <button 
                      onClick={handleCopySchema}
                      className="px-6 py-2 bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                      {copied === 'schema' ? <CheckCircle2 size={14} /> : <Copy size={14} />} {t.copySchema}
                    </button>
                  </div>
                  <p className="text-sm text-white/40 leading-relaxed">{t.schemaDesc}</p>
                  <div className="p-4 bg-black rounded-xl border border-white/5 overflow-x-auto">
                    <pre className="text-[10px] text-purple-400/80 font-mono leading-relaxed">
                      {SQL_SCHEMA}
                    </pre>
                  </div>
                </div>
              )}

              <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-500" size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-red-500">Danger Zone</h3>
                </div>
                <p className="text-sm text-red-500/60 leading-relaxed">
                  Clearing all data will permanently delete your conversations, memories, and custom agents from both local and cloud storage.
                </p>
                <button 
                  onClick={onClearAllData}
                  className="w-full py-4 bg-red-500 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-red-600 transition-all"
                >
                  {t.clear}
                </button>
              </div>

              <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                  <RefreshCw className="text-emerald-400" size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">Maintenance</h3>
                </div>
                <p className="text-sm text-white/40 leading-relaxed">
                  Optimize your local storage by removing old messages while keeping the most recent ones.
                </p>
                <button 
                  onClick={onPruneMessages}
                  className="w-full py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white/10 transition-all"
                >
                  Prune Old Messages ({'>'}500)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                  <Cpu className="text-emerald-400" size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">System Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Version</p>
                    <p className="text-lg font-bold text-white">1.0.0-Stable</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Database Status</p>
                    <p className={`text-lg font-bold ${isDbReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isDbReady ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Environment</p>
                    <p className="text-lg font-bold text-white">Production</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Architecture</p>
                    <p className="text-lg font-bold text-white">PWA + Neon</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Node.js Version</p>
                    <p className="text-lg font-bold text-white">v20.x (LTS)</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Frontend Framework</p>
                    <p className="text-lg font-bold text-white">React 18 + Vite</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Styling</p>
                    <p className="text-lg font-bold text-white">Tailwind CSS v4</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">AI Provider</p>
                    <p className="text-lg font-bold text-white">Google Gemini</p>
                  </div>
                  <div className="col-span-2 pt-4 border-t border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Active Permissions</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { id: 'notifications', label: 'Notifications', icon: <Zap size={12} /> },
                        { id: 'geolocation', label: 'Location', icon: <Globe size={12} /> },
                        { id: 'persistent-storage', label: 'Storage', icon: <Database size={12} /> },
                        { id: 'camera', label: 'Camera', icon: <Layout size={12} /> }
                      ].map(perm => (
                        <div key={perm.id} className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                          <div className="text-emerald-400">{perm.icon}</div>
                          <span className="text-[10px] font-bold text-white/80">{perm.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bridge' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Mobile Bridge Section */}
              <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                  <RefreshCw className="text-emerald-400" size={24} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">Mobile Bridge Setup (Android)</h3>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">Connect your Android device to enable remote control, GPS tracking, and mobile automation.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">1. Requirements</h4>
                    <ul className="text-[10px] text-white/60 space-y-2 list-disc pl-4">
                      <li>Enable <b>Developer Options</b> on Android.</li>
                      <li>Turn on <b>USB Debugging</b>.</li>
                      <li>Install <b>Node.js</b> and <b>Git</b> on PC.</li>
                    </ul>
                  </div>
                  <div className="p-6 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">2. Download</h4>
                    <p className="text-[10px] text-white/60 leading-relaxed">Download the latest <b>Flix Ghost Bridge</b> APK or run the local bridge script.</p>
                    <button 
                      className="w-full py-2 bg-white/10 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-all"
                      onClick={() => window.open('https://github.com/flix-gosts/bridge/releases', '_blank')}
                    >
                      Download APK
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-black/40 border border-white/5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400">3. Local Bridge Command</h4>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText('npx @flix-gosts/bridge-cli start');
                        setCopied('bridge_cmd');
                        setTimeout(() => setCopied(null), 2000);
                      }}
                      className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-all"
                    >
                      {copied === 'bridge_cmd' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="p-4 bg-black rounded-xl border border-white/5">
                    <code className="text-[10px] font-mono text-blue-400">npx @flix-gosts/bridge-cli start</code>
                  </div>
                  <p className="text-[9px] text-white/40 italic">Run this command on your PC to bridge the connection between AI Studio and your local hardware.</p>
                </div>
              </div>

              {/* Telegram Messenger Section */}
              <div className="p-8 bg-zinc-900 border border-white/10 rounded-[2rem] space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <MessageSquare size={120} className="text-blue-500" />
                </div>
                
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <MessageSquare className="text-blue-400" size={20} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Ghost Messenger (Telegram)</h3>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">اربط حسابك بـ Telegram لتلقي التنبيهات والتحكم في وكلائك عن بُعد.</p>
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="p-6 bg-black/40 border border-white/5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Linking Token</h4>
                      <button 
                        onClick={async () => {
                          const token = await userService.getTelegramToken();
                          if (token) {
                            navigator.clipboard.writeText(`/start ${token}`);
                            setCopied('tg_token');
                            setTimeout(() => setCopied(null), 2000);
                          }
                        }}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center gap-2"
                      >
                        {copied === 'tg_token' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        {copied === 'tg_token' ? 'Copied!' : 'Copy Link Command'}
                      </button>
                    </div>
                    <p className="text-[10px] text-white/60 leading-relaxed">
                      انسخ الأمر أعلاه وأرسله إلى البوت <a href="https://t.me/Goost101_bot" target="_blank" className="text-blue-400 underline">@Goost101_bot</a> لربط حسابك.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-white/80">Proactive Alerts</h5>
                      <p className="text-[8px] text-white/40 leading-relaxed">تلقي إشعارات فورية عند اكتمال المهام أو حدوث أخطاء.</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-white/80">Remote Commands</h5>
                      <p className="text-[8px] text-white/40 leading-relaxed">تحكم في الوكلاء ونفذ الأوامر مباشرة من هاتفك.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
