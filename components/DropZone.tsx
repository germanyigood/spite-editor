
import React, { useCallback } from 'react';
import { Upload, Image as ImageIcon, FileArchive, Film } from 'lucide-react';

interface DropZoneProps {
  onFileReady: (file: File) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileReady }) => {
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

  // Global paste listener
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
      className="flex flex-col items-center justify-center w-full h-full min-h-[400px] border-2 border-dashed border-gray-700 rounded-xl bg-gray-900/50 hover:bg-gray-800/50 hover:border-blue-500 transition-all cursor-pointer group"
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
        <div className="w-20 h-20 mb-4 rounded-full bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Upload className="w-10 h-10 text-gray-400 group-hover:text-blue-400" />
        </div>
        <p className="mb-2 text-xl text-gray-300 font-semibold">
          Click to upload or drag & drop
        </p>
        <p className="mb-4 text-sm text-gray-500">
          or just press <span className="px-2 py-1 bg-gray-800 rounded text-gray-300 font-mono">Ctrl + V</span> anywhere
        </p>
        <div className="text-xs text-gray-600 flex items-center gap-4">
          <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Images</span>
          <span className="flex items-center gap-1"><Film className="w-4 h-4" /> Video</span>
          <span className="flex items-center gap-1"><FileArchive className="w-4 h-4" /> .sforge Projects</span>
        </div>
      </div>
      <input 
        id="dropzone-file" 
        type="file" 
        className="hidden" 
        // accept="image/*,.sforge,.zip,video/*"
        onChange={handleInputChange}
      />
      <label 
        htmlFor="dropzone-file" 
        className="absolute inset-0 cursor-pointer" 
      />
    </div>
  );
};

export default DropZone;
