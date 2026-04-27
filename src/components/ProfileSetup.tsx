import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Sparkles, Camera, ArrowRight, Loader2 } from 'lucide-react';
import { userService } from '../services/user';

interface ProfileSetupProps {
  onComplete: () => void;
  t: any;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete, t }) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      // Default avatar if none provided
      const finalAvatar = avatarUrl.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
      await userService.updateProfile({
        name: name.trim(),
        avatar_url: finalAvatar
      });
      onComplete();
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
      >
        <div className="space-y-8 relative z-10">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="text-emerald-400" size={40} />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Initialize Profile</h1>
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Set your identity in the Flix Gosts network</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Display Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Avatar URL (Optional)</label>
              <div className="relative">
                <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                <input 
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
              <p className="text-[10px] text-white/20 italic ml-2">Leave blank for a generated avatar</p>
            </div>

            <button 
              type="submit"
              disabled={!name.trim() || isLoading}
              className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-500 hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black transition-all flex items-center justify-center gap-3 group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Complete Setup
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
      </motion.div>
    </div>
  );
};
