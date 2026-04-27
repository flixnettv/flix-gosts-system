import React, { useState, useEffect } from 'react';
import { Folder, File, Plus, Save, X, RefreshCw, AlertCircle, ExternalLink, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { localFileService, LocalFile } from '../services/localFiles';
import { motion, AnimatePresence } from 'motion/react';

interface LocalFileExplorerProps {
  onBack: () => void;
  t: any;
}

export const LocalFileExplorer: React.FC<LocalFileExplorerProps> = ({ onBack, t }) => {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<LocalFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const handleRequestAccess = async () => {
    setIsLoading(true);
    setError(null);
    const result = await localFileService.requestAccess();
    if (result.success) {
      setIsAccessGranted(true);
      setFiles(localFileService.getFiles());
    } else {
      setError(result.error || 'UNKNOWN_ERROR');
    }
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await localFileService.scan();
    setFiles(localFileService.getFiles());
    setIsLoading(false);
  };

  const handleFileSelect = async (file: LocalFile) => {
    if (file.kind === 'directory') {
      const newExpanded = new Set(expandedDirs);
      if (newExpanded.has(file.path)) {
        newExpanded.delete(file.path);
      } else {
        newExpanded.add(file.path);
      }
      setExpandedDirs(newExpanded);
      return;
    }

    setIsLoading(true);
    const content = await localFileService.readFile(file.path);
    if (content !== null) {
      setSelectedFile(file);
      setFileContent(content);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    const success = await localFileService.writeFile(selectedFile.path, fileContent);
    if (success) {
      // Show success toast or feedback
    } else {
      setError('WRITE_ERROR');
    }
    setIsSaving(false);
  };

  const renderFileTree = (path: string = '') => {
    const currentFiles = files.filter(f => {
      const parentPath = f.path.substring(0, f.path.lastIndexOf('/'));
      return parentPath === path || (path === '' && !f.path.includes('/'));
    });

    return (
      <div className="space-y-1 ml-4">
        {currentFiles.sort((a, b) => (a.kind === 'directory' ? -1 : 1)).map(file => (
          <div key={file.path}>
            <button
              onClick={() => handleFileSelect(file)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left ${
                selectedFile?.path === file.path ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/5 text-white/60'
              }`}
            >
              {file.kind === 'directory' ? (
                expandedDirs.has(file.path) ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              ) : (
                <div className="w-[14px]" />
              )}
              {file.kind === 'directory' ? <Folder size={16} className="text-emerald-500" /> : <File size={16} className="text-white/40" />}
              <span className="text-sm truncate">{file.name}</span>
            </button>
            {file.kind === 'directory' && expandedDirs.has(file.path) && renderFileTree(file.path)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black text-white font-sans">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-all">
            <X size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Local File Bridge</h2>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Direct System Access</p>
          </div>
        </div>
        {isAccessGranted && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-white/5 rounded-xl transition-all text-emerald-400 disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!isAccessGranted ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-8">
              <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/10">
                <Folder className="text-emerald-500" size={40} />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black uppercase tracking-tighter">Connect Workspace</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Bridge your local file system with the Ghost & Goblin platform. Select a directory to grant read/write access.
                </p>
              </div>

              {error === 'IFRAME_RESTRICTION' ? (
                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3 text-amber-400">
                    <AlertCircle size={20} />
                    <span className="font-black uppercase tracking-tight">Iframe Restriction</span>
                  </div>
                  <p className="text-xs text-white/60">
                    The File System Access API is restricted within iframes for security. Please open the application in a new tab to use this feature.
                  </p>
                  <button 
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full py-3 bg-white text-black font-black uppercase rounded-xl flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} /> Open in New Tab
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleRequestAccess}
                  disabled={isLoading}
                  className="w-full py-4 bg-emerald-500 text-black font-black uppercase rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Requesting Access...' : 'Select Directory'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Sidebar Explorer */}
            <div className="w-72 border-r border-white/10 flex flex-col bg-zinc-950/30">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Explorer</span>
                <button className="p-1.5 hover:bg-white/5 rounded-lg text-emerald-400">
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {renderFileTree()}
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-black">
              {selectedFile ? (
                <>
                  <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/50">
                    <div className="flex items-center gap-3">
                      <File size={16} className="text-emerald-400" />
                      <span className="text-sm font-bold text-white/80">{selectedFile.path}</span>
                    </div>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black font-black text-xs uppercase rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Changes
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="absolute inset-0 w-full h-full p-6 bg-transparent text-white/80 font-mono text-sm resize-none focus:outline-none custom-scrollbar"
                      spellCheck={false}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div className="space-y-4 opacity-20">
                    <File size={48} className="mx-auto" />
                    <p className="text-sm font-black uppercase tracking-widest">Select a file to edit</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
