
import React, { useEffect, useState } from 'react';
import { PaintNode as PaintNodeType, NodePayload } from '../../../../types';
import { BitmapView } from '../../../common/BitmapView';
import { useProject } from '../../../../context/ProjectContext';
import { Brush, RotateCcw, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '../../../common/DesignSystem';

interface PaintNodeProps {
    node: PaintNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const PaintNode = React.memo(({ node, onUpdate, input, output }: PaintNodeProps) => {
    const { dispatch } = useProject();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    
    // Integrity & Reset Logic
    useEffect(() => {
        // Resolve the current source identifier
        // If input is missing (disconnected), currentSrc is undefined.
        const currentSrc = (input && input.type === 'IMAGE') ? input.src : undefined;
        
        const recordedSrc = node.data.sourceSrc;
        const hasPaint = !!node.data.paintData;

        // Scenario 1: We have paint data, but the input connection is broken or changed source
        if (hasPaint) {
            // A. Standard case: We have a recorded source ID, and it doesn't match current input
            // (input could be undefined/disconnected, or a different image)
            if (recordedSrc && currentSrc !== recordedSrc) {
                 onUpdate(node.id, { 
                     data: { ...node.data, paintData: undefined, sourceSrc: currentSrc } 
                 });
            }
            // B. Edge case: No recorded source (e.g. drawn on generated image without src ID), 
            // but input is strictly disconnected (undefined)
            else if (!recordedSrc && !input) {
                 onUpdate(node.id, { 
                     data: { ...node.data, paintData: undefined } 
                 });
            }
        }
        
        // Scenario 2: No paint data yet, just keep the sourceSrc specific to current input
        // This ensures that when we START painting, we know what we are painting on.
        if (!hasPaint && currentSrc !== recordedSrc) {
             onUpdate(node.id, { 
                 data: { ...node.data, sourceSrc: currentSrc } 
             });
        }
    }, [input, node.data.paintData, node.data.sourceSrc, node.id, onUpdate]);

    // Use output if available (shows current paint state), else input
    const previewSrc = output 
        ? (output.type === 'IMAGE' ? output.image : null)
        : (input && (input.type === 'IMAGE' ? input.image : null));

    const handleClear = () => {
        onUpdate(node.id, { data: { ...node.data, paintData: undefined } });
        setShowClearConfirm(false);
    };

    const handleEnterDraw = () => {
        dispatch({ type: 'SET_TOOL_MODE', payload: 'draw' });
    };

    return (
        <div className="flex flex-col h-full">
             <ConfirmDialog 
                isOpen={showClearConfirm}
                title="Discard Changes?"
                description="Are you sure you want to discard your drawing changes and revert to the original source image?"
                onConfirm={handleClear}
                onCancel={() => setShowClearConfirm(false)}
                confirmText="Discard & Revert"
                danger
             />

             {/* Preview */}
             <div className="flex-1 bg-black/5 dark:bg-black/50 relative overflow-hidden min-h-0 flex items-center justify-center checkerboard group">
                {previewSrc ? (
                    <BitmapView image={previewSrc} className="w-full h-full object-contain" />
                ) : (
                    <div className="flex flex-col items-center justify-center text-txt-muted text-xs italic gap-1 opacity-70">
                        <AlertTriangle size={16} />
                        <span>No Input Source</span>
                    </div>
                )}
                
                {/* Overlay Button (Only show if we have an input to paint on) */}
                {input && (
                    <button 
                        onClick={handleEnterDraw}
                        className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-pink-600 text-white px-4 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-2 transform hover:scale-105 active:scale-95"
                    >
                        <Brush size={14} /> Enter Draw Mode
                    </button>
                )}
             </div>

             {/* Minimal Footer */}
             <div className="p-3 border-t border-border-base/10 bg-surface/30 shrink-0 flex justify-between items-center">
                 <span className="text-[10px] text-txt-muted uppercase font-bold tracking-wider">Paint Layer</span>
                 {node.data.paintData && (
                     <button 
                        onClick={() => setShowClearConfirm(true)}
                        className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded transition-colors"
                        title="Revert to Original"
                     >
                         <RotateCcw size={14} />
                     </button>
                 )}
             </div>
        </div>
    );
});
