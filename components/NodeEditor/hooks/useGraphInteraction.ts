
import React, { useState, MouseEvent, WheelEvent, RefObject, useCallback, useEffect, useRef } from 'react';
import { ViewportTransform, NodeData, Connection, NodeType, SocketDefinition } from '../../../types';
import { NODE_REGISTRY, RegisteredNodeType, applyNodeUpdates } from '../nodes2';
import { ResizeDirection } from '../common/NodeWrapper';
import { useProject } from '../../../context/ProjectContext';

interface DragState {
    type: 'node' | 'edge' | 'pan' | 'resize';
    id?: string;
    handleId?: string; 
    startX: number;
    startY: number;
    initialX?: number;
    initialY?: number;
    initialW?: number;
    initialH?: number;
    resizeDir?: ResizeDirection;
}

export const useGraphInteraction = (
    containerRef: RefObject<HTMLDivElement>,
    transform: ViewportTransform,
    nodes: NodeData[],
    connections: Connection[]
) => {
    const { state, dispatch } = useProject();
    const { activeAnimationId, animations } = state;
    const currentAnim = animations.find(a => a.id === activeAnimationId);

    const [dragState, setDragState] = useState<DragState | null>(null);
    const [contextMenu, setContextMenu] = useState<{x:number, y:number, connectionId?: string} | null>(null);
    const [dragEdgePos, setDragEdgePos] = useState<{x:number, y:number} | null>(null);
    
    // Local state for smooth dragging without updating the whole app via context every frame
    const [localDragOffset, setLocalDragOffset] = useState<{dx: number, dy: number} | null>(null);

    // Using a ref to access latest state inside window listeners and stable callbacks without re-binding
    const dragStateRef = useRef<DragState | null>(null);
    dragStateRef.current = dragState;
    
    const localDragOffsetRef = useRef<{dx: number, dy: number} | null>(null);
    localDragOffsetRef.current = localDragOffset;

    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;
    
    const connectionsRef = useRef(connections);
    connectionsRef.current = connections;
    
    const transformRef = useRef(transform);
    transformRef.current = transform;
    
    const currentAnimRef = useRef(currentAnim);
    currentAnimRef.current = currentAnim;

    const lastContextUpdateRef = useRef<number>(0);

    const getWorldPos = useCallback((cx: number, cy: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if(!rect) return {x:0, y:0};
        const st = transformRef.current;
        return {
            x: (cx - rect.left - st.x) / st.scale,
            y: (cy - rect.top - st.y) / st.scale
        };
    }, [containerRef]);

    const updateGraph = useCallback((updates: Partial<typeof currentAnim.nodeGraph>) => {
        const anim = currentAnimRef.current;
        if (!anim) return;
        dispatch({
            type: 'UPDATE_NODE_GRAPH',
            payload: {
                animId: anim.id,
                graph: { ...anim.nodeGraph, ...updates }
            }
        });
    }, [dispatch]);

    const updateNodeData = useCallback((id: string, updates: Partial<NodeData>) => {
        updateGraph({ nodes: applyNodeUpdates(nodesRef.current, connectionsRef.current, id, updates) });
    }, [updateGraph]);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        setContextMenu(null);
        const curTransform = transformRef.current;
        if (e.button === 1 || (e.button === 0 && e.target === containerRef.current)) {
            setDragState({ type: 'pan', startX: e.clientX, startY: e.clientY, initialX: curTransform.x, initialY: curTransform.y });
            return;
        }
        
        const target = e.target as HTMLElement;
        const nodeEl = target.closest('[data-node-id]');
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        const isButton = target.tagName === 'BUTTON' || !!target.closest('button');

        if (nodeEl && !isInput && !isButton) {
            const id = nodeEl.getAttribute('data-node-id')!;
            const node = nodesRef.current.find(n => n.id === id);
            if (node) {
                dispatch({ type: 'SELECT_NODE', payload: id });
                setDragState({ type: 'node', id, startX: e.clientX, startY: e.clientY, initialX: node.x, initialY: node.y });
            }
        } else if (e.target === containerRef.current) {
            dispatch({ type: 'SELECT_NODE', payload: null });
        }
    }, [containerRef, dispatch]);

    // --- WINDOW LISTENERS FOR ROBUST DRAGGING ---
    useEffect(() => {
        const handleGlobalMove = (e: globalThis.MouseEvent) => {
            const ds = dragStateRef.current;
            if (!ds || !currentAnim) return;

            const curTransform = transformRef.current;
            const curNodes = nodesRef.current;
            
            const dx = e.clientX - ds.startX;
            const dy = e.clientY - ds.startY;

            if (ds.type === 'pan' && ds.initialX !== undefined) {
                setLocalDragOffset({ dx, dy });
                const now = Date.now();
                if (now - lastContextUpdateRef.current > 1000) {
                    updateGraph({ viewport: { ...curTransform, x: ds.initialX + dx, y: ds.initialY! + dy } });
                    lastContextUpdateRef.current = now;
                }
            } 
            else if (ds.type === 'node' && ds.id && ds.initialX !== undefined) {
                setLocalDragOffset({ dx, dy });
                const now = Date.now();
                if (now - lastContextUpdateRef.current > 1000) {
                    const nextNodes = curNodes.map(n => n.id === ds.id ? { ...n, x: ds.initialX! + dx / curTransform.scale, y: ds.initialY! + dy / curTransform.scale } : n);
                    updateGraph({ nodes: nextNodes });
                    lastContextUpdateRef.current = now;
                }
            } 
            else if (ds.type === 'resize' && ds.id && ds.resizeDir && ds.initialW !== undefined) {
                setLocalDragOffset({ dx, dy });
                const worldDx = dx / curTransform.scale;
                const worldDy = dy / curTransform.scale;
                const now = Date.now();
                if (now - lastContextUpdateRef.current > 1000) {
                    const nextNodes = curNodes.map(n => {
                        if (n.id !== ds.id) return n;
                        let newX = ds.initialX!, newY = ds.initialY!, newW = ds.initialW!, newH = ds.initialH!;
                        if (ds.resizeDir?.includes('e')) newW = Math.max(100, ds.initialW! + worldDx);
                        else if (ds.resizeDir?.includes('w')) { const pW = ds.initialW! - worldDx; if (pW >= 100) { newW = pW; newX = ds.initialX! + worldDx; } }
                        if (ds.resizeDir?.includes('s')) newH = Math.max(80, ds.initialH! + worldDy);
                        else if (ds.resizeDir?.includes('n')) { const pH = ds.initialH! - worldDy; if (pH >= 80) { newH = pH; newY = ds.initialY! + worldDy; } }
                        return { ...n, x: newX, y: newY, width: newW, height: newH };
                    });
                    updateGraph({ nodes: nextNodes });
                    lastContextUpdateRef.current = now;
                }
            }
            else if (ds.type === 'edge') {
                setDragEdgePos(getWorldPos(e.clientX, e.clientY));
            }
        };

        const handleGlobalUp = (e: globalThis.MouseEvent) => {
            const ds = dragStateRef.current;
            if (!ds) return;

            const curTransform = transformRef.current;
            const curNodes = nodesRef.current;

            // Commit final position if there was a scheduled but uncommitted drag
            const dOffset = localDragOffsetRef.current;
            if (dOffset && currentAnimRef.current) {
                if (ds.type === 'pan' && ds.initialX !== undefined) {
                    updateGraph({ viewport: { ...curTransform, x: ds.initialX + dOffset.dx, y: ds.initialY! + dOffset.dy } });
                }
                else if (ds.type === 'node' && ds.id && ds.initialX !== undefined) {
                    const nextNodes = curNodes.map(n => n.id === ds.id ? { ...n, x: ds.initialX! + dOffset.dx / curTransform.scale, y: ds.initialY! + dOffset.dy / curTransform.scale } : n);
                    updateGraph({ nodes: nextNodes });
                }
                else if (ds.type === 'resize' && ds.id && ds.resizeDir && ds.initialW !== undefined) {
                    const worldDx = dOffset.dx / curTransform.scale;
                    const worldDy = dOffset.dy / curTransform.scale;
                    const nextNodes = curNodes.map(n => {
                        if (n.id !== ds.id) return n;
                        let newX = ds.initialX!, newY = ds.initialY!, newW = ds.initialW!, newH = ds.initialH!;
                        if (ds.resizeDir?.includes('e')) newW = Math.max(100, ds.initialW! + worldDx);
                        else if (ds.resizeDir?.includes('w')) { const pW = ds.initialW! - worldDx; if (pW >= 100) { newW = pW; newX = ds.initialX! + worldDx; } }
                        if (ds.resizeDir?.includes('s')) newH = Math.max(80, ds.initialH! + worldDy);
                        else if (ds.resizeDir?.includes('n')) { const pH = ds.initialH! - worldDy; if (pH >= 80) { newH = pH; newY = ds.initialY! + worldDy; } }
                        return { ...n, x: newX, y: newY, width: newW, height: newH };
                    });
                    updateGraph({ nodes: nextNodes });
                }
            }

            if (ds.type === 'edge' && ds.id && ds.handleId) {
                 const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
                 const socket = target?.closest('[data-socket-type="in"]');
                 if (socket) {
                     const targetId = socket.getAttribute('data-socket-node');
                     const targetHandle = socket.getAttribute('data-socket-handle');
                     
                     if (targetId && targetHandle && targetId !== ds.id) {
                        const targetNode = curNodes.find(n => n.id === targetId);
                        
                        // --- CONNECTION LIMIT LOGIC ---
                        // Check Schema for Connection Constraints
                        const curConns = connectionsRef.current;
                        let nextConns = curConns;
                        let maxConnections = 1; // Default to single connection per input

                        if (targetNode) {
                            const bundle = NODE_REGISTRY[targetNode.type as RegisteredNodeType];
                            if (bundle && bundle.io && bundle.io.inputs) {
                                const inputDef = bundle.io.inputs[targetHandle];
                                if (inputDef && typeof inputDef === 'object' && 'maxConnections' in inputDef && !Array.isArray(inputDef)) {
                                    maxConnections = (inputDef as SocketDefinition).maxConnections ?? 1;
                                }
                            }
                        }

                        // If default behavior (max=1), remove existing connections to this socket
                        if (maxConnections === 1) {
                            nextConns = curConns.filter(c => !(c.target === targetId && c.targetHandle === targetHandle));
                        }
                        
                        const newConnections = [...nextConns, { id: `c_${Date.now()}`, source: ds.id, sourceHandle: ds.handleId, target: targetId, targetHandle }];
                        // Trigger Topology Sync when new connection is made (e.g. connecting Grid to Timeline)
                        const syncedNodes = applyNodeUpdates(curNodes, newConnections, ds.id!, {});
                        
                        updateGraph({ 
                            connections: newConnections,
                            nodes: syncedNodes
                        });
                     }
                 }
            }
            setDragState(null);
            setDragEdgePos(null);
            setLocalDragOffset(null);
        };

        if (dragState) {
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('mouseup', handleGlobalUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        };
    }, [dragState, transform, nodes, connections, updateGraph, currentAnim, getWorldPos]);

    const handleSocketDown = useCallback((e: MouseEvent, type: 'in'|'out', nodeId: string, handleId: string) => {
        if(type === 'out') {
            setDragEdgePos(getWorldPos(e.clientX, e.clientY));
            setDragState({ type: 'edge', id: nodeId, handleId, startX: 0, startY: 0 });
        } else {
            // Logic to disconnect: Find connection to this input socket
            const curConns = connectionsRef.current;
            const curNodes = nodesRef.current;
            const existing = curConns.find(c => c.target === nodeId && (c.targetHandle === handleId || (!c.targetHandle && handleId === 'input')));
            if(existing) {
                // Trigger Sync when connection is removed
                const nextConns = curConns.filter(c => c.id !== existing.id);
                const syncedNodes = applyNodeUpdates(curNodes, nextConns, nodeId, {}); // Minimal update to trigger graph refresh
                updateGraph({ 
                    connections: nextConns,
                    nodes: syncedNodes 
                });
                
                setDragEdgePos(getWorldPos(e.clientX, e.clientY));
                setDragState({ type: 'edge', id: existing.source, handleId: existing.sourceHandle || 'output', startX:0, startY:0 });
            }
        }
    }, [getWorldPos, updateGraph]);

    const handleWheel = useCallback((e: WheelEvent) => {
        const curTransform = transformRef.current;
        const s = Math.min(4, Math.max(0.1, curTransform.scale - e.deltaY * 0.003));
        const rect = containerRef.current?.getBoundingClientRect();
        if(!rect) return;
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const wx = (mx - curTransform.x) / curTransform.scale, wy = (my - curTransform.y) / curTransform.scale;
        updateGraph({ viewport: { x: mx - wx * s, y: my - wy * s, scale: s } });
    }, [containerRef, updateGraph]);

    const handleDeleteNode = useCallback((id: string) => {
        const curNodes = nodesRef.current;
        const curConns = connectionsRef.current;
        const nextNodes = curNodes.filter(n => n.id !== id);
        const nextConns = curConns.filter(c => c.source !== id && c.target !== id);
        
        updateGraph({ nodes: nextNodes, connections: nextConns });
        if (state.selectedNodeId === id) dispatch({ type: 'SELECT_NODE', payload: null });
    }, [state.selectedNodeId, dispatch, updateGraph]);

    const handleDeleteConnection = useCallback((id: string) => {
        const curNodes = nodesRef.current;
        const curConns = connectionsRef.current;
        const nextConns = curConns.filter(c => c.id !== id);
        // Trigger Sync
        const syncedNodes = applyNodeUpdates(curNodes, nextConns, curNodes[0]?.id, {});
        updateGraph({ connections: nextConns, nodes: syncedNodes });
    }, [updateGraph]);

    const handleResizeStart = useCallback((e: React.MouseEvent, id: string, dir: ResizeDirection) => {
        e.stopPropagation();
        const curNodes = nodesRef.current;
        const n = curNodes.find(n => n.id === id);
        if (!n) return;
        setDragState({ type: 'resize', id, resizeDir: dir, startX: e.clientX, startY: e.clientY, initialW: n.width, initialH: n.height, initialX: n.x, initialY: n.y });
    }, []);

    const handleAddNode = useCallback((type: NodeType) => {
        if(!contextMenu || !currentAnimRef.current) return;
        const curNodes = nodesRef.current;
        const curConns = connectionsRef.current;
        
        const wm = getWorldPos(contextMenu.x, contextMenu.y);
        const newNodeId = `${type}_${Date.now()}`;
        const newNode = { id: newNodeId, type, x: wm.x - 110, y: wm.y - 125, width: 220, height: 250, data: {} } as NodeData;
        
        if (contextMenu.connectionId) {
            const conn = curConns.find(c => c.id === contextMenu.connectionId);
            const bundle = NODE_REGISTRY[type as RegisteredNodeType];
            if (conn && bundle) {
                const inHandle = Object.keys(bundle.io.inputs)[0] || 'input';
                const outHandle = Object.keys(bundle.io.outputs)[0] || 'output';
                
                const nextConns = curConns.filter(c => c.id !== contextMenu.connectionId);
                const c1 = { id: `c_${Date.now()}_1`, source: conn.source, sourceHandle: conn.sourceHandle, target: newNodeId, targetHandle: inHandle };
                const c2 = { id: `c_${Date.now()}_2`, source: newNodeId, sourceHandle: outHandle, target: conn.target, targetHandle: conn.targetHandle };
                
                const newConnections = [...nextConns, c1, c2];
                const newNodes = [...curNodes, newNode];
                const syncedNodes = applyNodeUpdates(newNodes, newConnections, newNodeId, {});

                updateGraph({ 
                    nodes: syncedNodes, 
                    connections: newConnections 
                });
            } else {
                updateGraph({ nodes: [...curNodes, newNode] });
            }
        } else {
            updateGraph({ nodes: [...curNodes, newNode] });
        }
        setContextMenu(null);
    }, [contextMenu, getWorldPos, updateGraph]);

    return { dragState, dragEdgePos, contextMenu, localDragOffset, setContextMenu, handleMouseDown, handleMouseMove: () => {}, handleMouseUp: () => {}, handleWheel, handleSocketDown, handleDeleteNode, handleDeleteConnection, handleResizeNode: handleResizeStart, handleAddNode, updateNodeData };
};
