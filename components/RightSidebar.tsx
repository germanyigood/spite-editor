import React from 'react';
import AnimationPreview from './AnimationPreview';
import { Info } from 'lucide-react';
import { AnimationConfig, AnimationEntry } from '../types';

interface RightSidebarProps {
  width: number;
  currentAnim: AnimationEntry | undefined;
  playableFrames: string[];
  onUpdateAnimConfig: (cfg: AnimationConfig) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ width, currentAnim, playableFrames, onUpdateAnimConfig }) => {
  return (
    <aside className="bg-gray-900 p-4 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar z-10" style={{ width }}>
        <h3 className="text-gray-400 text-sm uppercase tracking-wider font-bold mb-2">Animation Preview</h3>
        {currentAnim ? (
            <AnimationPreview 
                frames={playableFrames}
                config={currentAnim.animConfig}
                setConfig={onUpdateAnimConfig}
            />
        ) : <div className="text-gray-500 text-sm">No animation selected</div>}
        
        <div className="bg-blue-900/20 border border-blue-900/50 p-3 rounded-lg flex gap-3 items-start">
            <Info className="text-blue-400 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-blue-200 space-y-1">
            <p><strong>Click Frame body</strong> to select & edit.</p>
            <p><strong>Eye Icon</strong> includes/excludes frame.</p>
            <p><strong>Move Layer</strong> tool to position images.</p>
            <p><strong>Drag frames</strong> into Timeline below.</p>
            </div>
        </div>
    </aside>
  );
};

export default RightSidebar;
