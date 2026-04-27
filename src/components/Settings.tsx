import React from 'react';
import { Settings as SettingsIcon, Languages, Shield, Database } from 'lucide-react';

export const Settings = ({ user, lang, setLang, memoryOption, setMemoryOption }: any) => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon /> Settings</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <h3 className="font-semibold flex items-center gap-2"><Languages /> Language</h3>
          <select className="w-full p-2 bg-black/20 rounded" value={lang} onChange={e => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <h3 className="font-semibold flex items-center gap-2"><Database /> Storage</h3>
          <p className="text-sm text-white/50">Configure your local or cloud storage.</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <h3 className="font-semibold flex items-center gap-2"><Shield /> Security</h3>
          <p className="text-sm text-white/50">Manage your API keys and admin PIN.</p>
        </div>
      </div>
    </div>
  );
};
