
import React, { useCallback } from 'react';
import { Upload, Image as ImageIcon, FileArchive, Film, Sparkles } from 'lucide-react';

interface DropZoneProps {
  onFileReady: (file: File) => void;
  message?: React.ReactNode;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileReady, message }) => {
  const handleFile = useCallback((file: File) => {
    if (file) {
      onFileReady(file);
    }
  }, [onFileReady]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      handleFile(e.clipboardData.files[0]);
    }
  }, [handleFile]);

  React.useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div 
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className="relative flex flex-col items-center justify-center w-full h-full border border-border-base/10 rounded-3xl bg-panel/40 backdrop-blur-xl overflow-hidden group cursor-pointer transition-all hover:bg-panel/60 hover:border-indigo-500/30 hover:shadow-[0_0_50px_rgba(79,70,229,0.1)]"
    >
      {/* Input Logic: z-50 to ensure it catches clicks */}
      <input 
        id="dropzone-file" 
        type="file" 
        className="hidden" 
        onChange={handleInputChange}
      />
      <label 
        htmlFor="dropzone-file" 
        className="absolute inset-0 cursor-pointer z-50" 
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      />

      {/* Decorative background blurs */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] group-hover:bg-indigo-500/20 transition-all duration-700 pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-[100px] group-hover:bg-cyan-500/20 transition-all duration-700 pointer-events-none" />

      {/* Content - pointer events none so clicks pass through to label */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-5 pb-6 text-center px-8 pointer-events-none">
        <div className="w-24 h-24 mb-8 rounded-3xl bg-surface/50 border border-border-base/10 flex items-center justify-center group-hover:scale-110 group-hover:border-indigo-400/50 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all duration-300 backdrop-blur-md">
          <Upload className="w-10 h-10 text-txt-muted group-hover:text-indigo-400" />
        </div>
        
        <p className="mb-3 text-4xl text-transparent bg-clip-text bg-gradient-to-r from-txt-primary to-txt-secondary font-bold tracking-tight drop-shadow-sm">
          Drop Assets
        </p>
        
        <p className="mb-10 text-sm text-txt-secondary flex items-center gap-2">
          or click to browse <span className="px-2 py-0.5 bg-surface/50 border border-border-base/10 rounded text-txt-muted font-mono text-[10px] shadow-inner">Ctrl + V</span>
        </p>

        <div className="grid grid-cols-3 gap-4 text-xs text-txt-secondary mb-8 w-full max-w-sm">
          <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface/30 border border-border-base/5 group-hover:bg-surface/50 transition-colors">
            <ImageIcon className="w-6 h-6 text-cyan-400 opacity-80" /> 
            <span className="font-medium">Images</span>
          </div>
          <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface/30 border border-border-base/5 group-hover:bg-surface/50 transition-colors">
            <Film className="w-6 h-6 text-purple-400 opacity-80" /> 
            <span className="font-medium">Video</span>
          </div>
          <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface/30 border border-border-base/5 group-hover:bg-surface/50 transition-colors">
            <FileArchive className="w-6 h-6 text-indigo-400 opacity-80" /> 
            <span className="font-medium">Project</span>
          </div>
        </div>

        {message && (
          <div className="flex items-center justify-center gap-2 py-2 px-6 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-sm text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)] backdrop-blur-md font-medium">
            <Sparkles size={14} className="text-indigo-500"/>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default DropZone;
