
import React from 'react';
import { NodeType, NodeData, NodeIOSchema, Connection } from '../../../types';
import { LucideIcon } from 'lucide-react';

import { SourceBundle } from './SourceNode';
import { ChromaBundle } from './ChromaNode';
import { GridBundle } from './GridNode';
import { WarpBundle } from './WarpNode'; // New
import { NormalMapBundle } from './NormalMapNode';
import { TimelineBundle } from './TimelineNode';
import { CropBundle } from './CropNode';
import { OutputBundle } from './OutputNode';
import { SeamlessBundle } from './SeamlessNode';
import { ColorCorrectBundle } from './ColorCorrectNode';
import { ResizeBundle } from './ResizeNode';
import { FrameNormalizeBundle } from './FrameNormalizeNode';
import { OptimizeBundle } from './OptimizeNode';
import { OutlineBundle } from './OutlineNode';
import { DropShadowBundle } from './DropShadowNode';
import { GenerateBundle } from './GenerateNode';
import { CompositeBundle } from './CompositeNode';
import { FillBundle } from './FillNode';
import { PaintBundle } from './PaintNode';
import { PixelizeBundle } from './PixelizeNode';
import { FrameSkipBundle } from './FrameSkipNode';

// --- Type Definitions ---

export interface NodeBundle {
    type: NodeType;
    title: string;
    component: React.ComponentType<any>;
    processor: any; // Typed loosely here to avoid circular imports, specifically NodeProcessor
    icon: LucideIcon;
    colorClass: string;
    variant?: 'default' | 'clean';
    io: NodeIOSchema;
    /**
     * Optional Lifecycle: Run side-effects on the entire graph when this node is updated.
     * @param node The updated node instance
     * @param allNodes The entire list of nodes in the graph
     * @returns A new list of nodes (if side effects occurred) or the original list
     */
    onGraphUpdate?: (node: NodeData, allNodes: NodeData[], connections: Connection[]) => NodeData[];
}

// --- Registry ---

export const NODE_REGISTRY: Record<string, NodeBundle> = {
    source: SourceBundle,
    generate: GenerateBundle,
    paint: PaintBundle,
    pixelize: PixelizeBundle,
    chroma: ChromaBundle,
    warp: WarpBundle,
    grid: GridBundle,
    normal_map: NormalMapBundle,
    timeline: TimelineBundle,
    crop: CropBundle,
    resize: ResizeBundle,
    frame_normalize: FrameNormalizeBundle,
    output: OutputBundle,
    seamless: SeamlessBundle,
    color_correct: ColorCorrectBundle,
    frame_skip: FrameSkipBundle,
    optimize: OptimizeBundle,
    outline: OutlineBundle,
    drop_shadow: DropShadowBundle,
    composite: CompositeBundle,
    fill_color: FillBundle
} as const;

export type RegisteredNodeType = keyof typeof NODE_REGISTRY;

export const getProcessor = (type: NodeType) => {
    return NODE_REGISTRY[type as RegisteredNodeType]?.processor || null;
};

// --- Centralized Update Logic ---

/**
 * Applies updates to a specific node and executes any node-defined side effects (onGraphUpdate).
 * This eliminates "magic controllers" in the UI layer.
 */
export const applyNodeUpdates = (
    nodes: NodeData[], 
    connections: Connection[],
    nodeId: string, 
    updates: Partial<NodeData>
): NodeData[] => {
    // 1. Apply the direct update
    const nextNodes = nodes.map(n => n.id === nodeId ? { ...n, ...updates } as NodeData : n);
    
    // 2. Find the updated node instance
    const targetNode = nextNodes.find(n => n.id === nodeId);
    if (!targetNode) return nextNodes;

    // 3. Lookup Node Definition
    const bundle = NODE_REGISTRY[targetNode.type as RegisteredNodeType];
    
    // 4. Execute Node-Specific Side Effects (if defined)
    if (bundle && bundle.onGraphUpdate) {
        return bundle.onGraphUpdate(targetNode, nextNodes, connections);
    }

    return nextNodes;
};
