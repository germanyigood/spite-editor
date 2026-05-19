
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
        
        // On Mac Trackpad: two-finger swipe has ctrlKey=false and generates deltaX/deltaY for panning.
        // Pinch-to-zoom has ctrlKey=true and generates deltaY for zooming.
        if (!e.ctrlKey) {
            // Trackpad Pan / Mouse wheel vertical pan
            const newX = transform.x - e.deltaX;
            const newY = transform.y - e.deltaY;
            onChange({ x: newX, y: newY, scale: transform.scale });
            return;
        }

        // Calculate new scale additively for robustness against huge deltaY from trackpads
        const newScale = Math.min(maxScale, Math.max(minScale, transform.scale - e.deltaY * 0.003));
        
        // Calculate zoom origin (mouse position)
        const container = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - container.left;
        const mouseY = e.clientY - container.top;

        // Calculate original world pos under mouse
        const worldX = (mouseX - transform.x) / transform.scale;
        const worldY = (mouseY - transform.y) / transform.scale;

        // Reposition to keep mouse over the same world coordinate
        const newX = mouseX - worldX * newScale;
        const newY = mouseY - worldY * newScale;

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
