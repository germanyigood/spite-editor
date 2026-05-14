
import React, { useState, useEffect, useCallback } from 'react';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CropOverlayProps {
  rect: CropRect;
  onUpdate: (rect: CropRect) => void;
  containerScale?: number; // How to map mouse delta to value (1 for 1:1, or >1 if zooming)
  color?: string; // Tailwind color class prefix (e.g. 'yellow', 'blue')
  label?: string;
  minWidth?: number;
  minHeight?: number;
  bounds?: { w: number, h: number }; // Optional bounds to constrain movement
  disableMove?: boolean; // If true, disables the central drag-move area (passes through clicks)
  readOnly?: boolean; // If true, overlay is visible but non-interactive (no handles, no drag)
}

const CropOverlay: React.FC<CropOverlayProps> = ({ 
  rect, 
  onUpdate, 
  containerScale = 1, 
  color = 'yellow', 
  label,
  minWidth = 10,
  minHeight = 10,
  bounds,
  disableMove = false,
  readOnly = false
}) => {
  const [dragState, setDragState] = useState<{
    type: 'move' | 'tl' | 'tr' | 'bl' | 'br';
    startX: number;
    startY: number;
    initialRect: CropRect;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'tl' | 'tr' | 'bl' | 'br') => {
    // 1. Critical: Allow panning to pass through
    // Ignore Middle Click (Button 1) or if Space is held (often used for panning)
    if (e.button !== 0 || e.shiftKey) return; 

    if (readOnly) return;
    if (type === 'move' && disableMove) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    setDragState({
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialRect: { ...rect }
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;

    // Apply scale to deltas to match zoom level
    const dx = (e.clientX - dragState.startX) / containerScale;
    const dy = (e.clientY - dragState.startY) / containerScale;
    const init = dragState.initialRect;
    
    let next = { ...init };

    if (dragState.type === 'move') {
      next.x = init.x + dx;
      next.y = init.y + dy;
    } else {
      // Resizing
      if (dragState.type.includes('l')) {
         const wChange = Math.min(init.w - minWidth, dx);
         next.x += wChange;
         next.w -= wChange;
      }
      if (dragState.type.includes('r')) {
         next.w = Math.max(minWidth, init.w + dx);
      }
      if (dragState.type.includes('t')) {
         const hChange = Math.min(init.h - minHeight, dy);
         next.y += hChange;
         next.h -= hChange;
      }
      if (dragState.type.includes('b')) {
         next.h = Math.max(minHeight, init.h + dy);
      }
    }

    // Rounding
    next.x = Math.round(next.x);
    next.y = Math.round(next.y);
    next.w = Math.round(next.w);
    next.h = Math.round(next.h);

    // Bounds Constraint
    if (bounds) {
        if (dragState.type === 'move') {
            next.x = Math.max(0, Math.min(next.x, bounds.w - next.w));
            next.y = Math.max(0, Math.min(next.y, bounds.h - next.h));
        }
        // Basic clamp for resize (start points)
        if (next.x < 0) { next.w += next.x; next.x = 0; }
        if (next.y < 0) { next.h += next.y; next.y = 0; }
    }

    onUpdate(next);
  }, [dragState, onUpdate, containerScale, minWidth, minHeight, bounds]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  // Color mapping
  const borderColor = color === 'blue' ? 'border-blue-500' : 'border-yellow-400';
  const bgColor = color === 'blue' ? 'bg-blue-500' : 'bg-yellow-400';
  const textColor = color === 'blue' ? 'text-blue-500' : 'text-yellow-500';

  const isInteractive = !readOnly;

  return (
    <div 
      className={`absolute border-2 ${borderColor} shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] box-content z-30
         ${readOnly ? 'pointer-events-none' : ''}
         ${!readOnly && !disableMove ? 'cursor-move pointer-events-auto' : ''}
         ${!readOnly && disableMove ? 'pointer-events-none' : ''} 
      `}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      {/* Handles - Only render if interactive */}
      {isInteractive && (
        <>
          <div className={`absolute -top-1.5 -left-1.5 w-3 h-3 ${bgColor} border border-black cursor-nwse-resize pointer-events-auto`} onMouseDown={(e) => handleMouseDown(e, 'tl')} />
          <div className={`absolute -top-1.5 -right-1.5 w-3 h-3 ${bgColor} border border-black cursor-nesw-resize pointer-events-auto`} onMouseDown={(e) => handleMouseDown(e, 'tr')} />
          <div className={`absolute -bottom-1.5 -left-1.5 w-3 h-3 ${bgColor} border border-black cursor-nesw-resize pointer-events-auto`} onMouseDown={(e) => handleMouseDown(e, 'bl')} />
          <div className={`absolute -bottom-1.5 -right-1.5 w-3 h-3 ${bgColor} border border-black cursor-nwse-resize pointer-events-auto`} onMouseDown={(e) => handleMouseDown(e, 'br')} />
        </>
      )}
      
      {/* Label */}
      <div className={`absolute top-0 left-0 -mt-5 ${textColor} text-[10px] font-bold bg-black/80 px-1 rounded pointer-events-none whitespace-nowrap`}>
        {label || `${rect.w}x${rect.h}`}
      </div>
    </div>
  );
};

export default CropOverlay;
