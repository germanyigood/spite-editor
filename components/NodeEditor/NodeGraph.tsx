
import React, { useRef, memo, useMemo, useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { NodeData, Connection, NodePayload, NodeType } from '../../types';
import { Image as ImageIcon, Cable, Trash2, Sparkles, Brush, Grid3X3, CircuitBoard, PaintBucket, ImagePlus, Palette, CircleDashed, Layers, Scissors, Lightbulb, Film, Crop, Scaling, Gauge, MonitorUp, FastForward } from 'lucide-react';

// Logic & Data
import { useGraphInteraction } from './hooks/useGraphInteraction';

// Registry
import { NODE_REGISTRY, RegisteredNodeType } from './nodes2';

// UI Components
import { ContextMenu, ContextMenuConfig, ContextMenuEntry } from '../common/design-system/ContextMenu';
import { NodeWrapper } from './common/NodeWrapper';

interface NodeGraphProps {
    visible?: boolean;
    nodeOutputs: Record<string, NodePayload | null>;
}

interface MemoizedNodeInnerProps {
    id: string;
    type: string;
    data: any; 
    inputs: Record<string, NodePayload | null>; 
    output: NodePayload | null | undefined;
    onUpdate: (id: string, updates: Partial<NodeData>) => void;
}

const MemoizedNodeInner = memo(({ id, type, data, inputs, output, onUpdate }: MemoizedNodeInnerProps) => {
    const bundle = NODE_REGISTRY[type as RegisteredNodeType];
    if (!bundle) return null;
    const NodeComponent = bundle.component as React.ComponentType<any>;
    
    const nodeProxy = { id, type, data };

    // Resolve shorthand 'input' for easy access in node components
    const primaryInput = inputs['input'] || inputs['main'] || Object.values(inputs)[0] || null;

    return (
        <NodeComponent 
            node={nodeProxy} 
            onUpdate={onUpdate}
            input={primaryInput} 
            inputs={inputs} 
            output={output}
        />
    );
}, (prev, next) => {
    if (prev.id !== next.id) return false;
    if (prev.type !== next.type) return false;
    if (prev.data !== next.data) return false;
    if (prev.output !== next.output) return false;
    
    // Ignore function identities if they close over moving values, NodeGraph will handle it 
    // or we assume they don't break functionality since it's just update triggers.
    const prevKeys = Object.keys(prev.inputs);
    const nextKeys = Object.keys(next.inputs);
    if (prevKeys.length !== nextKeys.length) return false;
    for (const key of prevKeys) {
        if (prev.inputs[key] !== next.inputs[key]) return false;
    }
    return true;
});

const MemoizedConnection = memo(({ c, sNode, tNode, outputPayload, setContextMenu, getSocketY }: any) => {
    const sx = sNode.x + sNode.width; 
    const sy = getSocketY(sNode, c.sourceHandle, 'outputs');
    const tx = tNode.x; 
    const ty = getSocketY(tNode, c.targetHandle, 'inputs');
    const d = `M ${sx} ${sy} C ${sx+50} ${sy}, ${tx-50} ${ty}, ${tx} ${ty}`;
    
    let strokeColor = "#9ca3af"; 
    if (outputPayload) {
        if (outputPayload.type === 'IMAGE') strokeColor = "#22d3ee";
        else if (outputPayload.type === 'IMAGE_SEQUENCE') strokeColor = "#ec4899";
        else if (outputPayload.type === 'TIMELINE') strokeColor = "#4ade80";
        else if (outputPayload.type === 'OPTIMIZATION') strokeColor = "#eab308";
    }
    
    return (
        <g>
            <path d={d} stroke="transparent" strokeWidth="15" fill="none" className="cursor-pointer"
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, connectionId: c.id }); }}
            />
            <path d={d} stroke={strokeColor} strokeWidth="3" fill="none" className="pointer-events-none" />
        </g>
    );
}, (prev, next) => {
    return (
        prev.c.id === next.c.id &&
        prev.sNode.x === next.sNode.x && prev.sNode.y === next.sNode.y &&
        prev.sNode.width === next.sNode.width && prev.sNode.height === next.sNode.height &&
        prev.sNode.collapsed === next.sNode.collapsed &&
        // target
        prev.tNode.x === next.tNode.x && prev.tNode.y === next.tNode.y &&
        prev.tNode.width === next.tNode.width && prev.tNode.height === next.tNode.height &&
        prev.tNode.collapsed === next.tNode.collapsed &&
        prev.outputPayload === next.outputPayload
    );
});

const getSocketYImpl = (node: NodeData, handle: string | undefined, type: 'inputs' | 'outputs') => {
    const bundle = NODE_REGISTRY[node.type as RegisteredNodeType];
    const schema = bundle ? bundle.io : { inputs: {}, outputs: {} };
    const keys = Object.keys(schema?.[type] || {});
    const idx = handle ? keys.indexOf(handle) : 0;
    const safeIdx = Math.max(0, idx);
    const step = 100 / (keys.length + 1);
    const pct = step * (safeIdx + 1);
    const effectiveHeight = node.collapsed ? 32 : node.height;
    return node.y + (effectiveHeight * (pct / 100));
};

const NodeGraph: React.FC<NodeGraphProps> = ({ visible = true, nodeOutputs }) => {
    const { state, dispatch } = useProject();
    const { activeAnimationId, animations } = state;
    const currentAnim = animations.find(a => a.id === activeAnimationId);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- SINGLE SOURCE OF TRUTH ---
    const rawNodes = currentAnim?.nodeGraph.nodes || [];
    const connections = currentAnim?.nodeGraph.connections || [];
    const rawTransform = currentAnim?.nodeGraph.viewport || { x: 0, y: 0, scale: 1 };

    const {
        dragState,
        dragEdgePos,
        contextMenu,
        localDragOffset,
        setContextMenu,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleSocketDown,
        handleDeleteNode,
        handleResizeNode,
        handleDeleteConnection,
        handleAddNode,
        updateNodeData
    } = useGraphInteraction(
        containerRef, 
        rawTransform,
        rawNodes,
        connections
    );

    // Apply local overlay drag offset for smooth 60fps rendering without Context lag
    const transform = useMemo(() => {
        if (localDragOffset && dragState?.type === 'pan' && dragState.initialX !== undefined) {
            return { ...rawTransform, x: dragState.initialX + localDragOffset.dx, y: dragState.initialY! + localDragOffset.dy };
        }
        return rawTransform;
    }, [rawTransform, localDragOffset, dragState]);

    const nodes = useMemo(() => {
        if (localDragOffset && dragState?.type === 'node' && dragState.id && dragState.initialX !== undefined) {
            return rawNodes.map(n => n.id === dragState.id ? { ...n, x: dragState.initialX! + localDragOffset.dx / transform.scale, y: dragState.initialY! + localDragOffset.dy / transform.scale } : n);
        }
        if (localDragOffset && dragState?.type === 'resize' && dragState.id && dragState.initialW !== undefined) {
            const worldDx = localDragOffset.dx / transform.scale;
            const worldDy = localDragOffset.dy / transform.scale;
            return rawNodes.map(n => {
                if (n.id !== dragState.id) return n;
                let newX = dragState.initialX!, newY = dragState.initialY!, newW = dragState.initialW!, newH = dragState.initialH!;
                if (dragState.resizeDir?.includes('e')) newW = Math.max(100, dragState.initialW! + worldDx);
                else if (dragState.resizeDir?.includes('w')) { const pW = dragState.initialW! - worldDx; if (pW >= 100) { newW = pW; newX = dragState.initialX! + worldDx; } }
                if (dragState.resizeDir?.includes('s')) newH = Math.max(80, dragState.initialH! + worldDy);
                else if (dragState.resizeDir?.includes('n')) { const pH = dragState.initialH! - worldDy; if (pH >= 80) { newH = pH; newY = dragState.initialY! + worldDy; } }
                return { ...n, x: newX, y: newY, width: newW, height: newH };
            });
        }
        return rawNodes;
    }, [rawNodes, localDragOffset, dragState, transform.scale]);

    const contextMenuConfig = useMemo<ContextMenuConfig | null>(() => {
        if (!contextMenu) return null;
        
        const isEdgeAction = !!contextMenu.connectionId;
        
        const menuItems: ContextMenuEntry[] = [];
        
        if (isEdgeAction) {
            menuItems.push({
                id: 'delete_connection',
                label: 'Delete Wire',
                icon: Trash2,
                danger: true,
                onClick: () => {
                    handleDeleteConnection(contextMenu.connectionId!);
                }
            });
            menuItems.push({ id: 'sep_1', separator: true });
        }

        const addNode = (type: NodeType) => {
            handleAddNode(type);
        };

        const groups = [
            [
                { type: 'generate', label: 'AI Sprite Gen', icon: Sparkles, colorClass: 'text-purple-500 dark:text-purple-400' },
                { type: 'paint', label: 'Paint', icon: Brush, colorClass: 'text-purple-500 dark:text-purple-400' },
                { type: 'pixelize', label: 'Smart Pixelize', icon: Grid3X3, colorClass: 'text-cyan-600 dark:text-cyan-400' }
            ],
            [
                { type: 'chroma', label: 'Chroma Key', icon: CircuitBoard, colorClass: 'text-purple-500 dark:text-purple-400' },
                { type: 'fill_color', label: 'Background Color', icon: PaintBucket, colorClass: 'text-blue-500 dark:text-blue-400' },
                { type: 'composite', label: 'Composite Image', icon: ImagePlus, colorClass: 'text-blue-500 dark:text-blue-400' },
                { type: 'color_correct', label: 'Color Correct', icon: Palette, colorClass: 'text-blue-500 dark:text-blue-400' },
                { type: 'grid', label: 'Slice Grid', icon: Scissors, colorClass: 'text-pink-600 dark:text-pink-400' }
            ],
            [
                { type: 'outline', label: 'Outline', icon: CircleDashed, colorClass: 'text-gray-500 dark:text-gray-400' },
                { type: 'drop_shadow', label: 'Drop Shadow', icon: Layers, colorClass: 'text-gray-500 dark:text-gray-400' }
            ],
            [
                { type: 'normal_map', label: 'Normal Map', icon: Lightbulb, colorClass: 'text-amber-500 dark:text-amber-400' },
                { type: 'warp', label: 'Warp Transform', icon: Scissors, colorClass: 'text-amber-500 dark:text-amber-400' },
                { type: 'seamless', label: 'Seamless Tile', icon: Grid3X3, colorClass: 'text-pink-500 dark:text-pink-300' }
            ],
            [
                { type: 'frame_normalize', label: 'Frame Size', icon: Scaling, colorClass: 'text-cyan-600 dark:text-cyan-400' },
                { type: 'timeline', label: 'Timeline', icon: Film, colorClass: 'text-green-600 dark:text-green-400' },
                { type: 'frame_skip', label: 'Decimate Frames', icon: FastForward, colorClass: 'text-indigo-500 dark:text-indigo-400' },
                { type: 'crop', label: 'Crop', icon: Crop, colorClass: 'text-orange-600 dark:text-orange-400' },
                { type: 'resize', label: 'Resize Output', icon: Scaling, colorClass: 'text-cyan-600 dark:text-cyan-400' },
                { type: 'optimize', label: 'Optimization', icon: Gauge, colorClass: 'text-yellow-600 dark:text-yellow-400' }
            ]
        ];

        groups.forEach((group, index) => {
            if (index > 0 && menuItems.length > 0 && !('separator' in menuItems[menuItems.length - 1])) {
                menuItems.push({ id: `group_sep_${index}`, separator: true });
            }
            group.forEach(item => {
                menuItems.push({
                    id: item.type,
                    label: item.label,
                    icon: item.icon,
                    colorClass: item.colorClass,
                    onClick: () => addNode(item.type as NodeType)
                });
            });
        });

        if (!isEdgeAction) {
            menuItems.push({ id: 'out_sep', separator: true });
            menuItems.push({
                id: 'output',
                label: 'Output',
                icon: MonitorUp,
                colorClass: 'text-blue-500 dark:text-blue-400',
                onClick: () => addNode('output')
            });
        }

        return {
            x: contextMenu.x,
            y: contextMenu.y,
            header: isEdgeAction ? (
                <><span>Connection</span><Cable size={10} className="text-yellow-500" /></>
            ) : 'Add Node',
            items: menuItems
        };
    }, [contextMenu, handleAddNode, handleDeleteConnection]);

    if (!currentAnim) return null;

    return (
        <div 
            ref={containerRef}
            data-testid="node-graph-bg"
            className="w-full h-full relative overflow-hidden bg-app"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({x:e.clientX, y:e.clientY}); }}
            style={{ display: visible ? 'block' : 'none' }}
        >
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ 
                     backgroundImage: 'radial-gradient(circle, var(--tw-gradient-from) 1px, transparent 1px)', 
                     '--tw-gradient-from': 'rgb(var(--c-text-muted))', 
                     backgroundSize: `${20*transform.scale}px ${20*transform.scale}px`,
                     backgroundPosition: `${transform.x}px ${transform.y}px`
                 } as any} 
            />
            
            <ContextMenu 
                config={contextMenuConfig} 
                onClose={() => setContextMenu(null)}
            />

            <div className="w-full h-full origin-top-left" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
                <svg className="absolute top-0 left-0 overflow-visible z-0">
                    {connections.map(c => {
                        const sNode = nodes.find(n => n.id === c.source);
                        const tNode = nodes.find(n => n.id === c.target);
                        if (!sNode || !tNode) return null;
                        
                        return (
                            <MemoizedConnection 
                                key={c.id}
                                c={c}
                                sNode={sNode}
                                tNode={tNode}
                                outputPayload={nodeOutputs[sNode.id]}
                                setContextMenu={setContextMenu}
                                getSocketY={getSocketYImpl}
                            />
                        );
                    })}

                    {dragEdgePos && dragState?.id && dragState?.handleId && (
                        <path 
                            d={`M ${nodes.find(n => n.id === dragState.id)?.x! + nodes.find(n => n.id === dragState.id)?.width!} ${getSocketYImpl(nodes.find(n => n.id === dragState.id)!, dragState.handleId, 'outputs')} C ${nodes.find(n => n.id === dragState.id)?.x! + nodes.find(n => n.id === dragState.id)?.width! + 50} ${getSocketYImpl(nodes.find(n => n.id === dragState.id)!, dragState.handleId, 'outputs')}, ${dragEdgePos.x - 50} ${dragEdgePos.y}, ${dragEdgePos.x} ${dragEdgePos.y}`}
                            stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" fill="none" className="pointer-events-none text-txt-primary" 
                        />
                    )}
                </svg>

                {nodes.map(n => {
                    const bundle = NODE_REGISTRY[n.type as RegisteredNodeType];
                    if (!bundle) return null;
                    
                    // Pass null for connections that don't have a payload yet
                    const nodeInputs: Record<string, NodePayload | null> = {};
                    connections.filter(c => c.target === n.id).forEach(c => {
                        nodeInputs[c.targetHandle || 'input'] = nodeOutputs[c.source] ?? null;
                    });

                    return (
                        <NodeWrapper 
                            key={n.id} 
                            node={n} 
                            title={bundle.title} 
                            icon={bundle.icon || ImageIcon}
                            colorClass={bundle.colorClass as any || 'blue'}
                            variant={(bundle as any).variant || 'default'}
                            onDelete={!n.isDefault ? () => handleDeleteNode(n.id) : undefined}
                            onResize={handleResizeNode}
                            connectedInputs={connections.filter(c => c.target === n.id).map(c => c.targetHandle || 'input')}
                            connectedOutputs={connections.filter(c => c.source === n.id).map(c => c.sourceHandle || 'output')}
                            onSocketDown={handleSocketDown}
                            outputPayload={nodeOutputs[n.id] || undefined} 
                            onUpdate={updateNodeData}
                        >
                            <MemoizedNodeInner 
                                id={n.id} type={n.type} data={n.data} 
                                inputs={nodeInputs} output={nodeOutputs[n.id]} onUpdate={updateNodeData}
                            />
                        </NodeWrapper>
                    );
                })}
            </div>
        </div>
    );
};

export default NodeGraph;
