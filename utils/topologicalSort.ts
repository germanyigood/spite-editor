
import { NodeData, Connection } from "../types";

/**
 * Performs a Topological Sort on the graph to determine execution order.
 */
export const getTopologicalSort = (nodes: NodeData[], connections: Connection[]): string[] => {
    if (!nodes || !Array.isArray(nodes)) return [];
    
    const adj = new Map<string, string[]>();
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const order: string[] = [];

    nodes.forEach(n => {
        if (n && n.id) adj.set(n.id, []);
    });

    if (connections && Array.isArray(connections)) {
        connections.forEach(c => {
            if (c && adj.has(c.source) && adj.has(c.target)) {
                adj.get(c.source)?.push(c.target);
            }
        });
    }

    const visit = (nodeId: string) => {
        if (tempVisited.has(nodeId)) return;
        if (visited.has(nodeId)) return;

        tempVisited.add(nodeId);
        const neighbors = adj.get(nodeId) || [];
        for (const neighbor of neighbors) {
            visit(neighbor);
        }

        tempVisited.delete(nodeId);
        visited.add(nodeId);
        order.push(nodeId);
    };

    const sources = nodes.filter(n => n && n.type === 'source');
    const others = nodes.filter(n => n && n.type !== 'source');
    
    [...sources, ...others].forEach(node => {
        if (node && !visited.has(node.id)) {
            visit(node.id);
        }
    });

    return order.reverse();
};
