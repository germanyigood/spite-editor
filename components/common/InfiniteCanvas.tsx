
import React, { forwardRef } from 'react';
import { ViewportTransform } from '../../types';

interface InfiniteCanvasProps {
    transform: ViewportTransform;
    onChange: (newTransform: ViewportTransform) => void;
    children: React.ReactNode;
    className?: string;
    
    // Interaction Events
    onMouseDown?: React.MouseEventHandler;
    onMouseMove?: React.MouseEventHandler;
    onMouseUp?: React.MouseEventHandler;
    onMouseLeave?: React.MouseEventHandler;
    onMouseEnter?: React.MouseEventHandler;
    
    // Optional Config
    minScale?: number;
    maxScale?: number;
    gridSize?: number;
}

export const InfiniteCanvas = forwardRef<HTMLDivElement, InfiniteCanvasProps>(({
    transform,
    onChange,
    children,
    className = "",
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onMouseEnter,
    minScale = 0.1,
    maxScale = 10,
    gridSize = 20
}, ref) => {

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        
        // Calculate new scale
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(minScale, transform.scale * (1 + scaleAmount)), maxScale);
        
        // Calculate zoom origin (mouse position)
        const container = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - container.left;
        const mouseY = e.clientY - container.top;

        // Calculate new offset to keep mouse over same point
        const scaleRatio = newScale / transform.scale;
        const newX = mouseX - (mouseX - transform.x) * scaleRatio;
        const newY = mouseY - (mouseY - transform.y) * scaleRatio;

        onChange({ x: newX, y: newY, scale: newScale });
    };

    return (
        <div 
            ref={ref}
            data-testid="infinite-canvas"
            className={`w-full h-full relative overflow-hidden bg-transparent ${className}`}
            onWheel={handleWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onMouseEnter={onMouseEnter}
        >
            {/* Background Checkerboard */}
            <div 
                className="absolute inset-0 pointer-events-none checkerboard" 
                style={{ 
                    backgroundPosition: `${transform.x}px ${transform.y}px`,
                    backgroundSize: `${gridSize * transform.scale}px ${gridSize * transform.scale}px`,
                    opacity: 0.1
                }} 
            />

            {/* Content Container */}
            <div 
                className="origin-top-left will-change-transform"
                style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
            >
                {children}
            </div>
        </div>
    );
});

InfiniteCanvas.displayName = 'InfiniteCanvas';
