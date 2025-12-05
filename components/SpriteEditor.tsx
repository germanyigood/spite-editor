
import React, { useRef, useEffect, useState } from 'react';
import { SpriteConfig, AnimationEntry } from '../types';
import { Crosshair, Eye, EyeOff } from 'lucide-react';

interface SpriteEditorProps {
  entry: AnimationEntry;
  activeAnimationId: string;
  selectedFrameIndex: number | null;
  onConfigChange: (newConfig: SpriteConfig) => void;
  onEntryUpdate: (updates: Partial<AnimationEntry>) => void;
  onFrameSelect: (index: number | null) => void;
}

const SpriteEditor: React.FC<SpriteEditorProps> = ({ 
  entry,
  activeAnimationId, 
  selectedFrameIndex,
  onConfigChange,
  onEntryUpdate,
  onFrameSelect
}) => {
  const { imageSrc, spriteConfig: config, frames: activeFrames } = entry;
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
  
  // Transform State (Pan/Zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [draggedFrame, setDraggedFrame] = useState<number | null>(null);
  const [resizingFrame, setResizingFrame] = useState<{index: number, handle: string} | null>(null);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const isSpacePressed = useRef(false);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setTransform({
          x: (clientWidth - img.naturalWidth) / 2,
          y: (clientHeight - img.naturalHeight) / 2,
          scale: 1
        });
      }
    };
  }, [imageSrc]);

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

    // Check if clicking a Resize Handle
    const target = e.target as HTMLElement;
    if (target.dataset.resizeHandle && selectedFrameIndex !== null) {
      setResizingFrame({ index: selectedFrameIndex, handle: target.dataset.resizeHandle });
      e.stopPropagation();
      return;
    }

    // Left Click = Try to drag a frame or Select it
    if (e.button === 0) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const imgX = (mouseX - transform.x) / transform.scale;
      const imgY = (mouseY - transform.y) / transform.scale;

      let clickedFrameIndex: number | null = null;

      if (imageSrc) {
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
      }

      onFrameSelect(clickedFrameIndex);
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
  };

  const handleFrameToggle = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); 
    
    // Toggle frame in current animation
    let newFrames = [...activeFrames];
    const framePositionInAnim = newFrames.indexOf(index);

    if (framePositionInAnim >= 0) {
      newFrames.splice(framePositionInAnim, 1);
    } else {
      newFrames.push(index);
      newFrames.sort((a,b) => a - b); 
    }

    onEntryUpdate({ frames: newFrames });
  };


  // Visual Grid Overlay
  const renderGrid = () => {
    if (!imgDimensions.w || !imageSrc) return null;

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
        
        const isIncluded = activeFrames.includes(frameIndex);
        const sequenceIndex = activeFrames.indexOf(frameIndex);
        
        const isBeingDragged = draggedFrame === frameIndex;
        const isSelected = selectedFrameIndex === frameIndex;

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
            `}
            style={{
              left: `${finalX}px`,
              top: `${finalY}px`,
              width: `${finalW}px`,
              height: `${finalH}px`,
              cursor: isBeingDragged ? 'grabbing' : 'grab'
            }}
          >
            {/* Frame Number Label (Global Index) */}
            <div className={`absolute top-0 left-0 text-[9px] px-1 font-mono leading-tight pointer-events-none 
              ${isSelected ? 'bg-cyan-500 text-black font-bold' : isIncluded ? 'bg-green-500 text-black font-bold' : 'bg-gray-700 text-gray-400'}`}>
              {frameIndex + 1}
            </div>

            {/* Eye Toggle Button */}
            <button
               onClick={(e) => handleFrameToggle(frameIndex, e)}
               onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
               className={`absolute top-0 right-0 p-1.5 rounded-bl-lg transition-all z-30 cursor-pointer
                 ${isIncluded 
                   ? 'bg-green-500 text-black hover:bg-green-400' 
                   : 'bg-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                 }`}
               title={isIncluded ? "Remove from animation" : "Add to animation"}
            >
               {isIncluded ? <Eye size={12} strokeWidth={3} /> : <EyeOff size={12} />}
            </button>

            {/* Sequence Order Badge (Only if included) */}
            {isIncluded && sequenceIndex !== undefined && (
              <div className="absolute bottom-0 right-0 bg-green-500 text-black text-[10px] font-bold px-1.5 rounded-tl-md pointer-events-none">
                 #{sequenceIndex + 1}
              </div>
            )}

            {/* Crosshair (if enabled) */}
            {config.showCrosshair && (
               <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute top-1/2 left-0 w-full h-px bg-cyan-300" />
                  <div className="absolute top-0 left-1/2 h-full w-px bg-cyan-300" />
               </div>
            )}
            
            {/* Resize Handles (Only when selected) */}
            {isSelected && (
              <>
                <div data-resize-handle="tl" className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-black cursor-nwse-resize z-50" />
                <div data-resize-handle="tr" className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-black cursor-nesw-resize z-50" />
                <div data-resize-handle="bl" className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-black cursor-nesw-resize z-50" />
                <div data-resize-handle="br" className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-black cursor-nwse-resize z-50" />
              </>
            )}
          </div>
        );
      }
    }
    return gridElements;
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900 select-none">
       {/* Hints */}
       <div className="absolute top-4 right-4 z-20 pointer-events-none flex flex-col items-end gap-1 opacity-60">
          <span className="text-[10px] text-gray-400 bg-black/70 px-2 py-1 rounded">Eye Icon: Toggle Frame</span>
          <span className="text-[10px] text-gray-400 bg-black/70 px-2 py-1 rounded">Click Frame: Select Properties</span>
          <span className="text-[10px] text-gray-400 bg-black/70 px-2 py-1 rounded">Drag Handles: Resize</span>
          <span className="text-[10px] text-gray-400 bg-black/70 px-2 py-1 rounded">LMB Drag: Move Frame Offset</span>
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
            width: imgDimensions.w,
            height: imgDimensions.h,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            imageRendering: 'pixelated'
          }}
        >
          {imageSrc && (
            <img 
                src={imageSrc} 
                alt="Sprite Sheet" 
                className="absolute top-0 left-0 max-w-none pixelated"
                draggable={false}
                style={{
                width: imgDimensions.w,
                height: imgDimensions.h,
                pointerEvents: 'none'
                }}
            />
          )}
          
          {/* Grid Layer */}
          <div 
            className="absolute top-0 left-0"
            style={{ width: imgDimensions.w, height: imgDimensions.h }}
          >
            {renderGrid()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpriteEditor;
