import React, { useState, useEffect } from 'react';
import { Lock, Shield, Zap, Skull, Terminal, Cpu, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LockScreenProps {
  onUnlock: () => void;
  lang: 'en' | 'ar';
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, lang }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const CORRECT_PIN = '135790';

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    if (pin.length === 6) {
      setIsChecking(true);
      setTimeout(() => {
        if (pin === CORRECT_PIN) {
          onUnlock();
        } else {
          setError(true);
          setPin('');
          setIsChecking(false);
          // Haptic feedback simulation
          if ('vibrate' in navigator) navigator.vibrate(200);
        }
      }, 600);
    }
  }, [pin, onUnlock]);

  const t = {
    en: {
      title: 'System Locked',
      subtitle: 'Ghost & Goblin Secure Access',
      prompt: 'Enter Admin PIN',
      error: 'Invalid Access Code',
      checking: 'Verifying Identity...',
      footer: 'Encrypted Session • Stealth Mode Active'
    },
    ar: {
      title: 'النظام مغلق',
      subtitle: 'وصول آمن لـ Ghost & Goblin',
      prompt: 'أدخل رمز المسؤول',
      error: 'رمز الدخول غير صحيح',
      checking: 'جاري التحقق من الهوية...',
      footer: 'جلسة مشفرة • وضع التخفي نشط'
    }
  }[lang];

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-sans overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm px-6 space-y-10 text-center"
      >
        {/* Logo Section */}
        <div className="space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <motion.div 
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-emerald-500/20 rounded-3xl"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Skull className="text-emerald-500" size={32} />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white">{t.title}</h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">{t.subtitle}</p>
          </div>
        </div>

        {/* PIN Display */}
        <div className="space-y-6">
          <div className="flex justify-center gap-3">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={error ? { x: [0, -5, 5, -5, 5, 0] } : {}}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                  i < pin.length 
                    ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                    : 'border-white/10 bg-transparent'
                } ${error ? 'border-red-500 bg-red-500/20' : ''}`}
              />
            ))}
          </div>
          
          <AnimatePresence mode="wait">
            <motion.p 
              key={error ? 'error' : isChecking ? 'checking' : 'prompt'}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`text-[10px] font-black uppercase tracking-widest ${
                error ? 'text-red-500' : isChecking ? 'text-emerald-400 animate-pulse' : 'text-white/40'
              }`}
            >
              {error ? t.error : isChecking ? t.checking : t.prompt}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handlePinInput(num.toString())}
              disabled={isChecking}
              className="h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-xl font-bold hover:bg-white/10 active:scale-95 transition-all text-white/80"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handlePinInput('0')}
            disabled={isChecking}
            className="h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-xl font-bold hover:bg-white/10 active:scale-95 transition-all text-white/80"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={isChecking}
            className="h-16 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors"
          >
            <Lock size={20} />
          </button>
        </div>

        {/* Footer */}
        <div className="pt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 text-[8px] font-black uppercase tracking-widest text-white/20">
            <span className="flex items-center gap-1"><Shield size={10} /> Secure</span>
            <span className="flex items-center gap-1"><Zap size={10} /> Encrypted</span>
            <span className="flex items-center gap-1"><Terminal size={10} /> Stealth</span>
          </div>
          <p className="text-[8px] font-bold text-white/10 uppercase tracking-[0.2em]">{t.footer}</p>
        </div>
      </motion.div>

      {/* Status Bar Simulation */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
        <motion.div 
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-1/3 h-full bg-emerald-500/20"
        />
      </div>
    </div>
  );
};
