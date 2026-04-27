import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  X, 
  Maximize2, 
  Minimize2, 
  ChevronRight, 
  Command, 
  Cpu, 
  Activity, 
  Wifi, 
  Shield, 
  Zap, 
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TerminalLine } from '../types';

interface TerminalProps {
  onBack: () => void;
  lines: TerminalLine[];
  onCommand: (cmd: string) => void;
  onClear: () => void;
  t: any;
}

export const Terminal: React.FC<TerminalProps> = ({ onBack, lines, onCommand, onClear, t }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input);
    setHistory([input, ...history]);
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = historyIndex + 1;
      if (nextIdx < history.length) {
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = historyIndex - 1;
      if (nextIdx >= 0) {
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-black h-full overflow-hidden font-mono">
      {/* Header */}
      <header className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={16} className="text-white/60" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <TerminalIcon className="text-amber-400" size={16} />
            </div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white">{t.terminal}</h2>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/60">Core Access</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClear}
            className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
            title={t.clear}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* Terminal Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 text-[10px] leading-relaxed scroll-smooth bg-black/90"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="space-y-2 mb-4">
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
            <pre className="text-amber-400 font-mono text-[8px] leading-tight">
{`   _____ _ _             _____           _       
  |   __| |_|_ _ _ _ _ _|   __|___ ___ _| |_ ___ 
  |   __| | | |_'_| | | |  |  | . |_ -| . |  _|_ -|
  |__|  |_|_|_|_,_|_  |_|_____|___|___|___|_| |___|
                  |___|                            `}
            </pre>
            <p className="mt-1 text-amber-400/60 text-[8px] uppercase tracking-widest font-black">
              {t.terminalWelcome}
            </p>
          </div>
        </div>

        {lines.map((line, idx) => (
          <div key={idx} className="flex gap-2">
            <span className="text-white/20 shrink-0">[{isNaN(new Date(line.timestamp).getTime()) ? "00:00:00" : new Date(line.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
            <span className={`
              ${line.type === 'system' ? 'text-amber-400 font-black uppercase' : ''}
              ${line.type === 'error' ? 'text-red-400' : ''}
              ${line.type === 'success' ? 'text-emerald-400' : ''}
              ${line.type === 'input' ? 'text-white/60' : 'text-white/90'}
              whitespace-pre-wrap break-all
            `}>
              {line.type === 'input' ? '> ' : ''}
              {typeof line.text === 'string' ? line.text : JSON.stringify(line.text, null, 2)}
            </span>
          </div>
        ))}

        {/* Input Line */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
          <span className="text-white/20 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-amber-400 font-black">{'>'}</span>
            <input 
              ref={inputRef}
              autoFocus
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-white/90 caret-amber-400"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </form>
      </div>

      {/* Footer Status */}
      <div className="h-6 border-t border-white/10 bg-zinc-900 flex items-center justify-between px-4 text-[8px] font-black uppercase tracking-widest text-white/40">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Cpu size={8} /> CPU: 12%</span>
          <span className="flex items-center gap-1"><Activity size={8} /> RAM: 2.4GB</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-500"><Wifi size={8} /> {t.online}</span>
          <span className="flex items-center gap-1 text-amber-500"><Shield size={8} /> SECURE</span>
        </div>
      </div>
    </div>
  );
};
