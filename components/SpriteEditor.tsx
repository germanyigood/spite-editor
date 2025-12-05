
import React, { useRef, useEffect, useState } from 'react';
import { SpriteConfig, AnimationEntry, SourceLayer } from '../types';
import { Plus } from 'lucide-react';

interface SpriteEditorProps {
  entry: AnimationEntry;
  activeAnimationId: string;
  activeLayerId: string | null;
  selectedFrameIndex: number | null; // This is the GRID index (source frame)
  onEntryUpdate: (updates: Partial<AnimationEntry>) => void;
  onLayerUpdate: (layerId: string, updates: Partial<SourceLayer>) => void;
  onFrameSelect: (index: number | null) => void;
  toolMode: 'select' | 'move_layer';
}

const SpriteEditor: React.FC<SpriteEditorProps> = ({ 
  entry,
  activeAnimationId, 
  activeLayerId,
  selectedFrameIndex,
  onEntryUpdate,
  onLayerUpdate,
  onFrameSelect,
  toolMode
}) => {
  const { layers, frames: activeTimelineFrames } = entry;
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Transform State (Pan/Zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [draggedFrame, setDraggedFrame] = useState<number | null>(null);
  const [resizingFrame, setResizingFrame] = useState<{index: number, handle: string} | null>(null);
  
  // Layer Dragging
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const isSpacePressed = useRef(false);

  // Derive the Active Layer Config
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const activeConfig = activeLayer?.spriteConfig;

  // Track space key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressed.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressed.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Input Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, transform.scale * (1 + scaleAmount)), 10);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleRatio = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * scaleRatio;
    const newY = mouseY - (mouseY - transform.y) * scaleRatio;

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    // Space + Click OR Middle Click = PAN
    if (e.button === 1 || (e.button === 0 && isSpacePressed.current)) {
      setIsPanning(true);
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const imgX = (mouseX - transform.x) / transform.scale;
    const imgY = (mouseY - transform.y) / transform.scale;

    // --- TOOL: MOVE LAYER ---
    if (toolMode === 'move_layer' && e.button === 0) {
        const layerElements = document.querySelectorAll(`[data-layer-id]`);
        let hitLayerId: string | null = null;
        
        for (let i = layerElements.length - 1; i >= 0; i--) {
            const el = layerElements[i] as HTMLElement;
            const lid = el.dataset.layerId;
            const lx = parseFloat(el.dataset.x || '0');
            const ly = parseFloat(el.dataset.y || '0');
            const lw = parseFloat(el.dataset.w || '0');
            const lh = parseFloat(el.dataset.h || '0');
            
            if (imgX >= lx && imgX <= lx + lw && imgY >= ly && imgY <= ly + lh) {
                hitLayerId = lid || null;
                break;
            }
        }
        
        if (hitLayerId) {
            setDraggedLayerId(hitLayerId);
            return;
        }
    }


    // --- TOOL: SELECT FRAME ---
    if (toolMode === 'select' && activeLayer && activeConfig) {
        // Check if clicking a Resize Handle
        const target = e.target as HTMLElement;
        if (target.dataset.resizeHandle && selectedFrameIndex !== null) {
          setResizingFrame({ index: selectedFrameIndex, handle: target.dataset.resizeHandle });
          e.stopPropagation();
          return;
        }

        // Check Frame Hit on the ACTIVE LAYER
        if (e.button === 0) {
          let clickedFrameIndex: number | null = null;
          
          // Layer Origin
          const lx = activeLayer.x;
          const ly = activeLayer.y;

          for (let r = 0; r < activeConfig.rows; r++) {
              for (let c = 0; c < activeConfig.cols; c++) {
              const idx = r * activeConfig.cols + c;
              if (idx >= activeConfig.totalFrames) continue;

              // Position logic relative to layer
              let bx = activeConfig.offsetX + c * (activeConfig.width + activeConfig.margin);
              let by = activeConfig.offsetY + r * (activeConfig.height + activeConfig.margin);
              
              const off = activeConfig.frameOffsets[idx] || {x: 0, y: 0};
              const fW = off.w ?? activeConfig.width;
              const fH = off.h ?? activeConfig.height;

              // Absolute canvas coords
              const curX = lx + bx + off.x;
              const curY = ly + by + off.y;

              if (imgX >= curX && imgX < curX + fW && 
                  imgY >= curY && imgY < curY + fH) {
                  
                  clickedFrameIndex = idx;
                  setDraggedFrame(idx);
                  break;
              }
              }
              if (clickedFrameIndex !== null) break;
          }

          onFrameSelect(clickedFrameIndex);
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    const imgDx = dx / transform.scale;
    const imgDy = dy / transform.scale;

    if (isPanning) {
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    } 
    else if (draggedLayerId) {
        onLayerUpdate(draggedLayerId, { 
             x: (layers.find(l => l.id === draggedLayerId)?.x || 0) + imgDx,
             y: (layers.find(l => l.id === draggedLayerId)?.y || 0) + imgDy
        });
    }
    else if (resizingFrame && activeLayerId && activeConfig) {
      const idx = resizingFrame.index;
      const currentOffset = activeConfig.frameOffsets[idx] || { x: 0, y: 0 };
      const curW = currentOffset.w ?? activeConfig.width;
      const curH = currentOffset.h ?? activeConfig.height;

      let newOff = { ...currentOffset };

      switch (resizingFrame.handle) {
        case 'br': 
          newOff.w = Math.max(4, curW + imgDx);
          newOff.h = Math.max(4, curH + imgDy);
          break;
        case 'bl': 
          const wChangeL = Math.min(curW - 4, imgDx);
          newOff.x = (newOff.x || 0) + wChangeL;
          newOff.w = curW - wChangeL;
          newOff.h = Math.max(4, curH + imgDy);
          break;
        case 'tr': 
          const hChangeT = Math.min(curH - 4, imgDy);
          newOff.y = (newOff.y || 0) + hChangeT;
          newOff.h = curH - hChangeT;
          newOff.w = Math.max(4, curW + imgDx);
          break;
        case 'tl': 
          const wChange = Math.min(curW - 4, imgDx);
          const hChange = Math.min(curH - 4, imgDy);
          newOff.x = (newOff.x || 0) + wChange;
          newOff.y = (newOff.y || 0) + hChange;
          newOff.w = curW - wChange;
          newOff.h = curH - hChange;
          break;
      }

      onLayerUpdate(activeLayerId, {
          spriteConfig: {
              ...activeConfig,
              frameOffsets: { ...activeConfig.frameOffsets, [idx]: newOff }
          }
      });
    }
    else if (draggedFrame !== null && activeLayerId && activeConfig) {
      const currentOffset = activeConfig.frameOffsets[draggedFrame] || { x: 0, y: 0 };
      const newOffset = {
        ...currentOffset,
        x: currentOffset.x + imgDx,
        y: currentOffset.y + imgDy
      };

      onLayerUpdate(activeLayerId, {
        spriteConfig: {
            ...activeConfig,
            frameOffsets: { ...activeConfig.frameOffsets, [draggedFrame]: newOffset }
        }
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedFrame(null);
    setResizingFrame(null);
    setDraggedLayerId(null);
  };

  const handleAddToTimeline = (e: React.MouseEvent, frameGlobalIndex: number) => {
    e.stopPropagation();
    e.preventDefault(); 
    // Always append to timeline
    const newFrames = [...activeTimelineFrames, frameGlobalIndex];
    onEntryUpdate({ frames: newFrames });
  };


  // Visual Grid Overlay - Only for Active Layer
  const renderGrid = () => {
    if (!activeLayer || !activeConfig) return null;

    const gridElements = [];
    
    // We need to calculate the "global frame index" for the timeline toggle to work.
    // The frames array is flat: [Layer0 Frames, Layer1 Frames...]
    // Calculate offset for current layer
    let globalFrameOffset = 0;
    for (const l of layers) {
        if (l.id === activeLayer.id) break;
        globalFrameOffset += l.spriteConfig.totalFrames;
    }

    for (let r = 0; r < activeConfig.rows; r++) {
      for (let c = 0; c < activeConfig.cols; c++) {
        const frameIndex = r * activeConfig.cols + c;
        if (frameIndex >= activeConfig.totalFrames) continue;

        const globalIndex = globalFrameOffset + frameIndex;

        // Base relative to layer
        const baseX = activeConfig.offsetX + c * (activeConfig.width + activeConfig.margin);
        const baseY = activeConfig.offsetY + r * (activeConfig.height + activeConfig.margin);
        
        // Offset & Dimensions
        const offset = activeConfig.frameOffsets[frameIndex] || { x: 0, y: 0 };
        // Absolute position on canvas
        const finalX = activeLayer.x + baseX + offset.x;
        const finalY = activeLayer.y + baseY + offset.y;
        
        const finalW = offset.w ?? activeConfig.width;
        const finalH = offset.h ?? activeConfig.height;
        
        // Count how many times this frame appears in the timeline
        const usageCount = activeTimelineFrames.filter(idx => idx === globalIndex).length;
        
        const isBeingDragged = draggedFrame === frameIndex;
        const isSelected = selectedFrameIndex === frameIndex;
        const isInteractable = toolMode === 'select';

        gridElements.push(
          <div
            key={`${activeLayer.id}_${frameIndex}`}
            className={`absolute transition-colors box-border group select-none
              ${isSelected 
                ? 'border-2 border-cyan-400 z-40' 
                : usageCount > 0 
                    ? 'border border-blue-400 bg-blue-500/5 z-20' 
                    : 'border border-gray-600 bg-black/40 hover:border-gray-400 z-10'
              }
              ${isBeingDragged ? 'border-yellow-400 z-50 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : ''}
              ${!isInteractable ? 'pointer-events-none opacity-50' : ''}
            `}
            style={{
              left: `${finalX}px`,
              top: `${finalY}px`,
              width: `${finalW}px`,
              height: `${finalH}px`,
              cursor: isBeingDragged ? 'grabbing' : 'grab'
            }}
          >
            {/* Frame Number Label */}
            <div className={`absolute top-0 left-0 text-[9px] px-1 font-mono leading-tight pointer-events-none 
              ${isSelected ? 'bg-cyan-500 text-black font-bold' : usageCount > 0 ? 'bg-blue-500 text-black font-bold' : 'bg-gray-700 text-gray-400'}`}>
              {frameIndex + 1}
            </div>
            
            {/* Usage Count Badge (Bottom Right) */}
            {usageCount > 0 && (
                <div className="absolute bottom-0 right-0 bg-blue-600 text-[9px] text-white px-1.5 rounded-tl font-bold pointer-events-none">
                    x{usageCount}
                </div>
            )}

            {/* Add to Timeline Button */}
            {toolMode === 'select' && (
                <button
                onClick={(e) => handleAddToTimeline(e, globalIndex)}
                onMouseDown={(e) => e.stopPropagation()} 
                className={`absolute top-0 right-0 p-1 rounded-bl-lg transition-all z-30 cursor-pointer pointer-events-auto shadow-sm
                    ${usageCount > 0 
                    ? 'bg-blue-600 text-white hover:bg-blue-500' 
                    : 'bg-gray-800 text-gray-500 hover:text-white hover:bg-blue-600'
                    }`}
                title="Add to timeline"
                >
                <Plus size={12} strokeWidth={3} />
                </button>
            )}

            {/* Crosshair */}
            {activeConfig.showCrosshair && (
               <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute top-1/2 left-0 w-full h-px bg-cyan-300" />
                  <div className="absolute top-0 left-1/2 h-full w-px bg-cyan-300" />
               </div>
            )}
            
            {/* Resize Handles */}
            {isSelected && toolMode === 'select' && (
              <>
                <div data-resize-handle="tl" className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-black cursor-nwse-resize z-50 pointer-events-auto" />
                <div data-resize-handle="tr" className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-black cursor-nesw-resize z-50 pointer-events-auto" />
                <div data-resize-handle="bl" className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-black cursor-nesw-resize z-50 pointer-events-auto" />
                <div data-resize-handle="br" className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-black cursor-nwse-resize z-50 pointer-events-auto" />
              </>
            )}
          </div>
        );
      }
    }
    return gridElements;
  };

  const [layerDims, setLayerDims] = useState<{[key:string]: {w:number, h:number}}>({});
  const onImgLoad = (id: string, e: React.SyntheticEvent<HTMLImageElement>) => {
     setLayerDims(prev => ({
         ...prev,
         [id]: { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }
     }));
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900 select-none">
       <div className="absolute top-4 right-4 z-20 pointer-events-none flex flex-col items-end gap-1 opacity-60">
          <span className="text-[10px] text-gray-400 bg-black/70 px-2 py-1 rounded">Current Tool: {toolMode === 'select' ? 'Frame Edit' : 'Move Layer'}</span>
          <span className="text-[10px] text-gray-400 bg-black/70 px-2 py-1 rounded">Middle / Space+LMB: Pan</span>
          {activeLayer && <span className="text-[10px] text-cyan-400 bg-black/70 px-2 py-1 rounded">Active: {activeLayer.name}</span>}
       </div>

      <div 
        ref={containerRef}
        className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()} 
      >
        <div 
          className="origin-top-left checkerboard transition-transform duration-75 ease-out"
          style={{
            width: 20000, 
            height: 20000,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            imageRendering: 'pixelated'
          }}
        >
          {/* Layer Rendering */}
          {layers.map(layer => {
              if (!layer.visible) return null;
              const isLayerDragged = draggedLayerId === layer.id;
              const isActive = activeLayerId === layer.id;
              
              return (
                <img 
                    key={layer.id}
                    data-layer-id={layer.id}
                    data-x={layer.x}
                    data-y={layer.y}
                    data-w={layerDims[layer.id]?.w}
                    data-h={layerDims[layer.id]?.h}
                    src={layer.imageSrc} 
                    alt={layer.name} 
                    onLoad={(e) => onImgLoad(layer.id, e)}
                    className={`absolute max-w-none pixelated 
                        ${toolMode === 'move_layer' ? 'hover:outline outline-2 outline-blue-500 cursor-move' : ''}
                    `}
                    draggable={false}
                    style={{
                        left: layer.x,
                        top: layer.y,
                        opacity: layer.opacity * (isActive || toolMode !== 'select' ? 1 : 0.5), // Dim inactive layers when editing
                        zIndex: 0,
                        pointerEvents: toolMode === 'move_layer' ? 'auto' : 'none',
                        outline: isLayerDragged ? '2px solid yellow' : (isActive && toolMode === 'select' ? '1px dashed cyan' : undefined)
                    }}
                />
              );
          })}
          
          <div className="absolute top-0 left-0">
            {renderGrid()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpriteEditor;
