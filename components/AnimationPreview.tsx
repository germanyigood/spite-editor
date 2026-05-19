
import React, { useEffect, useState, useRef } from 'react';
import { AnimationEntry, NodePreviewData, ImageSource } from '../types';
import { Play, Pause, SkipBack, SkipForward, PaintBucket } from 'lucide-react';
import { BitmapView } from './common/BitmapView';

interface AnimationPreviewProps {
  currentAnim: AnimationEntry;
  timelineSettings: {
    fps: number;
    loop: boolean;
    isPlaying: boolean;
    currentFrame: number;
  };
  onUpdateTimeline: (updates: { isPlaying?: boolean, fps?: number, currentFrame?: number }) => void;
  previewData?: NodePreviewData | null;
}

const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  timelineSettings,
  previewData,
  onUpdateTimeline
}) => {
  const { isPlaying, fps, loop, currentFrame } = timelineSettings;

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [bgColor, setBgColor] = useState<string>('transparent');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      setCurrentFrameIndex(currentFrame);
    }
  }, [isPlaying, currentFrame]);

  const activeFrameCount = (previewData?.type === 'animation' && Array.isArray(previewData.data))
    ? (previewData.data as ImageSource[]).length
    : 0;

  useEffect(() => {
    if (isPlaying && activeFrameCount > 0) {
      const interval = 1000 / fps;
      timerRef.current = window.setInterval(() => {
        setCurrentFrameIndex((prev) => {
          const next = prev + 1;
          if (next >= activeFrameCount) return loop ? 0 : prev;
          return next;
        });
      }, interval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, fps, loop, activeFrameCount]);

  useEffect(() => {
    if (currentFrameIndex >= activeFrameCount && activeFrameCount > 0) setCurrentFrameIndex(0);
  }, [activeFrameCount]);

  const togglePlay = () => onUpdateTimeline({ isPlaying: !isPlaying });


  const renderContent = () => {
    if (previewData) {
      let src: ImageSource | undefined;

      if (previewData.type === 'animation' && Array.isArray(previewData.data)) {
        src = previewData.data[currentFrameIndex];
      } else if (previewData.type === 'static' && !Array.isArray(previewData.data)) {
        src = previewData.data;
      }

      if (!src) return <span className="text-txt-muted text-sm font-medium mix-blend-difference">Empty Output</span>;

      return (
        <BitmapView
          image={src}
          className="pixelated block pointer-events-none select-none w-full h-full"
          mode="contain"
        />
      );
    }
    return <span className="text-txt-muted text-sm font-medium mix-blend-difference">No Signal</span>;
  };

  const bgStyle = bgColor === 'transparent' ? {} : { backgroundColor: bgColor };

  return (
    <div className="flex flex-col bg-panel/40 backdrop-blur-md rounded-2xl border border-border-base/10 overflow-hidden shadow-xl w-full ring-1 ring-black/5 dark:ring-black/20 relative">

      <div className="absolute top-2 right-2 z-10 flex items-center bg-black/60 backdrop-blur-md rounded border border-white/10 overflow-hidden">
          <button 
              onClick={() => setBgColor('transparent')}
              className={`w-6 h-6 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors ${bgColor === 'transparent' ? 'bg-white/20' : ''}`}
              title="Transparent Background"
          >
              <div className="w-3.5 h-3.5 checkerboard rounded-sm border border-white/30" />
          </button>
          <div className="relative w-6 h-6 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors cursor-pointer" title="Solid Color Background">
              <PaintBucket size={14} />
              <input 
                  type="color" 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                  value={bgColor === 'transparent' ? '#000000' : bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
              />
          </div>
      </div>

      <div
        className={`w-full relative overflow-hidden flex items-center justify-center h-[280px] shadow-inner ${bgColor === 'transparent' ? 'bg-black/5 dark:bg-black/40 checkerboard' : ''}`}
        style={bgStyle}
      >
        <div className="w-full h-full flex items-center justify-center">
          {renderContent()}
        </div>
      </div>

      <div className="p-4 bg-surface/30 border-t border-border-base/5 space-y-3 shrink-0 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-8">
          <button onClick={() => onUpdateTimeline({ currentFrame: 0 })} className="p-2 hover:bg-surface rounded-xl text-txt-muted hover:text-txt-primary transition-colors"><SkipBack size={18} /></button>
          <button onClick={togglePlay} className={`p-3 rounded-full transition-all shadow-lg ${isPlaying ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 ring-1 ring-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30 ring-1 ring-green-500/30 shadow-[0_0_15px_rgba(74,222,128,0.2)]'}`}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button onClick={() => onUpdateTimeline({ currentFrame: activeFrameCount - 1 })} className="p-2 hover:bg-surface rounded-xl text-txt-muted hover:text-txt-primary transition-colors"><SkipForward size={18} /></button>
        </div>
        <div className="flex items-center gap-3 bg-surface/50 p-2 rounded-xl border border-border-base/10">
          <span className="text-[9px] text-txt-muted font-bold uppercase w-10 text-center">Speed</span>
          <input type="range" min="1" max="60" value={fps} onChange={(e) => onUpdateTimeline({ fps: parseInt(e.target.value) })} className="flex-1 h-1 bg-surface-hover/20 rounded-full appearance-none accent-indigo-500" />
          <span className="text-[10px] text-indigo-400 font-mono w-10 text-center font-bold">{fps} FPS</span>
        </div>
      </div>
    </div>
  );
};

export default AnimationPreview;
