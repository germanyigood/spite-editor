
import React from 'react';

interface GlobalDropOverlayProps {
    isVisible: boolean;
}

export const GlobalDropOverlay: React.FC<GlobalDropOverlayProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-auto animate-in fade-in duration-300">
            {/* Ultra-subtle overlay with minimal blur */}
            <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-[2px] transition-all duration-500" />
            
            {/* Subtle Glowing Rim indicating the drop area */}
            <div className="absolute inset-4 border-2 border-dashed border-indigo-500/30 rounded-[2rem] animate-[pulse_2s_infinite_ease-in-out]" />
        </div>
    );
};
