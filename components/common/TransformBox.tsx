
import React, { memo } from 'react';

export interface TransformRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface TransformBoxProps {
    id: string | number;
    rect: TransformRect;
    isSelected: boolean;
    label?: string;
    color?: 'indigo' | 'amber' | 'green' | 'blue' | 'purple' | 'cyan' | 'red' | 'selection';
    locked?: boolean;
    onMouseDown: (e: React.MouseEvent, id: string | number, handle?: string) => void;
    onClick?: (e: React.MouseEvent, id: string | number) => void;
    className?: string;
    children?: React.ReactNode; 
}

export const TransformBox = memo(({ 
    id, rect, isSelected, label, color = 'indigo', locked, onMouseDown, onClick, className = '', children 
}: TransformBoxProps) => {
    
    // Color Styles
    const colors = {
        indigo: 'border-indigo-500 bg-indigo-500/20 text-indigo-100',
        amber: 'border-amber-500 bg-amber-500/20 text-amber-100',
        green: 'border-green-500 bg-green-500/20 text-green-100',
        blue: 'border-blue-500 bg-blue-500/20 text-blue-100',
        purple: 'border-purple-500 bg-purple-500/20 text-purple-100',
        cyan: 'border-cyan-500 bg-cyan-500/20 text-cyan-100',
        red: 'border-red-500 bg-red-500/20 text-red-100',
        selection: 'border-white bg-white/5 border-dashed',
    }[color];

    const borderColor = colors.split(' ')[0];
    const bgColor = colors.split(' ')[1];
    
    const handleColorClass = {
        indigo: 'bg-indigo-500 border-white',
        amber: 'bg-amber-500 border-white',
        green: 'bg-green-500 border-white',
        blue: 'bg-blue-500 border-white',
        purple: 'bg-purple-500 border-white',
        cyan: 'bg-cyan-500 border-white',
        red: 'bg-red-500 border-white',
        selection: 'bg-white border-black',
    }[color];

    const handleStyle = `absolute w-2.5 h-2.5 border shadow-sm z-30 ${handleColorClass}`;

    return (
        <div 
            className={`absolute box-content group transition-colors 
                ${isSelected ? `${borderColor} border-2 z-20 ${bgColor}` : `border-white/30 border hover:border-white/60 hover:bg-white/5 z-10`}
                ${locked ? 'border-dashed opacity-70 pointer-events-none' : ''}
                ${className}
            `}
            style={{ 
                left: rect.x, 
                top: rect.y, 
                width: rect.w, 
                height: rect.h,
                cursor: isSelected ? 'move' : 'pointer',
                pointerEvents: 'auto'
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, id, undefined);
            }}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick(e, id);
                }
            }}
        >
            {/* Label */}
            {label && (
                <div className={`absolute top-0 left-0 -translate-y-full px-1.5 py-0.5 text-[9px] font-bold shadow-sm whitespace-nowrap pointer-events-none 
                    ${isSelected ? `${handleColorClass.split(' ')[0]} text-white rounded-t` : 'bg-black/60 text-white/70 rounded'}
                `}>
                    {label}
                </div>
            )}

            {/* Resize Handles */}
            {isSelected && !locked && (
                <>
                    <div className={`${handleStyle} -top-1.5 -left-1.5 cursor-nwse-resize`} onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, id, 'nw'); }} />
                    <div className={`${handleStyle} -top-1.5 -right-1.5 cursor-nesw-resize`} onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, id, 'ne'); }} />
                    <div className={`${handleStyle} -bottom-1.5 -left-1.5 cursor-nesw-resize`} onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, id, 'sw'); }} />
                    <div className={`${handleStyle} -bottom-1.5 -right-1.5 cursor-nwse-resize`} onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, id, 'se'); }} />
                    
                    <div className={`${handleStyle} -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`} onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, id, 'n'); }} />
                    <div className={`${handleStyle} -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`} onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, id, 's'); }} />
                    <div className={`${handleStyle} top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize`} onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, id, 'w'); }} />
                    <div className={`${handleStyle} top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize`} onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, id, 'e'); }} />
                </>
            )}

            {children}
        </div>
    );
});
