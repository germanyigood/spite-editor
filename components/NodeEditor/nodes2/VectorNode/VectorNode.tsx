import React from 'react';
import { VectorNode as IVectorNode } from '../../../../types';
import { useProject } from '../../../../context/ProjectContext';
import { PenTool } from 'lucide-react';

export const VectorNodeComponent: React.FC<{
    node: IVectorNode;
    selected: boolean;
    onUpdate: (id: string, updates: any) => void;
}> = ({ node, onUpdate }) => {
    const { dispatch } = useProject();
    
    // Default values based on first path or fallbacks
    const firstPath = node.data?.paths?.[0];
    const strokeColor = firstPath?.stroke || '#ff00ff';
    const fillColor = firstPath?.fill || 'transparent';
    const strokeWidth = firstPath?.strokeWidth ?? 2;

    const handleUpdateAllPaths = (key: 'stroke' | 'fill' | 'strokeWidth', value: any) => {
        if (!node.data?.paths) return;
        const newPaths = node.data.paths.map(p => ({ ...p, [key]: value }));
        onUpdate(node.id, { paths: newPaths });
    };

    return (
        <div className="flex flex-col space-y-2 p-3 text-xs text-txt-secondary bg-bg-panel/50">
            <div className="text-[10px] uppercase font-bold tracking-wider mb-1">Vector Config</div>
            <div className="flex justify-between items-center bg-bg-input px-2 py-1.5 rounded">
                <span>Paths</span>
                <span className="font-mono bg-bg-surface px-1.5 rounded text-fuchsia-400">
                    {node.data?.paths?.length || 0}
                </span>
            </div>
            
            <div className="flex gap-2">
                <div className="flex-1 flex flex-col space-y-1">
                    <label className="text-[10px] tracking-wider text-txt-muted uppercase">Line Color</label>
                    <div className="flex items-center gap-1.5">
                        <input type="color" value={strokeColor === 'transparent' ? '#000000' : strokeColor} onChange={e => handleUpdateAllPaths('stroke', e.target.value)} className="w-5 h-5 rounded cursor-pointer shrink-0 opacity-80 hover:opacity-100" />
                        <button onClick={() => handleUpdateAllPaths('stroke', 'transparent')} className={`text-[10px] px-1.5 py-0.5 rounded ${strokeColor === 'transparent' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-surface hover:bg-white/10'}`}>None</button>
                    </div>
                </div>
                <div className="flex-1 flex flex-col space-y-1">
                    <label className="text-[10px] tracking-wider text-txt-muted uppercase">Fill Color</label>
                    <div className="flex items-center gap-1.5">
                        <input type="color" value={fillColor === 'transparent' ? '#000000' : fillColor} onChange={e => handleUpdateAllPaths('fill', e.target.value)} className="w-5 h-5 rounded cursor-pointer shrink-0 opacity-80 hover:opacity-100" />
                        <button onClick={() => handleUpdateAllPaths('fill', 'transparent')} className={`text-[10px] px-1.5 py-0.5 rounded ${fillColor === 'transparent' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-surface hover:bg-white/10'}`}>None</button>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col space-y-1 mt-1">
                 <label className="text-[10px] tracking-wider text-txt-muted uppercase">Thickness</label>
                 <input type="range" min={0} max={20} value={strokeWidth} onChange={(e) => handleUpdateAllPaths('strokeWidth', parseInt(e.target.value))} className="w-full accent-fuchsia-500" />
            </div>

            <button 
                onClick={() => dispatch({ type: 'SET_TOOL_MODE', payload: 'draw' })}
                className="w-full mt-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white py-1.5 rounded flex items-center justify-center gap-2 transition-colors"
                title="Edit paths in viewport"
            >
                <PenTool size={14} /> Edit Paths (Viewport)
            </button>
            <div className="text-[10px] text-txt-muted leading-tight mt-1 text-center italic">
                Draw vector paths with the Pen tool in Draw Mode.
            </div>
        </div>
    );
};
