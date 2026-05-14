
import React from 'react';
import { Copy, Scissors, X } from 'lucide-react';
import { TransformBox } from '../common/TransformBox';

interface SelectionOverlayProps {
    rect: { x: number, y: number, w: number, h: number };
    scale: number;
    onCopy: () => void;
    onCut: () => void;
    onClear: () => void;
    onMouseDown: (e: React.MouseEvent, id: string | number, handle?: string) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ rect, scale, onCopy, onCut, onClear, onMouseDown }) => {
    if (rect.w === 0 || rect.h === 0) return null;

    const toolbarStyle: React.CSSProperties = {
        position: 'absolute',
        left: rect.x + rect.w / 2,
        top: rect.y - 10 / scale,
        transform: `translate(-50%, -100%) scale(${1 / scale})`,
        zIndex: 100,
        pointerEvents: 'auto'
    };

    return (
        <>
            {/* Standard TransformBox for handles and movement */}
            <TransformBox
                id="current_selection"
                rect={{ x: rect.x, y: rect.y, w: rect.w, h: rect.h }}
                isSelected={true}
                color="selection"
                onMouseDown={onMouseDown}
            />

            {/* Toolbar - Prevent event propagation so clicking buttons doesn't trigger canvas logic */}
            <div 
                className="bg-panel/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl flex items-center p-1 gap-1"
                style={toolbarStyle}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    data-testid="selection-copy"
                    onClick={(e) => { e.stopPropagation(); onCopy(); }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap active:scale-95"
                >
                    <Copy size={12} className="text-cyan-400" /> Copy
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button 
                    data-testid="selection-cut"
                    onClick={(e) => { e.stopPropagation(); onCut(); }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap active:scale-95"
                >
                    <Scissors size={12} className="text-pink-500" /> Cut
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button 
                    data-testid="selection-clear"
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all active:scale-90"
                >
                    <X size={12} />
                </button>
            </div>
        </>
    );
};
