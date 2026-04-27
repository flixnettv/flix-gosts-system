import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Activity, 
  Shield, 
  Trash2,
  Cpu,
  Wifi,
  ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { TerminalLine } from '../types';

interface TerminalInterfaceProps {
  onBack?: () => void;
  lines?: TerminalLine[];
  onCommand?: (cmd: string) => void;
  onClear?: () => void;
  title?: string;
  subtitle?: string;
}

export const TerminalInterface: React.FC<TerminalInterfaceProps> = ({ 
  onBack, 
  lines: propLines, 
  onCommand,
  onClear,
  title = "Phantom Terminal",
  subtitle = "Secure Core Access"
}) => {
  const [internalLines, setInternalLines] = useState<TerminalLine[]>([]);
  const lines = propLines || internalLines;
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

  const addLine = (text: string, type: TerminalLine['type'] = 'system') => {
    if (onCommand) {
      // If controlled, we assume the parent handles adding lines
      // but for internal commands like 'help' we might still want to add them
      // Actually, if it's controlled, we should probably let the parent handle everything
    } else {
      setInternalLines(prev => [...prev, { text, type, timestamp: Date.now() }]);
    }
  };

  const handleInternalCommand = (cmd: string) => {
    const args = cmd.trim().split(/\s+/);
    const command = args[0].toLowerCase();

    if (command === 'clear' && onClear) {
      onClear();
      return;
    }

    if (onCommand) {
      onCommand(cmd);
      return;
    }

    switch (command) {
      case 'help':
        addLine("Available commands: help, clear, status, ls, whoami, echo [text]", 'system');
        break;
      case 'clear':
        setInternalLines([]);
        break;
      case 'status':
        addLine("System: ONLINE", 'success');
        addLine("Encryption: AES-256 ACTIVE", 'system');
        addLine("Uptime: 142:12:04", 'system');
        break;
      case 'ls':
        addLine("drwxr-xr-x  ghost_core", 'system');
        addLine("drwxr-xr-x  goblin_bridge", 'system');
        addLine("-rw-r--r--  system.log", 'system');
        addLine("-rw-r--r--  config.json", 'system');
        break;
      case 'whoami':
        addLine("root@ghost-goblin", 'success');
        break;
      case 'echo':
        addLine(args.slice(1).join(' ') || " ", 'system');
        break;
      default:
        addLine(`Command not found: ${command}`, 'error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (!onCommand) {
      // Add input line locally if uncontrolled
      setInternalLines(prev => [...prev, { text: trimmedInput, type: 'input', timestamp: Date.now() }]);
    }
    
    // Handle command
    handleInternalCommand(trimmedInput);
    
    // Update history
    setHistory(prev => [trimmedInput, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] h-full overflow-hidden font-mono text-white selection:bg-amber-500/30">
      {/* Header - Hardware feel */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#111] relative overflow-hidden">
        {/* Subtle scanline effect on header */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
        
        <div className="flex items-center gap-4 relative z-10">
          {onBack && (
            <button 
              onClick={onBack}
              className="group p-2 hover:bg-white/5 rounded-lg transition-all border border-transparent hover:border-white/10"
            >
              <ArrowLeft size={18} className="text-white/40 group-hover:text-white transition-colors" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <TerminalIcon className="text-amber-500" size={20} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">{title}</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500/50">{subtitle}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-white/5 border border-white/5 rounded-full">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-black text-white/40 tracking-widest">ENCRYPTED</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-white/40 tracking-widest">NODE: 0x7F...2A</span>
            </div>
          </div>
          <button 
            onClick={() => {
              if (onClear) onClear();
              else setInternalLines([]);
            }}
            className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
            title="Clear Terminal"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-2 text-[11px] leading-relaxed scroll-smooth relative group"
        onClick={() => inputRef.current?.focus()}
      >
        {/* CRT Overlay Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50" />
        
        {/* Welcome Message */}
        <div className="mb-8 opacity-80">
          <pre className="text-amber-500/80 font-mono text-[7px] md:text-[9px] leading-[1.1] mb-4">
{` ██████╗ ██╗  ██╗ █████╗ ███╗   ██╗████████╗ ██████╗ ███╗   ███╗
██╔════╝ ██║  ██║██╔══██╗████╗  ██║╚══██╔══╝██╔═══██╗████╗ ████║
██║  ███╗███████║███████║██╔██╗ ██║   ██║   ██║   ██║██╔████╔██║
██║   ██║██╔══██║██╔══██║██║╚██╗██║   ██║   ██║   ██║██║╚██╔╝██║
╚██████╔╝██║  ██║██║  ██║██║ ╚████║   ██║   ╚██████╔╝██║ ╚═╝ ██║
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝`}
          </pre>
          <div className="flex items-center gap-3 text-amber-500/40 text-[9px] font-black uppercase tracking-[0.3em]">
            <span>System v4.2.0</span>
            <span className="w-1 h-1 bg-white/10 rounded-full" />
            <span>Kernel: Ghost-OS</span>
            <span className="w-1 h-1 bg-white/10 rounded-full" />
            <span>Auth: Verified</span>
          </div>
        </div>

        {/* Lines */}
        <div className="space-y-1">
          {lines.map((line, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              key={idx} 
              className="flex gap-3 group/line"
            >
              <span className="text-white/10 shrink-0 font-mono select-none">
                {new Date(line.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <div className="flex-1 flex gap-2">
                {line.type === 'input' && <span className="text-amber-500 font-black select-none">{'>'}</span>}
                <span className={`
                  ${line.type === 'system' ? 'text-blue-400/90' : ''}
                  ${line.type === 'error' ? 'text-red-400 bg-red-400/10 px-1 rounded' : ''}
                  ${line.type === 'success' ? 'text-emerald-400' : ''}
                  ${line.type === 'input' ? 'text-white/90 font-bold' : 'text-white/70'}
                  whitespace-pre-wrap break-all
                `}>
                  {line.text}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input Line */}
        <form onSubmit={handleSubmit} className="flex gap-3 pt-2 relative z-10">
          <span className="text-white/10 shrink-0 font-mono select-none">
            {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-amber-500 font-black animate-pulse select-none">{'>'}</span>
            <input 
              ref={inputRef}
              autoFocus
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-white font-bold caret-amber-500 placeholder:text-white/5"
              spellCheck={false}
              autoComplete="off"
              placeholder="Enter command..."
            />
          </div>
        </form>
      </div>

      {/* Footer - Status Bar */}
      <footer className="h-8 border-t border-white/5 bg-[#0d0d0d] flex items-center justify-between px-6 text-[9px] font-black uppercase tracking-[0.15em] text-white/30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Cpu size={10} className="text-blue-500/50" />
            <span>Load: <span className="text-white/60">14%</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={10} className="text-emerald-500/50" />
            <span>Memory: <span className="text-white/60">512MB / 2GB</span></span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Wifi size={10} className="text-emerald-500" />
            <span className="text-emerald-500/80">Link Stable</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={10} className="text-amber-500" />
            <span className="text-amber-500/80">Firewall Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
