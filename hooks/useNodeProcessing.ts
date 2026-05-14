
import { useState, useMemo, useEffect, useRef } from 'react';
import { NodeData, Connection, NodePayload } from '../types';
import { loadBitmap, stableHash, getTopologicalSort } from '../utils';
import { NODE_PROCESSORS } from '../components/NodeEditor/nodeProcessors';

interface UseNodeProcessingProps {
    nodes: NodeData[];
    connections: Connection[];
}

interface CacheEntry {
    inputSignature: string;
    configSignature: string;
    result: NodePayload | null;
}

export const useNodeProcessing = ({ nodes, connections }: UseNodeProcessingProps) => {
    const [outputs, setOutputs] = useState<Record<string, NodePayload | null>>({});
    
    // Persistent Cache: NodeID -> CacheEntry
    // We verify validity by checking hash(inputs) + hash(config)
    const cache = useRef<Map<string, CacheEntry>>(new Map());
    
    // Execution Token to cancel stale runs (e.g. rapid slider movement)
    const runIdRef = useRef(0);

    // 1. Determine Execution Order (Memoized)
    // This only changes if the graph topology changes (nodes added/removed, connections changed)
    // It does NOT change if node.data changes.
    const executionOrder = useMemo(() => {
        return getTopologicalSort(nodes, connections);
    }, [
        nodes.map(n => n.id).join(','), 
        connections.map(c => `${c.source}->${c.target}`).join(',')
    ]);

    // 2. Main Processing Effect
    useEffect(() => {
        const currentRunId = ++runIdRef.current;
        const checkCancelled = () => currentRunId !== runIdRef.current;

        const processGraph = async () => {
            const results: Record<string, NodePayload | null> = {};
            
            // Map for quick node lookup
            const nodeMap = new Map(nodes.map(n => [n.id, n]));
            
            // Map for node index lookup (to enforce deterministic input order matching layer order)
            const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));
            
            // Map for quick connection lookup (TargetID -> Connections[])
            const incomingMap = new Map<string, Connection[]>();
            connections.forEach(c => {
                if (!incomingMap.has(c.target)) incomingMap.set(c.target, []);
                incomingMap.get(c.target)?.push(c);
            });

            // --- SEQUENTIAL EXECUTION (Based on Topology) ---
            for (const nodeId of executionOrder) {
                if (checkCancelled()) return;

                const node = nodeMap.get(nodeId);
                if (!node) continue;

                // A. Gather Inputs
                // We strictly look up results from previous steps in this specific run
                const nodeInputs: Record<string, NodePayload> = {};
                
                // CRITICAL FIX: Sort incoming connections based on the source node's position in the node list.
                // This ensures that when we aggregate inputs (e.g. in TimelineNode), the order matches 
                // the "Global Frame Pool" order used by the UI (getGraphLayers), which also follows node list order.
                const incoming = incomingMap.get(nodeId) || [];
                incoming.sort((a, b) => {
                    const idxA = nodeIndexMap.get(a.source) ?? -1;
                    const idxB = nodeIndexMap.get(b.source) ?? -1;
                    return idxA - idxB;
                });
                
                let inputSigBuilder = "";

                for (const conn of incoming) {
                    const payload = results[conn.source]; // Must be computed already due to Topo Sort
                    if (payload) {
                        let key = conn.targetHandle || 'input';
                        
                        // FIX: If multiple connections target the same handle (e.g. Timeline),
                        // append unique suffix to prevent overwriting. 
                        // Processors using Object.values() will see all of them.
                        // Processors expecting single input usually take inputs['input'] which remains valid for the first one.
                        if (nodeInputs[key]) {
                            key = `${key}_${conn.id}`;
                        }
                        
                        nodeInputs[key] = payload;
                        
                        // Build Input Signature
                        // We use the payload's specific data signature if available (e.g. image src), or fallback to hash
                        if (payload.type === 'IMAGE' || payload.type === 'IMAGE_SEQUENCE') {
                            // Let's use a "Revision ID" attached to payload? 
                            // Or just: Check if the upstream output object is === cached upstream output object.
                        }
                    }
                }

                // B. Check Cache
                const processor = NODE_PROCESSORS[node.type as keyof typeof NODE_PROCESSORS];
                if (!processor) {
                    results[nodeId] = null;
                    continue;
                }

                // Config Hash: Node Data (excluding UI state like x,y,collapsed)
                let hashData: any = node.data;
                if (node.type === 'timeline') {
                    // Timeline optimization: playing/currentFrame don't require re-processing the inputs usually,
                    // but the Processor generates the "Current Image" for the output.
                    // So yes, Timeline needs to re-run if frame changes.
                    // BUT, Timeline logic is fast (just array index lookup), so it's fine.
                }
                const configSignature = stableHash({ data: hashData, disabled: node.disabled });
                
                // Input Signature: We construct a string based on input keys and their payloads
                const inputSignature = incoming.map(c => {
                    const p = results[c.source];
                    // Include source ID, Handle, and a signature of the payload content if possible
                    // If p is null, sig is null.
                    if (!p) return `${c.source}:null`;
                    return `${c.source}:${(p as any).src || (p as any).id || 'generated'}`; 
                }).join('|');

                const cached = cache.current.get(nodeId);
                
                // Verify Cache Hit
                // 1. Config matches
                // 2. Input Signature matches (Weak check)
                // 3. HARD CHECK: Compare actual input objects with cached input objects by reference
                let cacheHit = false;
                
                if (cached && cached.configSignature === configSignature) {
                    // Strict Reference Check on inputs
                    // REVISION: We compare inputs against the inputs used to generate the cached result.
                    const prevInputs = (cached as any).prevInputs || {};
                    const keysA = Object.keys(prevInputs);
                    const keysB = Object.keys(nodeInputs);
                    
                    if (keysA.length === keysB.length) {
                        const allMatch = keysA.every(k => prevInputs[k] === nodeInputs[k]);
                        if (allMatch) cacheHit = true;
                    }
                }

                if (cacheHit && cached) {
                    results[nodeId] = cached.result;
                } else {
                    // C. Process
                    try {
                        const result = await processor(node, nodeInputs, { loadBitmap, isCancelled: checkCancelled });
                        results[nodeId] = result;
                        
                        // Update Cache
                        cache.current.set(nodeId, {
                            inputSignature, // (legacy/debug)
                            configSignature,
                            result,
                            prevInputs: nodeInputs // Store refs for next comparison
                        } as any);
                    } catch (err) {
                        console.error(`Node ${nodeId} processing failed`, err);
                        results[nodeId] = null;
                    }
                }
            }

            if (checkCancelled()) return;

            // 3. Commit to State
            // Only update if something actually changed to avoid React render loops
            setOutputs(prev => {
                // Shallow compare keys and values
                const allKeys = new Set([...Object.keys(prev), ...Object.keys(results)]);
                let changed = false;
                for (const k of allKeys) {
                    if (prev[k] !== results[k]) {
                        changed = true; 
                        break;
                    }
                }
                return changed ? results : prev;
            });
        };

        processGraph();

        return () => {
            // Cleanup/Cancel flag set by closure (runIdRef check)
        };
    }, [
        // The dependency array controls when the topological run starts.
        // 1. Graph Structure (Order)
        executionOrder, 
        // 2. Node Configs (We need deep check or fast hash here. 
        //    Using `nodes` directly is okay if the parent component ensures immutable updates)
        nodes, 
        // 3. Connection wiring
        connections
    ]);

    return outputs;
};
