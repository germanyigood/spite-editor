import React from 'react';
import { Layers, Crosshair, Trash2, MousePointer2, Move } from 'lucide-react';
import { SpriteConfig } from '../types';

interface HeaderProps {
  currentAnimId: string | undefined;
  showCrosshair: boolean;
  onToggleCrosshair: () => void;
  onNewProject: () => void;
  toolMode: 'select' | 'move_layer';
  onToolModeChange: (mode: 'select' | 'move_layer') => void;
}

const Header: React.FC<HeaderProps> = ({
  currentAnimId,
  showCrosshair,
  onToggleCrosshair,
  onNewProject,
  toolMode,
  onToolModeChange
}) => {
  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center gap-2">
         <Layers className="text-blue-500" />
         <span className="font-bold text-lg text-gray-100">SpriteForge</span>
      </div>
      
      {/* Tool Switcher */}
      {currentAnimId && (
          <div className="flex items-center gap-1 bg-gray-800 rounded p-1">
               <button 
                 onClick={() => onToolModeChange('select')}
                 className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${toolMode === 'select' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                 title="Select & Edit Frames"
               >
                  <MousePointer2 size={14} /> Frame Edit
               </button>
               <button 
                 onClick={() => onToolModeChange('move_layer')}
                 className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${toolMode === 'move_layer' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                 title="Move Source Images"
               >
                  <Move size={14} /> Move Layer
               </button>
          </div>
      )}

      <div className="flex items-center gap-4">
        <button 
           onClick={onToggleCrosshair}
           className={`p-2 rounded hover:bg-gray-800 transition-colors ${showCrosshair ? 'text-cyan-400' : 'text-gray-500'}`}
           title="Toggle Crosshairs"
        >
          <Crosshair size={20} />
        </button>
        <button 
           onClick={onNewProject}
           className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 size={16} /> New Project
        </button>
      </div>
    </header>
  );
};

export default Header;
