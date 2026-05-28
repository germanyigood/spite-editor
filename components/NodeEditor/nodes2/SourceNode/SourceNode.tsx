
import React from 'react';
import { SourceNode as SourceNodeType } from '../../../../types';

export const SourceNode = ({ node }: { node: SourceNodeType }) => {
    if (!node) return <div className="p-4 text-xs text-red-400">No Data</div>;
    
    return (
        <div className="w-full h-full relative group">
            {node.data.name && (
                <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity z-10 truncate max-w-[90%]">
                    {node.data.name}
                </div>
            )}
            <img 
                src={node.data.src || undefined} 
                className="block pointer-events-none select-none" 
                style={{ width: '100%', height: '100%', objectFit: 'fill' }}
                alt="layer source" 
                draggable={false}
            />
        </div>
    );
};
