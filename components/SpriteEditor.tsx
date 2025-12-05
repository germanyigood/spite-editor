
import React, { useRef, useEffect, useState } from 'react';
import { SpriteConfig, AnimationEntry, SourceLayer } from '../types';
import { Crosshair, Eye, EyeOff, Move, MousePointer2 } from 'lucide-react';

interface SpriteEditorProps {
  entry: AnimationEntry;
  activeAnimationId: string;
  selectedFrameIndex: number | null; // This is the GRID index (source frame)
  onConfigChange: (newConfig: SpriteConfig) => void;
  onEntryUpdate: (updates: Partial<AnimationEntry>) => void;
  onFrameSelect: (index: number | null) => void;
  toolMode: 'select' | 'move_layer';
}

const SpriteEditor: React.FC<SpriteEditorProps> = ({ 
  entry,
  activeAnimationId, 
  selectedFrameIndex,
  onConfigChange,
  onEntryUpdate,
  onFrameSelect,
  toolMode
}) => {
  const { layers, spriteConfig: config, frames: activeTimelineFrames } = entry;
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

  // Center canvas on first load if we have content
  useEffect(() => {
    if (layers.length > 0 && containerRef.current) {
        // Only if not already moved? For now, we leave it or user adjusts. 
        // Initial centering could be calculated based on first layer size.
    }
  }, [activeAnimationId]);

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
        // Find clicked layer (reverse order to hit top first)
        // Since layers are just drawn, we need to check bounding boxes.
        // NOTE: We don't have natural dims here easily without ref to DOM elements. 
        // We rely on the DOM rendered images for hit testing? 
        // Actually, we can check the layer list if we knew dimensions. 
        // Simpler approach: Check DOM elements.
        const layerElements = document.querySelectorAll(`[data-layer-id]`);
        let hitLayerId: string | null = null;
        
        // Reverse iteration to find top-most
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
    if (toolMode === 'select') {
        // Check if clicking a Resize Handle
        const target = e.target as HTMLElement;
        if (target.dataset.resizeHandle && selectedFrameIndex !== null) {
        setResizingFrame({ index: selectedFrameIndex, handle: target.dataset.resizeHandle });
        e.stopPropagation();
        return;
        }

        // Check Frame Hit
        if (e.button === 0) {
        let clickedFrameIndex: number | null = null;

        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
            const idx = r * config.cols + c;
            if (idx >= config.totalFrames) continue;

            let bx = config.offsetX + c * (config.width + config.margin);
            let by = config.offsetY + r * (config.height + config.margin);
            
            const off = config.frameOffsets[idx] || {x: 0, y: 0};
            const fW = off.w ?? config.width;
            const fH = off.h ?? config.height;

            const curX = bx + off.x;
            const curY = by + off.y;

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
        const newLayers = layers.map(l => {
            if (l.id === draggedLayerId) {
                return { ...l, x: l.x + imgDx, y: l.y + imgDy };
            }
            return l;
        });
        onEntryUpdate({ layers: newLayers });
    }
    else if (resizingFrame) {
      const idx = resizingFrame.index;
      const currentOffset = config.frameOffsets[idx] || { x: 0, y: 0 };
      const curW = currentOffset.w ?? config.width;
      const curH = currentOffset.h ?? config.height;

      let newOff = { ...currentOffset };

      // Handle logic
      switch (resizingFrame.handle) {
        case 'br': // Bottom Right
          newOff.w = Math.max(4, curW + imgDx);
          newOff.h = Math.max(4, curH + imgDy);
          break;
        case 'bl': // Bottom Left
          const wChangeL = Math.min(curW - 4, imgDx);
          newOff.x = (newOff.x || 0) + wChangeL;
          newOff.w = curW - wChangeL;
          newOff.h = Math.max(4, curH + imgDy);
          break;
        case 'tr': // Top Right
          const hChangeT = Math.min(curH - 4, imgDy);
          newOff.y = (newOff.y || 0) + hChangeT;
          newOff.h = curH - hChangeT;
          newOff.w = Math.max(4, curW + imgDx);
          break;
        case 'tl': // Top Left
          const wChange = Math.min(curW - 4, imgDx);
          const hChange = Math.min(curH - 4, imgDy);
          newOff.x = (newOff.x || 0) + wChange;
          newOff.y = (newOff.y || 0) + hChange;
          newOff.w = curW - wChange;
          newOff.h = curH - hChange;
          break;
      }

      onConfigChange({
        ...config,
        frameOffsets: {
          ...config.frameOffsets,
          [idx]: newOff
        }
      });
    }
    else if (draggedFrame !== null) {
      const currentOffset = config.frameOffsets[draggedFrame] || { x: 0, y: 0 };
      const newOffset = {
        ...currentOffset,
        x: currentOffset.x + imgDx,
        y: currentOffset.y + imgDy
      };

      onConfigChange({
        ...config,
        frameOffsets: {
          ...config.frameOffsets,
          [draggedFrame]: newOffset
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

  const handleFrameToggle = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); 
    
    // Toggle frame in current animation sequence
    // If it's already in the timeline, remove ALL instances? Or just add to end?
    // Convention: Eye icon adds to end if not present, removes all if present.
    let newFrames = [...activeTimelineFrames];
    if (newFrames.includes(index)) {
        newFrames = newFrames.filter(i => i !== index);
    } else {
        newFrames.push(index);
    }
    onEntryUpdate({ frames: newFrames });
  };


  // Visual Grid Overlay
  const renderGrid = () => {
    const gridElements = [];
    
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const frameIndex = r * config.cols + c;
        if (frameIndex >= config.totalFrames) continue;

        // Base
        const baseX = config.offsetX + c * (config.width + config.margin);
        const baseY = config.offsetY + r * (config.height + config.margin);
        
        // Offset & Dimensions
        const offset = config.frameOffsets[frameIndex] || { x: 0, y: 0 };
        const finalX = baseX + offset.x;
        const finalY = baseY + offset.y;
        const finalW = offset.w ?? config.width;
        const finalH = offset.h ?? config.height;
        
        const isIncluded = activeTimelineFrames.includes(frameIndex);
        
        const isBeingDragged = draggedFrame === frameIndex;
        const isSelected = selectedFrameIndex === frameIndex;
        const isInteractable = toolMode === 'select';

        gridElements.push(
          <div
            key={frameIndex}
            className={`absolute transition-colors box-border group select-none
              ${isSelected 
                ? 'border-2 border-cyan-400 z-40' 
                : isIncluded 
                    ? 'border border-green-400 bg-green-500/5 z-20' 
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
              ${isSelected ? 'bg-cyan-500 text-black font-bold' : isIncluded ? 'bg-green-500 text-black font-bold' : 'bg-gray-700 text-gray-400'}`}>
              {frameIndex + 1}
            </div>

            {/* Eye Toggle Button - Only visible in select mode */}
            {toolMode === 'select' && (
                <button
                onClick={(e) => handleFrameToggle(frameIndex, e)}
                onMouseDown={(e) => e.stopPropagation()} 
                className={`absolute top-0 right-0 p-1.5 rounded-bl-lg transition-all z-30 cursor-pointer pointer-events-auto
                    ${isIncluded 
                    ? 'bg-green-500 text-black hover:bg-green-400' 
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                    }`}
                title={isIncluded ? "Remove from timeline" : "Append to timeline"}
                >
                {isIncluded ? <Eye size={12} strokeWidth={3} /> : <EyeOff size={12} />}
                </button>
            )}

            {/* Crosshair */}
            {config.showCrosshair && (
               <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute top-1/2 left-0 w-full h-px bg-cyan-300" />
                  <div className="absolute top-0 left-1/2 h-full w-px bg-cyan-300" />
               </div>
            )}
            
            {/* Resize Handles (Only when selected and in select mode) */}
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

  // Helper to get image dimensions for hit testing
  const [layerDims, setLayerDims] = useState<{[key:string]: {w:number, h:number}}>({});
  const onImgLoad = (id: string, e: React.SyntheticEvent<HTMLImageElement>) => {
     setLayerDims(prev => ({
         ...prev,
         [id]: { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }
     }));
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900 select-none">
       {/* Hints */}
       <div className="absolute top-4 right-4 z-20 pointer-events-none flex flex-col items-end gap-1 opacity-60">
          <span className="text-[10px] text-gray-400 bg-black/70 px-2 py-1 rounded">Current Tool: {toolMode === 'select' ? 'Frame Edit' : 'Move Layer'}</span>
          <span className="text-[10px] text-gray-400 bg-black/70 px-2 py-1 rounded">Middle / Space+LMB: Pan</span>
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
            // Large container to allow panning freely
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
                    className={`absolute max-w-none pixelated ${toolMode === 'move_layer' ? 'hover:outline outline-2 outline-blue-500 cursor-move' : ''}`}
                    draggable={false}
                    style={{
                        left: layer.x,
                        top: layer.y,
                        opacity: layer.opacity,
                        zIndex: 0, // Layers at bottom
                        pointerEvents: toolMode === 'move_layer' ? 'auto' : 'none',
                        outline: isLayerDragged ? '2px solid yellow' : undefined
                    }}
                />
              );
          })}
          
          {/* Grid Layer */}
          <div className="absolute top-0 left-0">
            {renderGrid()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpriteEditor;
