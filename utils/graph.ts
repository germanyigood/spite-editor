
import { NodeGraphData, NodeData, NodeType, SourceNode, GridNode, TimelineNode, KeyingConfig, Connection } from "../types";

/**
 * Finds the last node in a linear chain starting from startNodeId, 
 * stopping before Grid/Timeline nodes. Used to get the "final look" of a layer.
 */
export const findLastModifier = (graph: NodeGraphData | undefined, startNodeId: string): NodeData | undefined => {
    if (!graph || !graph.nodes || !graph.connections) return undefined;
    
    let currentId: string | undefined = startNodeId;
    let lastNode: NodeData | undefined = graph.nodes.find(n => n.id === startNodeId);
    const visited = new Set<string>();

    while (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);

        const node = graph.nodes.find(n => n.id === currentId);
        if (!node || node.type === 'grid' || node.type === 'timeline') break;
        
        lastNode = node;
        
        const conn = graph.connections.find(c => c.source === currentId);
        currentId = conn?.target;
    }
    
    return lastNode;
};

export const findModifierByType = (graph: NodeGraphData | undefined, startNodeId: string, targetType: NodeType): NodeData | undefined => {
    if (!graph || !graph.nodes || !graph.connections) return undefined;
    const queue = [startNodeId];
    const visited = new Set<string>();
    while(queue.length > 0) {
        const currId = queue.shift()!;
        if(visited.has(currId)) continue;
        visited.add(currId);
        const node = graph.nodes.find(n => n && n.id === currId);
        if(node && node.type === targetType) return node;
        const outgoing = graph.connections.filter(c => c && c.source === currId);
        for(const c of outgoing) { if (c && c.target) queue.push(c.target); }
    }
    return undefined;
};

export const findUpstreamNode = (graph: NodeGraphData | undefined, startNodeId: string, targetType: NodeType): NodeData | undefined => {
    if (!graph || !graph.nodes || !graph.connections) return undefined;
    const queue = [startNodeId];
    const visited = new Set<string>();
    while(queue.length > 0) {
        const currId = queue.shift()!;
        if(visited.has(currId)) continue;
        visited.add(currId);
        const node = graph.nodes.find(n => n && n.id === currId);
        if(node && node.type === targetType) return node;
        const incoming = graph.connections.filter(c => c && c.target === currId);
        for(const c of incoming) { if (c && c.source) queue.push(c.source); }
    }
    return undefined;
};

export const getGraphLayers = (graph: NodeGraphData | undefined): Array<{ source: SourceNode, slice: GridNode | undefined }> => {
    if (!graph || !graph.nodes || !graph.connections) return [];
    const sources = graph.nodes.filter(n => n && n.type === 'source') as SourceNode[];
    return sources.map(source => {
        const q = [source.id];
        const v = new Set();
        let foundGrid: GridNode | undefined;
        while(q.length > 0) {
             const curr = q.shift()!;
             if(v.has(curr)) continue;
             v.add(curr);
             const n = graph.nodes.find(no => no && no.id === curr);
             if(n && n.type === 'grid') { foundGrid = n as GridNode; break; }
             const out = graph.connections.filter(c => c && c.source === curr);
             out.forEach(c => c && q.push(c.target));
        }
        return { source, slice: foundGrid };
    });
};

export const getGraphBgConfig = (graph: NodeGraphData | undefined, activeLayerId?: string | null): KeyingConfig => {
    const defaultCfg: KeyingConfig = { 
        enabled: false, keyColor: '#00ff00', similarity: 20, smoothness: 10, spill: 50, clipBlack: 0, clipWhite: 0,
        colorCorrection: { brightness: 0, contrast: 0, saturation: 0, temperature: 0 }
    };
    if (!graph || !graph.nodes || !graph.connections) return defaultCfg;
    if (activeLayerId) {
        const next = graph.connections.find(c => c && c.source === activeLayerId);
        if (next) {
            const target = graph.nodes.find(n => n && n.id === next.target);
            if (target && target.type === 'chroma') return target.data;
        }
    }
    return defaultCfg;
};

export const getGraphTimeline = (graph: NodeGraphData | undefined): number[] => {
    if (!graph || !graph.nodes) return [];
    const t = graph.nodes.find(n => n && n.type === 'timeline');
    return (t && (t as any).data) ? (t as any).data.frames || [] : [];
};

/**
 * Topologically synchronizes Grid output frames to Timeline nodes.
 * 
 * 1. Determines global frame indices for all Grids (based on layer order).
 * 2. For each Timeline node, finds UPSTREAM connected Grid nodes.
 * 3. Populates the Timeline with frame indices from ONLY those connected grids.
 * 4. Respects `autoUpdateTimeline: false` on Grid nodes (skips updates for those branches).
 */
export const syncTimelineToGrid = (nodes: NodeData[], connections: Connection[], resetCursor: boolean = false): NodeData[] => {
    if (!nodes || !Array.isArray(nodes)) return [];
    
    // 1. Calculate Global Frame Ranges for all Grids
    // This order mimics `getGraphLayers` which dictates the flattened `generatedFrames` list in Preview.
    const layers = getGraphLayers({ nodes, connections, viewport: {x:0,y:0,scale:1} });
    const gridIndexMap = new Map<string, number[]>();
    let globalFrameIndex = 0;

    layers.forEach(({ slice }) => {
        if (slice) {
            const count = slice.data.totalFrames || 0;
            // Create range [start, start+count]
            const indices = Array.from({ length: count }, (_, i) => globalFrameIndex + i);
            gridIndexMap.set(slice.id, indices);
            globalFrameIndex += count;
        }
    });

    // 2. Identify Upstream Grids for a Node (BFS Backwards)
    const findConnectedGrids = (startNodeId: string): GridNode[] => {
        const grids: GridNode[] = [];
        const visited = new Set<string>();
        const queue = [startNodeId];

        while(queue.length > 0) {
            const currId = queue.shift()!;
            if (visited.has(currId)) continue;
            visited.add(currId);

            const node = nodes.find(n => n.id === currId);
            
            // If we hit a grid, we add it and STOP going further upstream on this branch
            // (Assuming linear flow: Source -> Grid -> Timeline)
            if (node && node.type === 'grid') {
                grids.push(node as GridNode);
                continue; 
            }

            // Find incoming connections
            const incoming = connections.filter(c => c.target === currId);
            incoming.forEach(c => queue.push(c.source));
        }
        
        // Reverse to match the "Source Layer" order roughly
        return grids;
    };

    // 3. Update Timelines
    return nodes.map(node => {
        if (node.type !== 'timeline') return node;

        const timelineNode = node as TimelineNode;
        const upstreamGrids = findConnectedGrids(node.id);
        
        const validFrames = new Set<number>();

        // Collect all potentially valid frames for this timeline based on connectivity
        upstreamGrids.forEach(grid => {
            const indices = gridIndexMap.get(grid.id) || [];
            
            // If auto-update is explicitly disabled, skip adding frames from this grid.
            if (grid.data.autoUpdateTimeline !== false) {
                indices.forEach(idx => validFrames.add(idx));
            }
        });

        const currentFrames = timelineNode.data.frames || [];
        
        // 1. Keep existing frames that are still valid (preserves user order)
        const newFrames = currentFrames.filter((f: number) => validFrames.has(f));
        
        // 2. Add any completely new frames to the end
        const existingSet = new Set(newFrames);
        validFrames.forEach(f => {
            if (!existingSet.has(f)) {
                newFrames.push(f);
            }
        });

        // Ensure cursor is valid
        let newCursor = timelineNode.data.currentFrame || 0;
        if (resetCursor) {
            newCursor = 0;
        } else if (newCursor >= newFrames.length) {
            newCursor = Math.max(0, newFrames.length - 1);
        }
        
        // 3. Compare specifically BEFORE mutating the node
        // We want to avoid causing a state change if the arrays are functionally identical
        const isIdentical = currentFrames.length === newFrames.length && 
            currentFrames.every((f: number, i: number) => f === newFrames[i]);

        if (isIdentical && newCursor === timelineNode.data.currentFrame) {
            return node;
        }

        return { 
            ...node, 
            data: { ...node.data, frames: newFrames, currentFrame: newCursor } 
        };
    });
};
