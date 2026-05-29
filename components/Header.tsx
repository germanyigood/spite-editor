
import React, { useState } from 'react';
import { Layers, Crosshair, Trash2, MousePointer2, Move, PlusSquare, Workflow, Bug, Sun, Moon, Brush, Undo2, Redo2, LayoutTemplate, Film } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { getGraphLayers } from '../utils';
import { Frame } from '../types';
import { useActionHandler } from '../hotkeys';
import { ConfirmDialog, AlertDialog } from './common/DesignSystem';

interface HeaderProps {
    onOpenDebug?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenDebug }) => {
  const { state, dispatch, history } = useProject();
  const { theme, toggleTheme } = useTheme();
  const { projectName, activeAnimationId, activeLayerId, toolMode, animations } = state;
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const currentAnim = animations.find(a => a.id === activeAnimationId);
  const activePair = currentAnim ? getGraphLayers(currentAnim.nodeGraph).find(p => p.source.id === activeLayerId) : undefined;
  const activeConfig = activePair?.slice?.data;
  const showCrosshair = activeConfig?.showCrosshair || false;

  // Global Keyboard Shortcuts
  useActionHandler('global', 'core.undo', history.undo, [history.undo]);
  useActionHandler('global', 'core.redo', history.redo, [history.redo]);
  useActionHandler('global', 'tool.select', () => dispatch({ type: 'SET_TOOL_MODE', payload: 'select' }), [dispatch]);
  useActionHandler('global', 'tool.move', () => dispatch({ type: 'SET_TOOL_MODE', payload: 'move_layer' }), [dispatch]);
  useActionHandler('global', 'tool.nodes', () => dispatch({ type: 'SET_TOOL_MODE', payload: 'nodes' }), [dispatch]);
  useActionHandler('global', 'tool.draw', () => dispatch({ type: 'SET_TOOL_MODE', payload: 'draw' }), [dispatch]);
  useActionHandler('global', 'tool.layout', () => dispatch({ type: 'SET_TOOL_MODE', payload: 'layout' }), [dispatch]);

  const handleToggleCrosshair = () => {
      if (activeAnimationId && activeLayerId && activeConfig) {
          dispatch({
              type: 'UPDATE_LAYER',
              payload: { 
                  animId: activeAnimationId, 
                  layerId: activeLayerId, 
                  updates: { spriteConfig: { ...activeConfig, showCrosshair: !showCrosshair } },
                  resetTimeline: false
              }
          });
      }
  };

  const handleAddFrame = () => {
      if (!activeAnimationId || !activeLayerId || !activeConfig) {
          setAlertMessage("Please select a layer first to add frames.");
          return;
      }
      const newTotal = activeConfig.totalFrames + 1;
      const w = activeConfig.width || 64;
      const h = activeConfig.height || 64;
      
      const newFrame: Frame = {
          id: Date.now(),
          x: 0, y: 0, width: w, height: h,
          name: `Frame ${newTotal - 1}`
      };

      const newFrames = [...(activeConfig.frames || []), newFrame];

      dispatch({
          type: 'UPDATE_LAYER',
          payload: {
              animId: activeAnimationId,
              layerId: activeLayerId,
              updates: { spriteConfig: { ...activeConfig, totalFrames: newTotal, frames: newFrames } },
              resetTimeline: true
          }
      });
      
      dispatch({ type: 'SELECT_FRAME', payload: newFrames.length - 1 });
  };

  const confirmNewProject = () => {
      dispatch({ type: 'NEW_PROJECT' });
      setShowResetConfirm(false);
  };

  return (
    <>
        <ConfirmDialog 
            isOpen={showResetConfirm}
            onCancel={() => setShowResetConfirm(false)}
            onConfirm={confirmNewProject}
            title="Create New Project?"
            description="All unsaved changes will be lost. This action cannot be undone."
            confirmText="Create New"
            danger
        />

        <AlertDialog 
            isOpen={!!alertMessage}
            onClose={() => setAlertMessage(null)}
            title="Selection Required"
            message={alertMessage || ""}
        />

        <header className="h-14 bg-panel/40 backdrop-blur-2xl border-b border-border-base/10 flex items-center justify-between px-6 shrink-0 z-30 select-none shadow-sm relative transition-colors duration-300">
        
        {/* Left: Branding & Project Name */}
        <div className="flex items-center gap-6 w-1/3 relative z-10">
            <div className="flex items-center gap-3 group cursor-default">
                <div className="p-1.5 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-lg border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-500">
                    <Layers size={18} className="text-indigo-500 dark:text-indigo-300 group-hover:text-white transition-colors" />
                </div>
                <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-txt-primary to-txt-secondary tracking-tight">SpriteForge</span>
            </div>
            <div className="h-6 w-px bg-border-base/10" />
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={history.undo} 
                    disabled={!history.canUndo}
                    data-testid="btn-undo"
                    className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 size={16} />
                </button>
                <button 
                    onClick={history.redo} 
                    disabled={!history.canRedo}
                    data-testid="btn-redo"
                    className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 size={16} />
                </button>
            </div>

            <input 
                type="text" 
                value={projectName}
                onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
                className="bg-transparent text-txt-primary font-medium text-sm focus:bg-white/5 px-2 py-1 rounded-md border border-transparent focus:border-border-base/10 outline-none w-full max-w-[200px] transition-all hover:bg-white/5 placeholder-txt-muted focus:shadow-[0_0_20px_rgba(var(--c-border),0.05)]"
                placeholder="Project Name"
                data-testid="project-name-input"
            />
        </div>
        
        {/* Center: Toolbar */}
        <div className="flex-1 flex justify-center relative z-10">
            {activeAnimationId && (
                <div className="flex items-center bg-panel/40 backdrop-blur-md rounded-full p-1 border border-border-base/10 shadow-lg gap-1">
                    <button 
                    data-testid="tool-draw"
                    onClick={() => dispatch({ type: 'SET_TOOL_MODE', payload: 'draw' })}
                    className={`px-4 py-1.5 rounded-full text-xs flex items-center gap-2 transition-all font-semibold ${toolMode === 'draw' ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] ring-1 ring-white/20' : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover/5'}`}
                    title="Paint (B)"
                    >
                        <Brush size={14} /> <span>Draw</span>
                    </button>
                    <button 
                    data-testid="tool-select"
                    onClick={() => dispatch({ type: 'SET_TOOL_MODE', payload: 'select' })}
                    className={`px-4 py-1.5 rounded-full text-xs flex items-center gap-2 transition-all font-semibold ${toolMode === 'select' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] ring-1 ring-white/20' : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover/5'}`}
                    title="Select & Edit Frames (V)"
                    >
                        <MousePointer2 size={14} /> <span>Frames</span>
                    </button>
                    <button 
                    data-testid="tool-animation"
                    onClick={() => dispatch({ type: 'SET_TOOL_MODE', payload: 'animation' })}
                    className={`px-4 py-1.5 rounded-full text-xs flex items-center gap-2 transition-all font-semibold ${toolMode === 'animation' ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] ring-1 ring-white/20' : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover/5'}`}
                    title="Animation Frame Alignment"
                    >
                        <Film size={14} /> <span>Animation</span>
                    </button>
                    <button 
                    data-testid="tool-move"
                    onClick={() => dispatch({ type: 'SET_TOOL_MODE', payload: 'move_layer' })}
                    className={`px-4 py-1.5 rounded-full text-xs flex items-center gap-2 transition-all font-semibold ${toolMode === 'move_layer' ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] ring-1 ring-white/20' : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover/5'}`}
                    title="Move Layer (M)"
                    >
                        <Move size={14} /> <span>Move</span>
                    </button>
                    <div className="w-px h-4 bg-border-base/10 mx-1" />
                    <button 
                    data-testid="tool-layout"
                    onClick={() => dispatch({ type: 'SET_TOOL_MODE', payload: 'layout' })}
                    className={`px-4 py-1.5 rounded-full text-xs flex items-center gap-2 transition-all font-semibold ${toolMode === 'layout' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-1 ring-white/20' : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover/5'}`}
                    title="UI Layout Composer (L)"
                    >
                        <LayoutTemplate size={14} /> <span>Layout</span>
                    </button>
                    <div className="w-px h-4 bg-border-base/10 mx-1" />
                    <button 
                    data-testid="tool-nodes"
                    onClick={() => dispatch({ type: 'SET_TOOL_MODE', payload: 'nodes' })}
                    className={`px-4 py-1.5 rounded-full text-xs flex items-center gap-2 transition-all font-semibold ${toolMode === 'nodes' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] ring-1 ring-white/20' : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover/5'}`}
                    title="Node Editor Graph (N)"
                    >
                        <Workflow size={14} /> <span>Nodes</span>
                    </button>
                </div>
            )}
        </div>

        {/* Right: Global Actions */}
        <div className="flex items-center justify-end gap-3 w-1/3 relative z-10">
            {activeAnimationId && toolMode !== 'layout' && toolMode !== 'nodes' && (
                <>
                    <div className="flex items-center gap-1 bg-surface/20 rounded-lg p-0.5 border border-border-base/10 shadow-lg mr-2">
                        <button 
                        onClick={handleToggleCrosshair}
                        className={`p-1.5 rounded transition-all ${showCrosshair ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.15)] border border-cyan-500/20' : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover/5 border border-transparent'}`}
                        title="Toggle Center Crosshair"
                        >
                        <Crosshair size={16} />
                        </button>
                        <button 
                        onClick={handleAddFrame}
                        className="p-1.5 rounded transition-all text-txt-muted hover:text-txt-primary hover:bg-surface-hover/5 border border-transparent hover:border-border-base/5"
                        title="Add Empty Frame Slot to Current Layer"
                        >
                        <PlusSquare size={16} />
                        </button>
                    </div>
                </>
            )}
            
            <div className="h-6 w-px bg-border-base/10 mx-2" />
            
            {onOpenDebug && (
                <button 
                onClick={onOpenDebug}
                className="p-2 text-txt-muted hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
                title="System Diagnostics"
                >
                <Bug size={16} />
                </button>
            )}

            <button 
            onClick={toggleTheme}
            className="p-2 text-txt-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
            title="Toggle Theme"
            >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button 
            onClick={() => setShowResetConfirm(true)}
            className="p-2 text-txt-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            title="Clear Project"
            >
            <Trash2 size={16} />
            </button>
        </div>
        </header>
    </>
  );
};

export default Header;
