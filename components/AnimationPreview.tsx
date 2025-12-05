
import React, { useEffect, useState, useRef } from 'react';
import { AnimationConfig } from '../types';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut } from 'lucide-react';

interface AnimationPreviewProps {
  frames: string[];
  config: AnimationConfig;
  setConfig: (cfg: AnimationConfig) => void;
}

const AnimationPreview: React.FC<AnimationPreviewProps> = ({ frames, config, setConfig }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [previewScale, setPreviewScale] = useState(1);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (config.isPlaying && frames.length > 0) {
      const interval = 1000 / config.fps;
      timerRef.current = window.setInterval(() => {
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= frames.length) {
            return config.loop ? 0 : prev;
          }
          return next;
        });
      }, interval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [config.isPlaying, config.fps, config.loop, frames.length]);

  // Reset frame if frames array changes drastically
  useEffect(() => {
    if (currentFrame >= frames.length) {
      setCurrentFrame(0);
    }
  }, [frames.length]);

  const togglePlay = () => setConfig({ ...config, isPlaying: !config.isPlaying });

  return (
    <div className="flex flex-col bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl w-full">
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-700 font-semibold text-sm text-gray-300 flex justify-between items-center shrink-0">
        <span>Preview</span>
        <div className="flex items-center gap-2">
             <button 
               onClick={() => setPreviewScale(s => Math.max(0.5, s - 0.25))} 
               className="p-1 hover:bg-gray-700 rounded text-gray-400" 
               title="Zoom Out"
             >
               <ZoomOut size={14} />
             </button>
             <span className="text-xs font-mono text-gray-500 w-10 text-center">{previewScale.toFixed(2)}x</span>
             <button 
               onClick={() => setPreviewScale(s => Math.min(5, s + 0.25))} 
               className="p-1 hover:bg-gray-700 rounded text-gray-400" 
               title="Zoom In"
             >
               <ZoomIn size={14} />
             </button>
        </div>
      </div>
      
      <div className="w-full bg-gray-950 checkerboard relative overflow-hidden flex items-center justify-center p-6 min-h-[300px]">
        {frames.length > 0 ? (
          <img 
            src={frames[currentFrame]} 
            alt={`Frame ${currentFrame}`} 
            className="pixelated transition-all duration-75"
            style={{ 
              imageRendering: 'pixelated',
              width: `${100 * previewScale}%`, 
              height: 'auto',
              maxWidth: 'none', 
              objectFit: 'contain'
            }}
          />
        ) : (
          <span className="text-gray-600 text-sm">No Frames</span>
        )}
      </div>

      <div className="p-4 bg-gray-900 border-t border-gray-700 space-y-4 shrink-0">
        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => setCurrentFrame(0)}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Reset"
          >
            <SkipBack size={18} />
          </button>
          
          <button 
            onClick={togglePlay}
            className={`p-3 rounded-full transition-colors ${config.isPlaying ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
          >
            {config.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>

          <button 
             onClick={() => setCurrentFrame(frames.length -1)}
             className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
             title="End"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* FPS Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Speed</span>
            <span>{config.fps} FPS</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="60" 
            value={config.fps} 
            onChange={(e) => setConfig({ ...config, fps: parseInt(e.target.value) })}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default AnimationPreview;
