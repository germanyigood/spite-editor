import { useCallback, useRef, useState } from 'react';
import { VectorNode, VectorPath } from '../../types';

type VectorInteractionState = 'idle' | 'drag-point' | 'drag-handle' | 'drag-new-handle';

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));

export const useVectorEngine = ({
    vectorNode,
    dispatch,
    animId,
    currentDrawTool,
    scale = 1
}: {
    vectorNode?: VectorNode;
    dispatch: any;
    animId: string;
    currentDrawTool?: string;
    scale?: number;
}) => {
    const isActive = currentDrawTool?.startsWith('path') && vectorNode && !vectorNode.disabled;
    
    const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
    const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
    const [livePaths, setLivePaths] = useState<VectorPath[] | null>(null);
    const livePathsRef = useRef<VectorPath[] | null>(null);

    const updateLivePaths = useCallback((newPaths: VectorPath[] | null) => {
        livePathsRef.current = newPaths;
        setLivePaths(newPaths);
    }, []);

    const intState = useRef<VectorInteractionState>('idle');
    const dragData = useRef<any>(null);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>, texX: number, texY: number) => {
        if (!isActive || e.button !== 0 || !vectorNode) return;
        
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const paths = livePathsRef.current || livePaths || vectorNode.data.paths || [];
        let newPaths = JSON.parse(JSON.stringify(paths)) as VectorPath[];
        
        const altKey = e.altKey;
        const ctrlKey = e.ctrlKey || e.metaKey;

        let hitPointIndex = -1;
        let hitPathId = null;
        let hitHandle: 'cp1' | 'cp2' | null = null;
        const HIT_RADIUS = 10 / scale;

        const isSelectTool = currentDrawTool === 'path-select';
        const isConvertTool = currentDrawTool === 'path-convert';
        const isDeleteTool = currentDrawTool === 'path-delete';
        const isAddTool = currentDrawTool === 'path-add';

        const effectiveAltKey = altKey || isConvertTool;
        const effectiveCtrlKey = ctrlKey || isSelectTool;
        
        let pathHitId = null;

        for (let i = newPaths.length - 1; i >= 0; i--) {
            const p = newPaths[i];
            
            if (!p || !p.points) continue;
            
            // First check if points/handles are hit
            for (let j = 0; j < p.points.length; j++) {
                const pt = p.points[j];
                
                if (p.id === selectedPathId || effectiveCtrlKey) {
                    if (pt.cp1x !== undefined && pt.cp1y !== undefined && dist(texX, texY, pt.cp1x, pt.cp1y) < HIT_RADIUS) {
                        hitPointIndex = j; hitPathId = p.id; hitHandle = 'cp1'; break;
                    }
                    if (pt.cp2x !== undefined && pt.cp2y !== undefined && dist(texX, texY, pt.cp2x, pt.cp2y) < HIT_RADIUS) {
                        hitPointIndex = j; hitPathId = p.id; hitHandle = 'cp2'; break;
                    }
                }
                
                // When path is not selected and we are not using select tool, Points are technically invisible, but let's allow hitting them anyway if they are very close? 
                // In standard tools, invisible points are NOT clickable. Let's only hit points if path is selected or we are in select tool:
                if (p.id === selectedPathId || effectiveCtrlKey || currentDrawTool === 'path') {
                    if (dist(texX, texY, pt.x, pt.y) < HIT_RADIUS) {
                        hitPointIndex = j; hitPathId = p.id; break;
                    }
                }
            }
            if (hitPathId) break;
            
            // If no points hit, maybe we hit the stroke or fill of the path itself?
            // (Only for selection, or if we want to select an unselected path)
            if (!hitPathId && !pathHitId && (effectiveCtrlKey || currentDrawTool === 'path' || isAddTool)) {
                if (p.points.length > 1) {
                    try {
                        const path2d = new Path2D();
                        path2d.moveTo(p.points[0].x, p.points[0].y);
                        for (let k = 1; k < p.points.length; k++) {
                            const pt = p.points[k];
                            const prev = p.points[k-1];
                            const cp1x = prev.cp2x ?? prev.x;
                            const cp1y = prev.cp2y ?? prev.y;
                            const cp2x = pt.cp1x ?? pt.x;
                            const cp2y = pt.cp1y ?? pt.y;
                            path2d.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pt.x, pt.y);
                        }
                        if (p.closed && p.points.length > 2) {
                            const pt = p.points[0];
                            const prev = p.points[p.points.length-1];
                            const cp1x = prev.cp2x ?? prev.x;
                            const cp1y = prev.cp2y ?? prev.y;
                            const cp2x = pt.cp1x ?? pt.x;
                            const cp2y = pt.cp1y ?? pt.y;
                            path2d.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pt.x, pt.y);
                        }
                        
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            // Check stroke hit first
                            ctx.lineWidth = 10 / scale;
                            if (ctx.isPointInStroke(path2d, texX, texY)) {
                                pathHitId = p.id;
                            } else if (p.closed && ctx.isPointInPath(path2d, texX, texY)) {
                                // Also allow clicking inside a closed path with selection tool
                                pathHitId = p.id;
                            }
                        }
                    } catch(e) {
                         // Some browsers might not like Path2D, silently fail
                    }
                }
            }
        }
        
        // If we hit a path curve but no specific point
        if (!hitPathId && pathHitId) {
            hitPathId = pathHitId;
            hitPointIndex = -1;
            hitHandle = null;
        }

        let updatedData = false;
        const activePath = newPaths.find(p => p.id === selectedPathId);
        
        if (isDeleteTool) {
            if (hitPathId && hitPointIndex !== -1 && !hitHandle) {
                const path = newPaths.find(p => p.id === hitPathId);
                if (!path || !path.points) return;
                path.points.splice(hitPointIndex, 1);
                updatedData = true;
                setSelectedPointIndex(null);
            }
        } else if (effectiveAltKey) {
            if (hitPathId && hitPointIndex !== -1) {
                setSelectedPathId(hitPathId);
                setSelectedPointIndex(hitPointIndex);
                const path = newPaths.find(p => p.id === hitPathId);
                if (!path || !path.points) return;
                const pt = path.points[hitPointIndex];
                
                if (hitHandle) {
                    pt.broken = true;
                    intState.current = 'drag-handle';
                    dragData.current = { pathId: hitPathId, ptIndex: hitPointIndex, handle: hitHandle };
                } else {
                    if (pt.cp1x !== undefined || pt.cp2x !== undefined) {
                        pt.cp1x = undefined; pt.cp1y = undefined;
                        pt.cp2x = undefined; pt.cp2y = undefined;
                        pt.broken = false;
                        updatedData = true;
                    }
                    intState.current = 'drag-new-handle';
                    dragData.current = { pathId: hitPathId, ptIndex: hitPointIndex, startX: pt.x, startY: pt.y, isSymmetric: true };
                }
            }
        } else if (effectiveCtrlKey) {
            if (hitPathId) {
                setSelectedPathId(hitPathId);
                if (hitHandle) {
                    intState.current = 'drag-handle';
                    dragData.current = { pathId: hitPathId, ptIndex: hitPointIndex, handle: hitHandle };
                } else {
                    const path = newPaths.find(p=>p.id===hitPathId);
                    if (!path || !path.points) return;
                    setSelectedPointIndex(hitPointIndex);
                    intState.current = 'drag-point';
                    dragData.current = { pathId: hitPathId, ptIndex: hitPointIndex, startX: texX, startY: texY, initPt: { ...path.points[hitPointIndex] } };
                }
            } else {
                setSelectedPathId(null);
                setSelectedPointIndex(null);
            }
        } else {
            if (hitPathId && hitPathId !== selectedPathId) {
                // Clicked on a different path, just select it
                setSelectedPathId(hitPathId);
                setSelectedPointIndex(hitPointIndex !== -1 ? hitPointIndex : null);
            } else if (hitPathId && hitPointIndex !== -1 && hitPathId === selectedPathId && !isAddTool) {
                const path = newPaths.find(p => p.id === hitPathId);
                if (!path || !path.points) return;
                if (!hitHandle) {
                    if (hitPointIndex === 0 && !path.closed && path.points.length > 2) {
                        path.closed = true;
                        updatedData = true;
                        setSelectedPathId(hitPathId);
                        setSelectedPointIndex(0);
                        
                        intState.current = 'drag-new-handle';
                        dragData.current = { pathId: hitPathId, ptIndex: 0, startX: path.points[0].x, startY: path.points[0].y, isSymmetric: true };
                    } else {
                        path.points.splice(hitPointIndex, 1);
                        updatedData = true;
                        setSelectedPointIndex(null);
                    }
                } else {
                    intState.current = 'drag-handle';
                    dragData.current = { pathId: hitPathId, ptIndex: hitPointIndex, handle: hitHandle };
                }
            } else if (isAddTool && hitPathId === selectedPathId && hitPointIndex === -1) {
                // Adding a point to the currently selected path curve
                const path = newPaths.find(p => p.id === hitPathId);
                if (!path || !path.points) return;
                // Simple insert: just append, or find closest segment
                // For simplicity, find closest segment by distance to line segments
                let bestIdx = path.points.length - 1;
                let minDist = Infinity;
                for (let k = 0; k < path.points.length; k++) {
                    const p1 = path.points[k];
                    const p2 = path.points[(k + 1) % path.points.length];
                    if (!path.closed && k === path.points.length - 1) continue;
                    // point to line segment dist
                    const l2 = (p1.x - p2.x)**2 + (p1.y - p2.y)**2;
                    let t = Math.max(0, Math.min(1, ((texX - p1.x) * (p2.x - p1.x) + (texY - p1.y) * (p2.y - p1.y)) / (l2 || 1)));
                    const projX = p1.x + t * (p2.x - p1.x);
                    const projY = p1.y + t * (p2.y - p1.y);
                    const d = (texX - projX)**2 + (texY - projY)**2;
                    if (d < minDist) {
                        minDist = d;
                        bestIdx = k;
                    }
                }
                const newPt = { x: texX, y: texY, broken: false };
                path.points.splice(bestIdx + 1, 0, newPt);
                updatedData = true;
                setSelectedPointIndex(bestIdx + 1);
            } else if (!hitHandle && !(hitPathId === selectedPathId && hitPointIndex !== -1)) {
                if (currentDrawTool === 'path') {
                    let workingPath = activePath;
                    if (!workingPath || workingPath.closed) {
                        workingPath = {
                            id: crypto.randomUUID(),
                            points: [],
                            closed: false,
                            fill: 'transparent',
                            stroke: '#ff00ff',
                            strokeWidth: 2
                        };
                        newPaths.push(workingPath);
                        setSelectedPathId(workingPath.id);
                    }
                    
                    workingPath.points.push({ x: Math.round(texX), y: Math.round(texY), broken: false });
                    setSelectedPointIndex(workingPath.points.length - 1);
                    updatedData = true;
                    
                    intState.current = 'drag-new-handle';
                    dragData.current = { pathId: workingPath.id, ptIndex: workingPath.points.length - 1, startX: texX, startY: texY, isSymmetric: true, isNew: true };
                } else {
                    setSelectedPathId(null);
                    setSelectedPointIndex(null);
                }
            }
        }

        if (updatedData) {
            updateLivePaths(newPaths);
            dispatch({ type: 'UPDATE_NODE_DATA', payload: { animId, nodeId: vectorNode.id, data: { paths: newPaths } } });
        }
    }, [isActive, vectorNode, dispatch, animId, selectedPathId, currentDrawTool, updateLivePaths]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>, texX: number, texY: number) => {
        if (!isActive || intState.current === 'idle' || !vectorNode) return;
        
        const paths = livePathsRef.current || livePaths || vectorNode.data.paths || [];
        let newPaths = JSON.parse(JSON.stringify(paths)) as VectorPath[];
        
        const { pathId, ptIndex, handle, initPt } = dragData.current;
        const path = newPaths.find(p => p && p.id === pathId);
        if (!path || !path.points) return;
        const pt = path.points[ptIndex];

        if (!pt) return;

        if (intState.current === 'drag-new-handle') {
            const dx = texX - dragData.current.startX;
            const dy = texY - dragData.current.startY;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                pt.cp2x = dragData.current.startX + dx;
                pt.cp2y = dragData.current.startY + dy;
                if (dragData.current.isSymmetric) {
                    pt.cp1x = dragData.current.startX - dx;
                    pt.cp1y = dragData.current.startY - dy;
                }
                pt.broken = false;
            }
        } else if (intState.current === 'drag-handle') {
            const dx = texX - pt.x;
            const dy = texY - pt.y;
            if (handle === 'cp1') {
                pt.cp1x = texX; pt.cp1y = texY;
                if (!pt.broken && pt.cp2x !== undefined) {
                    pt.cp2x = pt.x - dx; pt.cp2y = pt.y - dy;
                }
            } else {
                pt.cp2x = texX; pt.cp2y = texY;
                if (!pt.broken && pt.cp1x !== undefined) {
                    pt.cp1x = pt.x - dx; pt.cp1y = pt.y - dy;
                }
            }
        } else if (intState.current === 'drag-point') {
            const dx = texX - dragData.current.startX;
            const dy = texY - dragData.current.startY;
            pt.x = initPt.x + dx; pt.y = initPt.y + dy;
            if (pt.cp1x !== undefined) { pt.cp1x = initPt.cp1x + dx; pt.cp1y = initPt.cp1y + dy; }
            if (pt.cp2x !== undefined) { pt.cp2x = initPt.cp2x + dx; pt.cp2y = initPt.cp2y + dy; }
        }

        updateLivePaths(newPaths);
    }, [isActive, vectorNode, updateLivePaths]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isActive) return;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        
        if (intState.current !== 'idle' && livePathsRef.current) {
            dispatch({ type: 'UPDATE_NODE_DATA', payload: { animId, nodeId: vectorNode?.id, data: { paths: livePathsRef.current } } });
            updateLivePaths(null);
        }
        
        intState.current = 'idle';
        dragData.current = null;
    }, [isActive, dispatch, animId, vectorNode, updateLivePaths]);

    const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
         if (!isActive || !vectorNode) return;
         e.preventDefault();
         setSelectedPathId(null);
         setSelectedPointIndex(null);
    }, [isActive, vectorNode]);

    return { handlePointerDown, handlePointerMove, handlePointerUp, handleContextMenu, selectedPathId, selectedPointIndex, livePaths };
};
