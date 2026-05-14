
import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { NodeData, NodeType, SourceNode } from '../../types';
import { NODE_REGISTRY, RegisteredNodeType } from '../NodeEditor/nodes2';
import { Plus, Power, Trash2 } from 'lucide-react';

interface DrawModifierPanelProps {
    layerId: string;
}

export const DrawModifierPanel: React.FC<DrawModifierPanelProps> = ({ layerId }) => {
    const { state, dispatch } = useProject();
    const { activeAnimationId, animations, selectedNodeId } = state;
    const entry = animations.find(a => a.id === activeAnimationId);

    if (!entry) return null;

    const getChain = () => {
        const chain: NodeData[] = [];
        const visited = new Set();
        let currId: string | undefined = layerId;

        while(currId) {
            if (visited.has(currId)) break;
            visited.add(currId);
            const node = entry.nodeGraph.nodes.find(n => n.id === currId);
            if (!node) break;
            if (node.type !== 'grid') chain.push(node);
            else break;
            const outgoing = entry.nodeGraph.connections.find(c => c.source === currId);
            currId = outgoing?.target;
        }
        return chain;
    };

    const chain = getChain();

    const handleToggleNode = (id: string, disabled: boolean) => {
        const nodes = entry.nodeGraph.nodes.map(n => n.id === id ? { ...n, disabled } : n);
        dispatch({ type: 'UPDATE_NODE_GRAPH', payload: { animId: entry.id, graph: { ...entry.nodeGraph, nodes } } });
    };

    const handleRemoveNode = (id: string) => {
        const nodeToRemove = entry.nodeGraph.nodes.find(n => n.id === id);
        if (!nodeToRemove || nodeToRemove.type === 'source') return;
        
        const incoming = entry.nodeGraph.connections.find(c => c.target === id);
        const outgoing = entry.nodeGraph.connections.find(c => c.source === id);
        
        let nextConns = entry.nodeGraph.connections.filter(c => c.target !== id && c.source !== id);
        if (incoming && outgoing) {
            nextConns.push({ 
                id: `c_bridge_${Date.now()}`, 
                source: incoming.source, 
                sourceHandle: incoming.sourceHandle,
                target: outgoing.target,
                targetHandle: outgoing.targetHandle
            });
        }
        
        const nextNodes = entry.nodeGraph.nodes.filter(n => n.id !== id);
        dispatch({ type: 'UPDATE_NODE_GRAPH', payload: { animId: entry.id, graph: { ...entry.nodeGraph, nodes: nextNodes, connections: nextConns } } });
    };

    const handleAddWarp = () => {
        const lastInChain = chain[chain.length - 1];
        if (!lastInChain) return;

        // Find the original source node to get proper dimensions
        const sourceNode = entry.nodeGraph.nodes.find(n => n.id === layerId) as SourceNode | undefined;
        const w = sourceNode?.data.width || 100;
        const h = sourceNode?.data.height || 100;

        // 1. Find the connection that we are going to split (the one going OUT of the chain into the Grid)
        const gridConn = entry.nodeGraph.connections.find(c => c.source === lastInChain.id);
        if (!gridConn) return;

        // 2. Create the new node with proper initial dimensions
        const warpId = `warp_${Date.now()}`;
        const newWarp: NodeData = {
            id: warpId, 
            type: 'warp', 
            x: lastInChain.x + 200, 
            y: lastInChain.y, 
            width: 220, 
            height: 250,
            disabled: false,
            collapsed: false,
            isDefault: false,
            pinnedAt: undefined,
            data: { 
                pins: [
                    {x: 0, y: 0}, 
                    {x: w, y: 0}, 
                    {x: w, y: h}, 
                    {x: 0, y: h}
                ], 
                targetWidth: w, 
                targetHeight: h, 
                interpolation: 'nearest' 
            }
        };

        // 3. Construct new connection state
        const nextNodes = [...entry.nodeGraph.nodes, newWarp];
        const nextConns = entry.nodeGraph.connections.filter(c => c.id !== gridConn.id);
        
        nextConns.push({ 
            id: `c_pre_${warpId}`, 
            source: lastInChain.id, 
            sourceHandle: gridConn.sourceHandle || 'output', 
            target: warpId, 
            targetHandle: 'input' 
        });
        
        nextConns.push({ 
            id: `c_post_${warpId}`, 
            source: warpId, 
            sourceHandle: 'output', 
            target: gridConn.target, 
            targetHandle: gridConn.targetHandle || 'input' 
        });

        dispatch({ 
            type: 'UPDATE_NODE_GRAPH', 
            payload: { 
                animId: entry.id, 
                graph: { ...entry.nodeGraph, nodes: nextNodes, connections: nextConns } 
            } 
        });
        
        dispatch({ type: 'SELECT_NODE', payload: warpId });
    };

    return (
        <div className="space-y-1 py-1">
            <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[8px] font-bold text-txt-muted uppercase tracking-widest">Modifiers</span>
                <button 
                    onClick={handleAddWarp} 
                    className="p-1 text-cyan-500 hover:bg-cyan-500/10 rounded-md transition-all hover:scale-110 active:scale-90"
                    title="Add Perspective Warp"
                >
                    <Plus size={12} strokeWidth={3} />
                </button>
            </div>
            {chain.map((node) => {
                const bundle = NODE_REGISTRY[node.type as RegisteredNodeType];
                if (!bundle) return null;
                const isSelected = selectedNodeId === node.id;
                const isDisabled = !!node.disabled;
                return (
                    <div key={node.id} onClick={() => dispatch({ type: 'SELECT_NODE', payload: node.id })}
                         className={`group flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                             isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-surface/20 border-transparent hover:bg-surface/40'
                         }`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? `bg-${bundle.colorClass}-500/20 border-${bundle.colorClass}-500/30 text-${bundle.colorClass}-500` : 'bg-surface border-border-base/10 text-txt-muted'}`}>
                            <bundle.icon size={10} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-[10px] font-bold truncate ${isDisabled ? 'text-txt-muted line-through' : 'text-txt-primary'}`}>{bundle.title}</div>
                        </div>
                        {node.type !== 'source' && (
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleToggleNode(node.id, !isDisabled); }} className={`p-1 rounded ${isDisabled ? 'text-txt-muted' : 'text-green-500'}`}><Power size={10} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.id); }} className="p-1 rounded text-txt-muted hover:text-red-500"><Trash2 size={10} /></button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
