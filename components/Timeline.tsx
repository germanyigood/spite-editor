
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Copy, Play, Pause, ZoomIn, Search, GripHorizontal, ChevronDown, Film } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { TimelineNode, Frame, ImageSource, NodePayload } from '../types';
import { BitmapView } from './common/BitmapView';
import { ContextMenu, ContextMenuConfig } from './common/design-system/ContextMenu';

interface TimelineProps {
  generatedFrames: ImageSource[];
  nodeOutputs: Record<string, NodePayload | null>;
}

// Optimized Frame Component
const TimelineFrameItem = React.memo(({ 
    imgSrc, index, width, height, isActive, isDragging, isDropTarget, isDragSource, 
    onDragStart, onDragOver, onDrop, onMouseDown, onContextMenu 
}: any) => {
    return (
        <div
            data-testid={`timeline-frame-item-${index}`}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDrop}
            onMouseDown={(e) => onMouseDown(index)}
            onContextMenu={(e) => onContextMenu(e, index)}
            className={`
                flex-shrink-0 relative rounded-md border overflow-hidden group cursor-pointer transition-all duration-75 select-none
                ${isActive 
                    ? 'ring-2 ring-indigo-500 z-10 border-indigo-500/50' 
                    : 'border-border-base/10 hover:bg-surface-hover/5 hover:border-border-base/30'
                }
                ${isDragging ? 'opacity-20' : 'opacity-100'}
            `}
            style={{ 
                width: width - 2, 
                height: height,
                marginRight: 2,
                transform: isDropTarget ? (isDragSource < index ? 'translateX(-10px)' : 'translateX(10px)') : 'none'
            }}
        >
            {/* Drop Indicator */}
            {isDropTarget && (
                <div className={`absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-50 ${isDragSource < index ? '-right-1.5' : '-left-1.5'}`} />
            )}

            <div className="w-full h-full flex items-center justify-center pointer-events-none bg-black/5 dark:bg-black/20">
                {imgSrc ? (
                    <BitmapView image={imgSrc} mode="contain" className="w-full h-full p-1 opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <span className="text-[8px] text-red-500 font-bold">ERR</span>
                )}
            </div>
            
            {/* Index Label (Hide if too small) */}
            {width > 24 && (
                <div className="absolute top-0 left-0 bg-panel/80 text-[9px] text-txt-secondary px-1.5 backdrop-blur-sm rounded-br border-r border-b border-border-base/10 font-mono">
                    {index}
                </div>
            )}
        </div>
    );
}, (prev, next) => {
    return (
        prev.imgSrc === next.imgSrc &&
        prev.index === next.index &&
        prev.width === next.width &&
        prev.height === next.height && 
        prev.isActive === next.isActive &&
        prev.isDragging === next.isDragging &&
        prev.isDropTarget === next.isDropTarget &&
        prev.isDragSource === next.isDragSource
    );
});

const Timeline: React.FC<TimelineProps> = ({ generatedFrames, nodeOutputs }) => {
  const { state, dispatch } = useProject();
  const { animations, activeAnimationId, selectedTimelineIndex, selectedNodeId } = state;
  const currentAnim = animations.find(a => a.id === activeAnimationId);
  
  // --- NODE SELECTION LOGIC ---
  // Find all timeline nodes
  const allTimelineNodes = useMemo(() => {
      return (currentAnim?.nodeGraph.nodes.filter(n => n.type === 'timeline') as TimelineNode[]) || [];
  }, [currentAnim?.nodeGraph.nodes]);

  // Determine active timeline node:
  // 1. If user selected a timeline node in graph, use that.
  // 2. Else use local state selection.
  // 3. Else default to first available.
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);

  const activeTimelineNode = useMemo(() => {
      // Priority 1: Global Graph Selection
      const globalSelection = allTimelineNodes.find(n => n.id === selectedNodeId);
      if (globalSelection) return globalSelection;

      // Priority 2: Local Selection (if valid)
      const localSelection = allTimelineNodes.find(n => n.id === localActiveId);
      if (localSelection) return localSelection;

      // Priority 3: First available
      return allTimelineNodes[0];
  }, [allTimelineNodes, selectedNodeId, localActiveId]);

  // Sync local state when active changes to keep UI consistent
  useEffect(() => {
      if (activeTimelineNode && activeTimelineNode.id !== localActiveId) {
          setLocalActiveId(activeTimelineNode.id);
      }
  }, [activeTimelineNode?.id]);

  const frames = activeTimelineNode?.data.frames || [];
  
  // State
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const [contextMenuConfig, setContextMenuConfig] = useState<ContextMenuConfig | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  // Visual Config
  const [frameWidth, setFrameWidth] = useState(48);
  const [trackHeight, setTrackHeight] = useState(64);
  
  const MIN_ZOOM = 16;
  const MAX_ZOOM = 300;
  const MIN_HEIGHT = 32;
  const MAX_HEIGHT = 160;

  // Drag State
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Current Logic Frame
  const currentFrameIndex = activeTimelineNode?.data.currentFrame ?? 0;

  // --- Core Update Logic ---
  const updateTimeline = useCallback((updates: Partial<TimelineNode['data']>) => {
      if(currentAnim && activeTimelineNode) {
          dispatch({ 
              type: 'UPDATE_NODE_DATA', 
              payload: { animId: currentAnim.id, nodeId: activeTimelineNode.id, data: updates } 
          });
      }
  }, [currentAnim, activeTimelineNode, dispatch]);

  const handleSeek = useCallback((frameIndex: number) => {
      const idx = Math.max(0, Math.min(frameIndex, frames.length - 1));
      
      // Update Global Selection (UI Highlight)
      if (idx !== selectedTimelineIndex) {
          dispatch({ type: 'SELECT_TIMELINE_FRAME', payload: idx });
      }

      // Live Update: Only dispatch if frame index CHANGED
      if (idx !== activeTimelineNode?.data.currentFrame) {
          updateTimeline({ currentFrame: idx });
      }
  }, [frames.length, activeTimelineNode?.data.currentFrame, selectedTimelineIndex, dispatch, updateTimeline]);

  // --- Ruler / Scrubber Logic ---

  const handleRulerMouseDown = (e: React.MouseEvent) => {
      setIsScrubbing(true);
      handleScrub(e); // Instant seek on click
  };

  const handleScrub = useCallback((e: React.MouseEvent | MouseEvent) => {
      if (!scrollRef.current) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left + scrollRef.current.scrollLeft;
      const frameIndex = Math.floor(relativeX / frameWidth);
      
      handleSeek(frameIndex); 
  }, [frameWidth, handleSeek]);

  useEffect(() => {
      const onMove = (e: MouseEvent) => { 
          if (isScrubbing) {
              if (rafRef.current) cancelAnimationFrame(rafRef.current);
              // Throttle to RAF, but update is live
              rafRef.current = requestAnimationFrame(() => handleScrub(e));
          }
      };
      const onUp = () => {
          if (isScrubbing) {
              setIsScrubbing(false);
              if (rafRef.current) cancelAnimationFrame(rafRef.current);
          }
      };
      
      if (isScrubbing) {
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
      }
      return () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
  }, [isScrubbing, handleScrub]);

  // --- Zoom Logic (Native Event to block Browser Zoom) ---

  useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const onWheel = (e: WheelEvent) => {
          if (e.ctrlKey || e.metaKey) {
              e.preventDefault(); // CRITICAL: Stop browser zoom
              e.stopPropagation();

              const delta = -Math.sign(e.deltaY) * 4;
              setFrameWidth(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
          }
      };

      // Passive: false is required to use preventDefault
      el.addEventListener('wheel', onWheel, { passive: false });
      
      return () => {
          el.removeEventListener('wheel', onWheel);
      };
  }, []);

  // Scroll Playhead into view
  useEffect(() => {
      if (activeTimelineNode?.data.isPlaying && scrollRef.current) {
          const currentLeft = currentFrameIndex * frameWidth;
          const visibleStart = scrollRef.current.scrollLeft;
          const visibleEnd = visibleStart + scrollRef.current.clientWidth;
          
          if (currentLeft > visibleEnd - frameWidth * 2) {
              scrollRef.current.scrollLeft = currentLeft - frameWidth; 
          } else if (currentLeft < visibleStart) {
              scrollRef.current.scrollLeft = Math.max(0, currentLeft - frameWidth);
          }
      }
  }, [currentFrameIndex, activeTimelineNode?.data.isPlaying, frameWidth]);


  // --- Context Menu Actions ---

  const performAction = useCallback((action: 'duplicate' | 'delete', index: number) => {
      const newFrames = [...frames];

      if (action === 'delete') {
          newFrames.splice(index, 1);
          let newCursor = activeTimelineNode?.data.currentFrame || 0;
          if (newCursor >= newFrames.length) newCursor = Math.max(0, newFrames.length - 1);
          updateTimeline({ frames: newFrames, currentFrame: newCursor });
          if (index === selectedTimelineIndex) dispatch({ type: 'SELECT_TIMELINE_FRAME', payload: null });
      } else if (action === 'duplicate') {
          newFrames.splice(index + 1, 0, frames[index]);
          updateTimeline({ frames: newFrames });
      }
      setContextMenuConfig(null);
  }, [frames, activeTimelineNode?.data.currentFrame, selectedTimelineIndex, dispatch, updateTimeline]);

  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenuConfig({
          x: e.clientX,
          y: e.clientY,
          header: `Frame ${index}`,
          items: [
              {
                  id: 'duplicate',
                  label: 'Duplicate',
                  icon: Copy,
                  colorClass: 'text-blue-400',
                  onClick: () => performAction('duplicate', index)
              },
              {
                  id: 'delete',
                  label: 'Remove',
                  icon: Trash2,
                  danger: true,
                  onClick: () => performAction('delete', index)
              }
          ]
      });
  }, [performAction]);

  // --- Drag & Drop ---

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
      setDragSourceIndex(index);
      const ghost = document.createElement('div');
      ghost.style.width = '1px'; ghost.style.height = '1px';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => document.body.removeChild(ghost), 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragSourceIndex === null || dragSourceIndex === index) return;
      setDropTargetIndex(index);
  }, [dragSourceIndex]);

  const handleDrop = () => {
      if (dragSourceIndex !== null && dropTargetIndex !== null && dragSourceIndex !== dropTargetIndex) {
          const newFrames = [...frames];
          const [moved] = newFrames.splice(dragSourceIndex, 1);
          newFrames.splice(dropTargetIndex, 0, moved);
          
          // Re-calculate cursor position if we moved the selected frame
          let newCursor = currentFrameIndex;
          if (currentFrameIndex === dragSourceIndex) {
              newCursor = dropTargetIndex;
          } else if (
              dragSourceIndex < currentFrameIndex && 
              dropTargetIndex >= currentFrameIndex
          ) {
              newCursor--;
          } else if (
              dragSourceIndex > currentFrameIndex &&
              dropTargetIndex <= currentFrameIndex
          ) {
              newCursor++;
          }

          updateTimeline({ frames: newFrames, currentFrame: newCursor });
      }
      setDragSourceIndex(null);
      setDropTargetIndex(null);
  };

  // --- Rendering ---

  // Resolving Images: Use the Node Processor Output (Source of Truth) if available
  const activePayload = activeTimelineNode ? nodeOutputs[activeTimelineNode.id] : null;
  const processedFrames = (activePayload?.type === 'TIMELINE') ? activePayload.frames : null;

  return (
    <div 
        ref={containerRef}
        className="flex flex-col h-full bg-panel border-t border-border-base/10 select-none relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] text-txt-primary"
        onClick={() => setContextMenuConfig(null)}
        onMouseLeave={() => setIsScrubbing(false)}
    >
      
      {/* 1. Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-panel/50 border-b border-border-base/10 shrink-0 h-10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
            {/* Timeline Selector */}
            <div className="relative group">
                <div className="flex items-center gap-2 bg-surface/50 px-2 py-1 rounded-lg border border-border-base/10 hover:border-indigo-500/50 cursor-pointer transition-colors min-w-[140px]">
                    <Film size={12} className="text-indigo-400" />
                    <select 
                        value={activeTimelineNode?.id || ''}
                        onChange={(e) => {
                            setLocalActiveId(e.target.value);
                            // Also select the node in the graph for UX clarity
                            dispatch({ type: 'SELECT_NODE', payload: e.target.value });
                        }}
                        className="bg-transparent border-none outline-none text-[10px] font-bold uppercase text-txt-primary w-full appearance-none cursor-pointer absolute inset-0 pl-8 opacity-0"
                    >
                        {allTimelineNodes.map(node => (
                            <option key={node.id} value={node.id} className="bg-panel text-txt-primary">
                                Timeline {node.id.split('_')[1] || node.id}
                            </option>
                        ))}
                    </select>
                    <span className="text-[10px] font-bold uppercase truncate flex-1">
                        Timeline {activeTimelineNode?.id?.split('_')[1] || 'Main'}
                    </span>
                    <ChevronDown size={10} className="text-txt-muted opacity-50" />
                </div>
            </div>

            <div className="h-4 w-px bg-border-base/10" />

            <button 
                data-testid="timeline-play-pause"
                onClick={() => updateTimeline({ isPlaying: !activeTimelineNode?.data.isPlaying })}
                disabled={!activeTimelineNode}
                className={`p-1.5 rounded transition-all flex items-center gap-2 text-xs font-bold px-3 border ${activeTimelineNode?.data.isPlaying ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-surface hover:bg-surface-hover/10 text-txt-secondary border-transparent'}`}
            >
                {activeTimelineNode?.data.isPlaying ? <Pause size={12} fill="currentColor"/> : <Play size={12} fill="currentColor"/>}
                <span>{activeTimelineNode?.data.isPlaying ? 'PLAY' : 'PAUSE'}</span>
            </button>
            <div className="h-4 w-px bg-border-base/10" />
            <div className="text-[10px] text-txt-muted font-mono bg-surface/50 px-2 py-0.5 rounded border border-border-base/5">
                <span className="text-txt-primary">{currentFrameIndex + 1}</span> <span className="opacity-50">/ {frames.length}</span>
            </div>
        </div>

        <div className="flex items-center gap-4">
            {/* View Controls */}
            <div className="flex items-center gap-3 bg-surface/30 rounded-lg p-1 px-3 border border-border-base/10">
                <div className="flex items-center gap-2" title="Zoom Width (Ctrl+Scroll)">
                    <Search size={12} className="text-txt-muted" />
                    <input 
                        type="range" 
                        min={MIN_ZOOM} max={MAX_ZOOM} 
                        value={frameWidth} 
                        onChange={(e) => setFrameWidth(Number(e.target.value))}
                        className="w-16 h-1 bg-surface-hover/20 rounded-full appearance-none cursor-pointer accent-txt-secondary"
                    />
                </div>
                <div className="w-px h-3 bg-border-base/10" />
                <div className="flex items-center gap-2" title="Track Height">
                    <GripHorizontal size={12} className="text-txt-muted" />
                    <input 
                        type="range" 
                        min={MIN_HEIGHT} max={MAX_HEIGHT} 
                        value={trackHeight} 
                        onChange={(e) => setTrackHeight(Number(e.target.value))}
                        className="w-16 h-1 bg-surface-hover/20 rounded-full appearance-none cursor-pointer accent-txt-secondary"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* 2. Timeline Track Area */}
      <div className="flex-1 relative flex min-h-0 bg-app/50">
          
          {/* Scrollable Tracks */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar"
          >
              {/* Ruler */}
              <div 
                className="h-6 border-b border-border-base/10 bg-panel sticky top-0 z-10 cursor-ew-resize flex items-end overflow-hidden select-none shadow-sm"
                onMouseDown={handleRulerMouseDown}
              >
                  {frames.map((_, i) => (
                      <div key={i} className="flex-shrink-0 relative group" style={{ width: frameWidth }}>
                          <div className="absolute bottom-0 left-0 w-px h-2 bg-txt-muted/20 group-hover:h-3 transition-all" />
                          <span className="absolute bottom-2 left-1 text-[8px] text-txt-muted font-mono group-hover:text-txt-primary truncate w-full pointer-events-none">
                              {i % 5 === 0 || frameWidth > 40 ? i : ''}
                          </span>
                      </div>
                  ))}
                  {/* Extra space at end */}
                  <div className="w-[50vw] h-full shrink-0" />
              </div>

              {/* Tracks Container */}
              <div className="relative py-2">
                  
                  {/* Track 1: Main Frames */}
                  <div className="flex relative px-0.5 transition-[height] duration-200" style={{ height: trackHeight, minWidth: frames.length * frameWidth + 200 }}>
                      {frames.length === 0 && (
                          <div className="absolute left-4 top-2 text-xs text-txt-muted italic">Timeline Empty. Connect a Grid Node or add frames.</div>
                      )}

                      {frames.map((sourceFrameIdx, index) => {
                          // Crucially: map using the active timeline's frames array
                          // Use Processed Frame (Source of Truth) if available, else fallback to Global ID
                          const imgSrc = processedFrames ? processedFrames[index] : generatedFrames[sourceFrameIdx];
                          
                          const isActive = index === currentFrameIndex;
                          const isDragging = dragSourceIndex === index;
                          const isDropTarget = dropTargetIndex === index;

                          return (
                              <TimelineFrameItem
                                  key={`${index}-${sourceFrameIdx}`}
                                  index={index}
                                  imgSrc={imgSrc}
                                  width={frameWidth}
                                  height={trackHeight}
                                  isActive={isActive}
                                  isDragging={isDragging}
                                  isDropTarget={isDropTarget}
                                  isDragSource={dragSourceIndex !== null ? dragSourceIndex : -1}
                                  onDragStart={handleDragStart}
                                  onDragOver={handleDragOver}
                                  onDrop={handleDrop}
                                  onMouseDown={() => handleSeek(index)} 
                                  onContextMenu={handleContextMenu}
                              />
                          );
                      })}
                  </div>

                  {/* Playhead (Cursor) */}
                  <div 
                      className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none transition-transform duration-75 ease-linear will-change-transform"
                      style={{ transform: `translateX(${currentFrameIndex * frameWidth}px)` }}
                  >
                      {/* Playhead Handle */}
                      <div className="absolute -top-6 -left-1.5 w-3 h-3 bg-red-500 rotate-45 rounded-sm shadow-md" />
                      <div className="absolute top-0 left-0 h-full w-4 bg-gradient-to-r from-red-500/10 to-transparent pointer-events-none" />
                  </div>

              </div>
          </div>
      </div>

      <ContextMenu 
          config={contextMenuConfig} 
          onClose={() => setContextMenuConfig(null)} 
      />

    </div>
  );
};

export default Timeline;
