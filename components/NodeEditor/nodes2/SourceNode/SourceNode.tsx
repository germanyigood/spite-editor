
import React from 'react';
import { SourceNode as SourceNodeType } from '../../../../types';

export const SourceNode = ({ node }: { node: SourceNodeType }) => {
    if (!node) return <div className="p-4 text-xs text-red-400">No Data</div>;
    
    return (
        <div className="w-full h-full relative group">
            <img 
                src={node.data.src} 
                className="block pointer-events-none select-none" 
                style={{ width: '100%', height: '100%', objectFit: 'fill' }}
                alt="layer source" 
                draggable={false}
            />
        </div>
    );
};
