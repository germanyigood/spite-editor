import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Copy, Play, Pause, ZoomIn, Search, GripHorizontal, ChevronDown, Film, EyeOff, RotateCcw } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { TimelineNode, ImageSource, NodePayload } from '../types';
import { BitmapView } from './common/BitmapView';
import { ContextMenu, ContextMenuConfig } from './common/design-system/ContextMenu';

interface TimelineProps {
  generatedFrames: ImageSource[];
  nodeOutputs: Record<string, NodePayload | null>;
}

// Optimized Frame Component with visual selection, pointer behaviors, and muted badge
const TimelineFrameItem = React.memo(({ 
    imgSrc, index, width, height, isActive, isSelected, isMuted, isDragging,
    onPointerDown, onContextMenu 
}: any) => {
    return (
        <div
            data-testid={`timeline-frame-item-${index}`}
            onPointerDown={(e) => onPointerDown(e, index)}
            onContextMenu={(e) => onContextMenu(e, index)}
            className={`
                flex-shrink-0 relative rounded-xl border overflow-hidden group cursor-pointer transition-all duration-100 select-none
                ${isSelected 
                    ? 'ring-2 ring-blue-500 z-10 border-blue-400 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.3)]' 
                    : isActive 
                        ? 'ring-2 ring-indigo-500 z-10 border-indigo-500 bg-indigo-500/10' 
                        : 'border-white/10 hover:bg-white/[0.03] hover:border-white/20'
                }
                ${isDragging ? 'opacity-20 scale-95 border-dashed border-white/20 blur-[1px]' : 'opacity-100 scale-100'}
            `}
            style={{ 
                width: width - 2, 
                height: height,
                marginRight: 2,
                touchAction: 'none', // Prevents default touch gestures while dragging on mobile
            }}
        >
            {/* Selection Checkmark Dot Indicator */}
            {isSelected && (
                <div className="absolute top-1.5 right-1.5 z-20 w-3.5 h-3.5 rounded-full bg-blue-500 border border-blue-200/50 flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-150">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
            )}

            {/* Muted Indicator overlay */}
            {isMuted && (
                <div className="absolute top-1 right-1 z-20 text-red-500 bg-panel/85 p-0.5 rounded border border-border-base/15">
                    <EyeOff size={10} />
                </div>
            )}

            <div className="w-full h-full flex items-center justify-center pointer-events-none bg-black/10 dark:bg-black/30">
                {imgSrc ? (
                    <BitmapView image={imgSrc} mode="contain" className={`w-full h-full p-1 transition-opacity ${isMuted ? 'opacity-30' : 'opacity-85 group-hover:opacity-100'}`} />
                ) : (
                    <span className="text-[10px] text-red-500 font-bold font-mono">ERR</span>
                )}
            </div>
            
            {/* Index Label */}
            {width > 24 && (
                <div className="absolute bottom-0 left-0 bg-panel/85 text-[9px] text-txt-secondary px-1.5 py-0.5 backdrop-blur-sm rounded-tr border-r border-t border-border-base/15 font-mono">
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
        prev.isSelected === next.isSelected &&
        prev.isMuted === next.isMuted &&
        prev.isDragging === next.isDragging
    );
});

const Timeline: React.FC<TimelineProps> = ({ generatedFrames, nodeOutputs }) => {
  const { state, dispatch } = useProject();
  const { animations, activeAnimationId, selectedTimelineIndex, selectedNodeId } = state;
  const currentAnim = animations.find(a => a.id === activeAnimationId);
  
  // --- NODE SELECTION LOGIC ---
  const allTimelineNodes = useMemo(() => {
      return (currentAnim?.nodeGraph?.nodes?.filter(n => n.type === 'timeline') as TimelineNode[]) || [];
  }, [currentAnim?.nodeGraph?.nodes]);

  const [localActiveId, setLocalActiveId] = useState<string | null>(null);

  const activeTimelineNode = useMemo(() => {
      const globalSelection = allTimelineNodes.find(n => n.id === selectedNodeId);
      if (globalSelection) return globalSelection;

      const localSelection = allTimelineNodes.find(n => n.id === localActiveId);
      if (localSelection) return localSelection;

      return allTimelineNodes[0];
  }, [allTimelineNodes, selectedNodeId, localActiveId]);

  useEffect(() => {
      if (activeTimelineNode && activeTimelineNode.id !== localActiveId) {
          setLocalActiveId(activeTimelineNode.id);
      }
  }, [activeTimelineNode?.id, localActiveId]);

  const frames = activeTimelineNode?.data.frames || [];
  const mutedIndices = activeTimelineNode?.data.mutedIndices || [];
  const currentFrameIndex = activeTimelineNode?.data.currentFrame ?? 0;

  // Refs for stale value prevention in window event listeners
  const framesRef = useRef<number[]>(frames);
  const mutedIndicesRef = useRef<number[]>(mutedIndices);
  const selectedIndicesRef = useRef<Set<number>>(new Set());
  const activeTimelineNodeRef = useRef(activeTimelineNode);
  
  useEffect(() => { framesRef.current = frames; }, [frames]);
  useEffect(() => { mutedIndicesRef.current = mutedIndices; }, [mutedIndices]);
  useEffect(() => { activeTimelineNodeRef.current = activeTimelineNode; }, [activeTimelineNode]);

  // Scrolling, Context Menu, Controls Coordinates
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextMenuConfig, setContextMenuConfig] = useState<ContextMenuConfig | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const rafRef = useRef<number | null>(null);
  
  const [frameWidth, setFrameWidth] = useState(64);
  const [trackHeight, setTrackHeight] = useState(80);
  
  const MIN_ZOOM = 24;
  const MAX_ZOOM = 300;
  const MIN_HEIGHT = 48;
  const MAX_HEIGHT = 160;

  // Selection state
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  useEffect(() => { selectedIndicesRef.current = selectedIndices; }, [selectedIndices]);

  // --- Visual Pointer Scrolling, Drag and Drop, Marquee States ---
  const [isCustomDragging, setIsCustomDragging] = useState(false);
  const [customDragIndex, setCustomDragIndex] = useState<number | null>(null);
  const [customDragCoords, setCustomDragCoords] = useState<{ x: number, y: number, offsetX: number, offsetY: number }>({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  
  const [customDropInsertIndex, _setCustomDropInsertIndex] = useState<number | null>(null);
  const customDropInsertIndexRef = useRef<number | null>(null);
  const setCustomDropInsertIndex = (index: number | null) => {
      customDropInsertIndexRef.current = index;
      _setCustomDropInsertIndex(index);
  };

  const [selectionMarquee, setSelectionMarquee] = useState<{
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      isActive: boolean;
  } | null>(null);

  const pointerDragRef = useRef<{
      index: number;
      startX: number;
      startY: number;
      offsetX: number;
      offsetY: number;
      isDragging: boolean;
      lastX: number;
      lastY: number;
  } | null>(null);
  
  const activeDragSelectionRef = useRef<Set<number>>(new Set());

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
      if (idx !== selectedTimelineIndex) {
          dispatch({ type: 'SELECT_TIMELINE_FRAME', payload: idx });
      }
      if (idx !== activeTimelineNode?.data.currentFrame) {
          updateTimeline({ currentFrame: idx });
      }
  }, [frames.length, activeTimelineNode?.data.currentFrame, selectedTimelineIndex, dispatch, updateTimeline]);

  const handleFrameClick = useCallback((e: MouseEvent | PointerEvent, index: number) => {
      setSelectedIndices(prev => {
          const newSelection = new Set(prev);
          if (e.shiftKey && newSelection.size > 0) {
              const lastSelected = Array.from(newSelection).pop() ?? index;
              const start = Math.min(index, lastSelected);
              const end = Math.max(index, lastSelected);
              for (let i = start; i <= end; i++) newSelection.add(i);
          } else if (e.ctrlKey || e.metaKey) {
              if (newSelection.has(index)) newSelection.delete(index);
              else newSelection.add(index);
          } else {
              newSelection.clear();
              newSelection.add(index);
          }
          return newSelection;
      });
      handleSeek(index);
  }, [handleSeek]);

  // --- Ruler / Playhead Scrubbing ---
  const handleRulerMouseDown = (e: React.MouseEvent) => {
      setIsScrubbing(true);
      handleScrub(e);
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

  // --- Native Wheels Events for Zoom Protection ---
  useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const onWheel = (e: WheelEvent) => {
          if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              e.stopPropagation();
              const delta = -Math.sign(e.deltaY) * 6;
              setFrameWidth(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
          }
      };

      el.addEventListener('wheel', onWheel, { passive: false });
      return () => {
          el.removeEventListener('wheel', onWheel);
      };
  }, []);

  // Sync scroll positioning to keep selected frame in bounds
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

  // --- Context Menu and Selection Multi-Actions ---
  const performAction = useCallback((action: 'duplicate' | 'delete' | 'mute', index: number) => {
      const currentFrames = framesRef.current;
      const currentMuted = mutedIndicesRef.current;
      const currentSelection = selectedIndicesRef.current;

      const newFrames = [...currentFrames];
      const targets = currentSelection.has(index) ? Array.from(currentSelection).sort((a,b)=>a-b) : [index];

      if (action === 'delete') {
          const remainingMuted = [];
          for(let i=0; i<currentFrames.length; i++) {
              if (!targets.includes(i) && currentMuted.includes(i)) {
                  const shift = targets.filter(t => t < i).length;
                  remainingMuted.push(i - shift);
              }
          }
          for(let i=targets.length-1; i>=0; i--) {
              newFrames.splice(targets[i], 1);
          }
          
          let newCursor = currentFrameIndex;
          if (newCursor >= newFrames.length) newCursor = Math.max(0, newFrames.length - 1);
          
          setSelectedIndices(new Set());
          updateTimeline({ frames: newFrames, currentFrame: newCursor, mutedIndices: remainingMuted });
      } else if (action === 'duplicate') {
          const insertIndex = targets[targets.length - 1] + 1;
          const framesToInsert = targets.map(t => currentFrames[t]);
          const mutedToInsert = targets.map(t => currentMuted.includes(t));
          
          newFrames.splice(insertIndex, 0, ...framesToInsert);
          
          let newMutedArray = Array.from({length: currentFrames.length}, (_, i) => currentMuted.includes(i));
          newMutedArray.splice(insertIndex, 0, ...mutedToInsert);
          
          const newSelection = new Set<number>();
          for (let i = 0; i < targets.length; i++) {
              newSelection.add(insertIndex + i);
          }
          
          const nextMutedIndices = newMutedArray.map((m, i) => m ? i : -1).filter(i => i !== -1);
          setSelectedIndices(newSelection);
          updateTimeline({ frames: newFrames, mutedIndices: nextMutedIndices, currentFrame: insertIndex });
      } else if (action === 'mute') {
          let newlyMuted = [...currentMuted];
          const allMuted = targets.every(t => newlyMuted.includes(t));
          if (allMuted) {
              newlyMuted = newlyMuted.filter(m => !targets.includes(m));
          } else {
              targets.forEach(t => { if(!newlyMuted.includes(t)) newlyMuted.push(t); });
          }
          updateTimeline({ mutedIndices: newlyMuted.sort((a,b)=>a-b) });
      }
      setContextMenuConfig(null);
  }, [currentFrameIndex, updateTimeline]);

  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenuConfig({
          x: e.clientX,
          y: e.clientY,
          header: `Frame ${index}`,
          items: [
              {
                  id: 'mute',
                  label: mutedIndices.includes(index) ? 'Unmute' : 'Mute',
                  icon: EyeOff,
                  colorClass: 'text-orange-400',
                  onClick: () => performAction('mute', index)
              },
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
  }, [performAction, mutedIndices]);

  // --- Visual Drag & Drop Pointer Event Handlers ---
  const handleFramePointerMove = useCallback((e: PointerEvent) => {
      const dragInfo = pointerDragRef.current;
      if (!dragInfo) return;
      
      const dx = e.clientX - dragInfo.startX;
      const dy = e.clientY - dragInfo.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (!dragInfo.isDragging) {
          if (distance > 5) {
              dragInfo.isDragging = true;
              
              let dragSelection = new Set(activeDragSelectionRef.current);
              if (!dragSelection.has(dragInfo.index)) {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                      dragSelection = new Set([dragInfo.index]);
                  } else {
                      dragSelection.add(dragInfo.index);
                  }
                  setSelectedIndices(dragSelection);
                  activeDragSelectionRef.current = dragSelection;
              }
              
              setIsCustomDragging(true);
              setCustomDragIndex(dragInfo.index);
          }
      }
      
      if (dragInfo.isDragging) {
          setCustomDragCoords({ 
              x: e.clientX, 
              y: e.clientY,
              offsetX: dragInfo.offsetX,
              offsetY: dragInfo.offsetY
          });
          
          const rect = scrollRef.current?.getBoundingClientRect();
          if (rect) {
              const xX = e.clientX - rect.left + scrollRef.current!.scrollLeft;
              const fractionalIndex = xX / frameWidth;
              const targetIndex = Math.floor(fractionalIndex);
              const isAfter = (fractionalIndex - targetIndex) > 0.5;
              const calculatedInsertIndex = Math.max(0, Math.min(framesRef.current.length, isAfter ? targetIndex + 1 : targetIndex));
              setCustomDropInsertIndex(calculatedInsertIndex);
              
              // Handle scrolling if near scroll boundaries
              const nearLeftThreshold = rect.left + 80;
              const nearRightThreshold = rect.right - 80;
              
              if (e.clientX < nearLeftThreshold) {
                  const scrollSpeed = Math.max(2, Math.min(20, (nearLeftThreshold - e.clientX) / 3));
                  scrollRef.current!.scrollLeft -= scrollSpeed;
              } else if (e.clientX > nearRightThreshold) {
                  const scrollSpeed = Math.max(2, Math.min(20, (e.clientX - nearRightThreshold) / 3));
                  scrollRef.current!.scrollLeft += scrollSpeed;
              }
          }
      }
  }, [frameWidth]);

  const handleFramePointerUp = useCallback((e: PointerEvent) => {
      const dragInfo = pointerDragRef.current;
      
      window.removeEventListener('pointermove', handleFramePointerMove);
      window.removeEventListener('pointerup', handleFramePointerUp);
      
      if (!dragInfo) return;
      pointerDragRef.current = null;
      
      if (dragInfo.isDragging) {
          const insertAt = customDropInsertIndexRef.current;
          const draggedIndices = Array.from(activeDragSelectionRef.current).sort((a, b) => a - b);
          
          if (draggedIndices.length > 0 && insertAt !== null && insertAt !== undefined) {
              const currentFrames = framesRef.current;
              const currentMuted = mutedIndicesRef.current;
              
              const newFrames = [];
              const newMuted = [];
              const movedFrames = [];
              const movedMutedState = [];
              
              for (let i = 0; i < currentFrames.length; i++) {
                  const isMuted = currentMuted.includes(i);
                  if (draggedIndices.includes(i)) {
                      movedFrames.push(currentFrames[i]);
                      movedMutedState.push(isMuted);
                  } else {
                      newFrames.push(currentFrames[i]);
                      newMuted.push(isMuted);
                  }
              }
              
              let adjustedInsertAt = insertAt;
              const numRemovedBeforeDrop = draggedIndices.filter(i => i < insertAt).length;
              adjustedInsertAt -= numRemovedBeforeDrop;
              
              newFrames.splice(adjustedInsertAt, 0, ...movedFrames);
              newMuted.splice(adjustedInsertAt, 0, ...movedMutedState);
              
              const nextMutedIndices = newMuted.map((m, i) => m ? i : -1).filter(i => i !== -1);
              const newSelections = new Set(movedFrames.map((_, i) => adjustedInsertAt + i));
              
              setSelectedIndices(newSelections);
              
              if (activeTimelineNodeRef.current) {
                  dispatch({ 
                      type: 'UPDATE_NODE_DATA', 
                      payload: { 
                          animId: activeAnimationId!, 
                          nodeId: activeTimelineNodeRef.current.id, 
                          data: {
                              frames: newFrames, 
                              mutedIndices: nextMutedIndices,
                              currentFrame: adjustedInsertAt 
                          } 
                      } 
                  });
              }
          }
          
          setIsCustomDragging(false);
          setCustomDragIndex(null);
          setCustomDropInsertIndex(null);
      } else {
          handleFrameClick(e, dragInfo.index);
      }
  }, [activeAnimationId, dispatch, handleFrameClick, handleFramePointerMove]);

  const handleFramePointerDown = useCallback((e: React.PointerEvent, index: number) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      
      pointerDragRef.current = {
          index,
          startX: e.clientX,
          startY: e.clientY,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          isDragging: false,
          lastX: e.clientX,
          lastY: e.clientY,
      };
      
      activeDragSelectionRef.current = new Set(selectedIndicesRef.current);
      
      window.addEventListener('pointermove', handleFramePointerMove);
      window.addEventListener('pointerup', handleFramePointerUp);
  }, [handleFramePointerMove, handleFramePointerUp]);

  useEffect(() => {
      return () => {
          window.removeEventListener('pointermove', handleFramePointerMove);
          window.removeEventListener('pointerup', handleFramePointerUp);
      };
  }, [handleFramePointerMove, handleFramePointerUp]);

  // --- Marquee Select Background Empty Space dragging ---
  const handleTrackAreaPointerDown = useCallback((e: React.PointerEvent) => {
      if (e.button !== 0) return;
      
      const targetEl = e.target as HTMLElement;
      if (targetEl.closest('[data-testid^="timeline-frame-item-"]') || targetEl.closest('.cursor-ew-resize') || targetEl.closest('button') || targetEl.closest('select')) {
          return;
      }
      
      const rect = scrollRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const startX = e.clientX - rect.left + scrollRef.current!.scrollLeft;
      const startY = e.clientY - rect.top + scrollRef.current!.scrollTop;
      
      setSelectionMarquee({
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          isActive: true,
      });
      
      scrollRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const handleTrackAreaPointerMove = useCallback((e: React.PointerEvent) => {
      if (selectionMarquee?.isActive) {
          const rect = scrollRef.current?.getBoundingClientRect();
          if (!rect) return;
          
          const currentX = e.clientX - rect.left + scrollRef.current!.scrollLeft;
          const currentY = e.clientY - rect.top + scrollRef.current!.scrollTop;
          
          setSelectionMarquee(prev => prev ? { ...prev, currentX, currentY } : null);
          
          const minX = Math.min(selectionMarquee.startX, currentX);
          const maxX = Math.max(selectionMarquee.startX, currentX);
          const minY = Math.min(selectionMarquee.startY, currentY);
          const maxY = Math.max(selectionMarquee.startY, currentY);
          
          const trackTop = 32; // 24px ruler + 8px py-2 padding
          const trackBottom = trackTop + trackHeight;
          
          const newSelected = new Set<number>();
          
          if (minY < trackBottom && maxY > trackTop) {
              framesRef.current.forEach((_, i) => {
                  const frameLeft = i * frameWidth;
                  const frameRight = (i + 1) * frameWidth;
                  if (frameLeft < maxX && frameRight > minX) {
                      newSelected.add(i);
                  }
              });
          }
          
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
              setSelectedIndices(prev => {
                  const combined = new Set(prev);
                  newSelected.forEach(idx => combined.add(idx));
                  return combined;
              });
          } else {
              setSelectedIndices(newSelected);
          }
      }
  }, [selectionMarquee, frameWidth]);

  const handleTrackAreaPointerUp = useCallback((e: React.PointerEvent) => {
      if (selectionMarquee?.isActive) {
          scrollRef.current?.releasePointerCapture(e.pointerId);
          setSelectionMarquee(null);
      }
  }, [selectionMarquee]);

  // Resolving Images
  const activePayload = activeTimelineNode ? nodeOutputs[activeTimelineNode.id] : null;

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
                <span data-testid="timeline-playhead-index" className="text-txt-primary">{currentFrameIndex + 1}</span> <span className="opacity-50">/ {frames.length}</span>
            </div>
            {selectedIndices.size > 0 && (
                <>
                <div className="h-4 w-px bg-border-base/10" />
                <div className="flex items-center gap-1 bg-surface/50 rounded-lg border border-border-base/10 p-1">
                    <button title="Duplicate Selected" onClick={() => performAction('duplicate', Array.from(selectedIndices)[0])} className="p-1.5 hover:bg-surface rounded text-txt-muted hover:text-blue-400"><Copy size={12} /></button>
                    <button title="Mute/Unmute Selected" onClick={() => performAction('mute', Array.from(selectedIndices)[0])} className="p-1.5 hover:bg-surface rounded text-txt-muted hover:text-orange-400"><EyeOff size={12} /></button>
                    <button title="Reverse Selected" onClick={() => {
                        if (selectedIndices.size < 2) return;
                        const targets = Array.from(selectedIndices).sort((a,b)=>a-b);
                        const newFrames = [...frames];
                        let newMutedArray = Array.from({length: frames.length}, (_, i) => mutedIndices.includes(i));
                        
                        const extractedFrames = targets.map(t => newFrames[t]).reverse();
                        const extractedMuted = targets.map(t => newMutedArray[t]).reverse();
                        
                        targets.forEach((globalIndex, n) => {
                            newFrames[globalIndex] = extractedFrames[n];
                            newMutedArray[globalIndex] = extractedMuted[n];
                        });
                        const nextMutedIndices = newMutedArray.map((m, i) => m ? i : -1).filter(i => i !== -1);
                        updateTimeline({ frames: newFrames, mutedIndices: nextMutedIndices });
                    }} className="p-1.5 hover:bg-surface rounded text-txt-muted hover:text-indigo-400"><RotateCcw size={12} /></button>
                    <button title="Delete Selected" onClick={() => performAction('delete', Array.from(selectedIndices)[0])} className="p-1.5 hover:bg-surface rounded text-txt-muted hover:text-red-400"><Trash2 size={12} /></button>
                </div>
                <div className="text-[10px] text-txt-muted">
                    {selectedIndices.size} selected
                </div>
                </>
            )}
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
            onPointerDown={handleTrackAreaPointerDown}
            onPointerMove={handleTrackAreaPointerMove}
            onPointerUp={handleTrackAreaPointerUp}
          >
              {/* Ruler */}
              <div 
                className="h-6 border-b border-border-base/10 bg-panel sticky top-0 z-10 cursor-ew-resize flex items-end overflow-hidden select-none shadow-sm"
                onMouseDown={handleRulerMouseDown}
              >
                  {frames.map((_, i) => (
                      <div key={i} className="flex-shrink-0 relative group" style={{ width: frameWidth }}>
                          <div className="absolute bottom-0 left-0 w-px h-2 bg-white/20 group-hover:h-3 transition-all" />
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
                  
                  {/* Drag-to-select range box display */}
                  {selectionMarquee && selectionMarquee.isActive && (
                      <div 
                          className="absolute bg-blue-500/10 border border-blue-400 rounded pointer-events-none z-50 shadow-[0_0_8px_rgba(59,130,246,0.15)] content-visibility-auto"
                          style={{
                              left: Math.min(selectionMarquee.startX, selectionMarquee.currentX),
                              top: Math.min(selectionMarquee.startY, selectionMarquee.currentY),
                              width: Math.abs(selectionMarquee.currentX - selectionMarquee.startX),
                              height: Math.abs(selectionMarquee.currentY - selectionMarquee.startY),
                          }}
                      />
                  )}

                  {/* Vertical Neon Drop Position Indicator Line */}
                  {isCustomDragging && customDropInsertIndex !== null && (
                      <div 
                          className="absolute bottom-0 w-1 bg-blue-400 z-50 pointer-events-none"
                          style={{
                              top: 0,
                              left: customDropInsertIndex * frameWidth,
                              height: trackHeight + 16,
                              boxShadow: '0 0 12px 2px rgba(96,165,250,0.8), 0 0 4px 1px rgba(96,165,250,0.6)',
                              transform: 'translateX(-2px)'
                          }}
                      />
                  )}

                  {/* Track 1: Main Frames */}
                  <div className="flex relative px-0.5 transition-[height] duration-200" style={{ height: trackHeight, minWidth: frames.length * frameWidth + 200 }}>
                      {frames.length === 0 && (
                          <div className="absolute left-4 top-2 text-xs text-white/50 italic font-medium">Timeline Empty. Connect a Grid Node or add frames.</div>
                      )}

                      {frames.map((sourceFrameIdx, index) => {
                          const imgSrc = generatedFrames[sourceFrameIdx];
                          
                          const isActive = index === currentFrameIndex;
                          const isFrameSelected = selectedIndices.has(index);
                          const isFrameDragging = isCustomDragging && selectedIndices.has(index);

                          return (
                              <TimelineFrameItem
                                  key={`${index}-${sourceFrameIdx}`}
                                  index={index}
                                  imgSrc={imgSrc}
                                  width={frameWidth}
                                  height={trackHeight}
                                  isActive={isActive}
                                  isSelected={isFrameSelected}
                                  isMuted={mutedIndices.includes(index)}
                                  isDragging={isFrameDragging}
                                  onPointerDown={handleFramePointerDown} 
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

      {/* Floating Tactical Drag Ghost representation portal */}
      {isCustomDragging && customDragIndex !== null && (
          <div 
              className="fixed z-[9999] pointer-events-none select-none drop-shadow-2xl transition-transform duration-100 ease-out"
              style={{
                  left: customDragCoords.x - customDragCoords.offsetX,
                  top: customDragCoords.y - customDragCoords.offsetY,
                  transform: 'scale(1.05)',
                  transformOrigin: `${customDragCoords.offsetX}px ${customDragCoords.offsetY}px`,
              }}
          >
              <div className="relative flex items-center justify-center rounded-xl bg-panel border-2 border-blue-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                   style={{ width: frameWidth, height: trackHeight }}>
                   
                   {/* Background overlapping cards representation */}
                   {selectedIndices.size > 1 && (
                       <>
                           <div className="absolute inset-0 bg-blue-500/10 border border-blue-400/30 rounded-xl -rotate-3 scale-95 opacity-50 translate-x-1.5 translate-y-1.5 pointer-events-none" />
                       </>
                   )}
                   
                   {/* Primary Thumbnail Preview */}
                   <div className="w-full h-full relative rounded-lg overflow-hidden bg-black/40 flex items-center justify-center pointer-events-none">
                       {generatedFrames[frames[customDragIndex]] ? (
                           <BitmapView 
                               image={generatedFrames[frames[customDragIndex]]} 
                               mode="contain" 
                               className="w-full h-full p-1 opacity-95 pointer-events-none" 
                           />
                       ) : (
                           <span className="text-[10px] text-red-500 font-bold font-mono">ERR</span>
                       )}
                       
                       {/* Count badge */}
                       {selectedIndices.size > 1 && (
                           <div className="absolute bottom-1 right-1 bg-blue-500 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-blue-300">
                               {selectedIndices.size}
                           </div>
                       )}
                   </div>
              </div>
          </div>
      )}

      <ContextMenu 
          config={contextMenuConfig} 
          onClose={() => setContextMenuConfig(null)} 
      />

    </div>
  );
};

export default Timeline;
