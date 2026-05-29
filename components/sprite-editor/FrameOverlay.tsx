
import React from 'react';
import { Plus } from 'lucide-react';
import { Frame, SourceNode, SpriteConfig, ToolMode, AnimationEntry, NodeData } from '../../types';
import { useProject } from '../../context/ProjectContext';
import { TransformBox } from '../common/TransformBox';

interface FrameOverlayProps {
    activeSource: SourceNode;
    activeConfig: SpriteConfig;
    selectedFrameIndex: number | null;
    toolMode: ToolMode;
    visualFrame: Frame | null;
    visualLayerPos: { id: string, x: number, y: number } | null;
    entry: AnimationEntry;
    layers: Array<{ source: SourceNode, slice?: { data: SpriteConfig } }>;
    timelineCounts: Record<number, number>;
    onFrameMouseDown: (e: React.MouseEvent, id: string | number, handle?: string) => void;
}

export const FrameOverlay: React.FC<FrameOverlayProps> = ({
    activeSource,
    activeConfig,
    selectedFrameIndex,
    toolMode,
    visualFrame,
    visualLayerPos,
    entry,
    layers,
    timelineCounts,
    onFrameMouseDown
}) => {
    const { dispatch } = useProject();

    const layerX = (visualLayerPos && visualLayerPos.id === activeSource.id) ? visualLayerPos.x : (activeSource.data.x || 0);
    const layerY = (visualLayerPos && visualLayerPos.id === activeSource.id) ? visualLayerPos.y : (activeSource.data.y || 0);

    return (
        <div className="absolute pointer-events-none" style={{ left: layerX, top: layerY }}>
            {(activeConfig?.frames || []).map((frame, i) => {
                 const isSelected = selectedFrameIndex === i;
                 const effectiveFrame = (isSelected && visualFrame) ? visualFrame : frame;

                 let globalOffset = 0;
                 for(const p of layers) {
                     if(p.source.id === activeSource.id) break;
                     if(p.slice?.data) globalOffset += p.slice.data.frames.length;
                 }
                 const globalIdx = globalOffset + i;
                 const useCount = timelineCounts[globalIdx] || 0;

                 return (
                     <TransformBox
                        key={i}
                        id={i}
                        rect={{ x: effectiveFrame.x, y: effectiveFrame.y, w: effectiveFrame.width, h: effectiveFrame.height }}
                        isSelected={isSelected}
                        label={isSelected ? (effectiveFrame.name || `${i}`) : undefined}
                        color={'indigo'}
                        locked={toolMode !== 'select'}
                        onMouseDown={onFrameMouseDown}
                     >
                         {isSelected && toolMode !== 'picker' && (
                             <button
                                 onClick={(e) => {
                                     e.stopPropagation();
                                     const tNode = entry.nodeGraph.nodes.find(n => n.type === 'timeline');
                                     if (tNode) {
                                        const newFrames = [...((tNode as any).data.frames || []), globalIdx];
                                        const updatedNode: NodeData = { ...tNode, data: { ...(tNode as any).data, frames: newFrames } };
                                        const newNodes = entry.nodeGraph.nodes.map(n => n.id === tNode.id ? updatedNode : n);
                                        dispatch({ type: 'UPDATE_NODE_GRAPH', payload: { animId: entry.id, graph: { ...entry.nodeGraph, nodes: newNodes } } });
                                     }
                                 }}
                                 className="absolute top-1 right-1 p-1 bg-indigo-600 rounded-md text-white opacity-0 group-hover:opacity-100 hover:bg-indigo-500 transition-opacity z-30 shadow-lg pointer-events-auto"
                             >
                                 <Plus size={10} />
                             </button>
                         )}

                         {useCount > 0 && (
                             <div className="absolute bottom-1 right-1 bg-green-500/90 text-white text-[9px] px-1.5 py-0.5 rounded font-bold pointer-events-none shadow-sm backdrop-blur-sm">
                                 x{useCount}
                             </div>
                         )}
                         
                         {isSelected && activeConfig.showCrosshair && (
                             <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, mixBlendMode: 'difference' }}>
                                 <line x1={effectiveFrame.width / 3} y1={0} x2={effectiveFrame.width / 3} y2={effectiveFrame.height} stroke="#ef4444" strokeWidth="1" opacity={0.8} />
                                 <line x1={(effectiveFrame.width / 3) * 2} y1={0} x2={(effectiveFrame.width / 3) * 2} y2={effectiveFrame.height} stroke="#ef4444" strokeWidth="1" opacity={0.8} />
                                 <line x1={0} y1={effectiveFrame.height / 3} x2={effectiveFrame.width} y2={effectiveFrame.height / 3} stroke="#ef4444" strokeWidth="1" opacity={0.8} />
                                 <line x1={0} y1={(effectiveFrame.height / 3) * 2} x2={effectiveFrame.width} y2={(effectiveFrame.height / 3) * 2} stroke="#ef4444" strokeWidth="1" opacity={0.8} />
                                 
                                 <line x1={effectiveFrame.width / 2} y1={(effectiveFrame.height / 2) - 10} x2={effectiveFrame.width / 2} y2={(effectiveFrame.height / 2) + 10} stroke="#ef4444" strokeWidth="1.5" opacity={1} />
                                 <line x1={(effectiveFrame.width / 2) - 10} y1={effectiveFrame.height / 2} x2={(effectiveFrame.width / 2) + 10} y2={effectiveFrame.height / 2} stroke="#ef4444" strokeWidth="1.5" opacity={1} />
                                 <circle cx={effectiveFrame.width / 2} cy={effectiveFrame.height / 2} r="1.5" fill="#ef4444" />
                             </svg>
                         )}
                     </TransformBox>
                 );
            })}
        </div>
    );
};
