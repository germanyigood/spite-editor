
import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Frame, AnimationEntry, SpriteConfig, SourceNode, WarpNode } from '../../types';
import { useActionHandler } from '../../hotkeys';

export const useSpriteInteraction = (
    containerRef: React.RefObject<HTMLDivElement>,
    transform: { x: number, y: number, scale: number },
    setTransform: React.Dispatch<React.SetStateAction<{ x: number, y: number, scale: number }>>,
    entry: AnimationEntry,
    activeLayerId: string | null,
    activeSource: SourceNode | undefined,
    activeConfig: SpriteConfig | undefined,
    layers: Array<{ source: SourceNode }>,
    warpNode: WarpNode | undefined,
    selectionRect: {x:number, y:number, w:number, h:number} | null,
    onSelectionChange?: (rect: {x:number,y:number,w:number,h:number} | null) => void,
    isPanToolActive: boolean = false,
    isMoveToolActive: boolean = false
) => {
    const { state, dispatch } = useProject();
    const { toolMode, selectedFrameIndex } = state;

    const [visualFrame, setVisualFrame] = useState<Frame | null>(null);
    const [visualLayerPos, setVisualLayerPos] = useState<{id: string, x: number, y: number} | null>(null);
    const [visualPins, setVisualPins] = useState<Array<{x: number, y: number}>>([]);
    const [isPanning, setIsPanning] = useState(false);

    const transformRef = useRef(transform);
    useEffect(() => {
        transformRef.current = transform;
    }, [transform]);

    const selectionRectRef = useRef<{x:number, y:number, w:number, h:number} | null>(selectionRect);

    useEffect(() => {
        selectionRectRef.current = selectionRect;
    }, [selectionRect]);

    useEffect(() => {
        if (warpNode?.data.pins) {
            setVisualPins(warpNode.data.pins);
        } else {
            setVisualPins([]);
        }
    }, [warpNode?.id, warpNode?.data.pins]);

    const dragRef = useRef<{
        startX: number;
        startY: number;
        initialFrame?: Frame;
        initialLayerPos?: { x: number, y: number };
        initialPins?: Array<{x: number, y: number}>;
        initialRect?: { x: number, y: number, w: number, h: number };
        mode: 'none' | 'pan' | 'layer' | 'frame_move' | 'frame_resize' | 'warp_pin' | 'selection' | 'selection_move' | 'selection_resize';
        targetId?: string | number;
        resizeHandle?: string;
        selectionOrigin?: { x: number, y: number };
    }>({ startX: 0, startY: 0, mode: 'none' });

    const isSpacePressed = useRef(false);

    useActionHandler('sprite-editor', 'canvas.pan.start', () => { isSpacePressed.current = true; }, []);
    useActionHandler('sprite-editor', 'canvas.pan.end', () => { isSpacePressed.current = false; }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        const isSelectionMode = toolMode === 'draw' && onSelectionChange;
        const isPanClick = e.button === 1 || 
                           (e.button === 0 && isSpacePressed.current) || 
                           (e.button === 0 && e.ctrlKey) || 
                           (e.button === 2 && e.ctrlKey) ||
                           (e.button === 0 && isPanToolActive);

        if (isPanClick) {
            setIsPanning(true);
            dragRef.current = { startX: e.clientX, startY: e.clientY, mode: 'pan' };
            return;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const imgX = (mouseX - transform.x) / transform.scale;
        const imgY = (mouseY - transform.y) / transform.scale;

        if (onSelectionChange && e.button === 0 && toolMode === 'draw') {
            const s = selectionRectRef.current;
            if (s && imgX >= s.x && imgX <= s.x + s.w && imgY >= s.y && imgY <= s.y + s.h) return;
            dragRef.current = { mode: 'selection', startX: e.clientX, startY: e.clientY, selectionOrigin: { x: imgX, y: imgY } };
            onSelectionChange(null);
            return;
        }

        if ((toolMode === 'move_layer' || (toolMode === 'draw' && isMoveToolActive)) && e.button === 0) {
            for (let i = layers.length - 1; i >= 0; i--) {
                const l = layers[i].source;
                const lx = l.data.x || 0;
                const ly = l.data.y || 0;
                if (imgX >= lx && imgX <= lx + (l.data.width||100) && imgY >= ly && imgY <= ly + (l.data.height||100)) {
                    dispatch({ type: 'SELECT_LAYER', payload: l.id });
                    dragRef.current = { mode: 'layer', targetId: l.id, startX: e.clientX, startY: e.clientY, initialLayerPos: { x: lx, y: ly } };
                    return;
                }
            }
        }
    };

    const handleSelectionMouseDown = (e: React.MouseEvent, id: string | number, handle?: string) => {
        if (!onSelectionChange || !selectionRectRef.current) return;
        if (e.button === 1 || isSpacePressed.current) {
            setIsPanning(true);
            dragRef.current = { startX: e.clientX, startY: e.clientY, mode: 'pan' };
            return;
        }
        e.stopPropagation();
        dragRef.current = { mode: handle ? 'selection_resize' : 'selection_move', resizeHandle: handle, startX: e.clientX, startY: e.clientY, initialRect: { ...selectionRectRef.current } };
    };

    const handleFrameMouseDown = (e: React.MouseEvent, id: string | number, handle?: string) => {
        if (toolMode !== 'select' || !activeConfig || !activeConfig.frames) return;
        if (e.button === 1 || isSpacePressed.current) {
            setIsPanning(true);
            dragRef.current = { startX: e.clientX, startY: e.clientY, mode: 'pan' };
            return;
        }
        const frameIndex = Number(id);
        const frame = activeConfig.frames[frameIndex];
        if (!frame) return;
        dispatch({ type: 'SELECT_FRAME', payload: frameIndex });
        if (handle) dragRef.current = { mode: 'frame_resize', targetId: frameIndex, startX: e.clientX, startY: e.clientY, initialFrame: { ...frame }, resizeHandle: handle };
        else dragRef.current = { mode: 'frame_move', targetId: frameIndex, startX: e.clientX, startY: e.clientY, initialFrame: { ...frame } };
    };

    const handleWarpPinMouseDown = (e: React.MouseEvent, index: number) => {
        if (e.button === 1 || isSpacePressed.current) {
            setIsPanning(true);
            dragRef.current = { startX: e.clientX, startY: e.clientY, mode: 'pan' };
            return;
        }
        e.stopPropagation();
        if (e.button !== 0) return;
        if (!warpNode?.data.pins) return;
        dragRef.current = { mode: 'warp_pin', targetId: index, startX: e.clientX, startY: e.clientY, initialPins: [...(warpNode.data.pins)] };
    };

    useEffect(() => {
        const handleWindowMove = (e: MouseEvent) => {
            if (dragRef.current.mode === 'none') return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;

            if (dragRef.current.mode === 'pan') {
                setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
                dragRef.current.startX = e.clientX;
                dragRef.current.startY = e.clientY;
                return;
            }

            const zDx = dx / transformRef.current.scale;
            const zDy = dy / transformRef.current.scale;

            if (dragRef.current.mode === 'selection' && dragRef.current.selectionOrigin && onSelectionChange) {
                const ox = dragRef.current.selectionOrigin.x;
                const oy = dragRef.current.selectionOrigin.y;
                const curX = ox + zDx;
                const curY = oy + zDy;
                onSelectionChange({ x: Math.min(ox, curX), y: Math.min(oy, curY), w: Math.abs(zDx), h: Math.abs(zDy) });
            }

            if (dragRef.current.mode === 'selection_move' && dragRef.current.initialRect && onSelectionChange) {
                const init = dragRef.current.initialRect;
                onSelectionChange({ ...init, x: Math.round(init.x + zDx), y: Math.round(init.y + zDy) });
            }

            if (dragRef.current.mode === 'selection_resize' && dragRef.current.initialRect && onSelectionChange) {
                const init = dragRef.current.initialRect;
                const h = dragRef.current.resizeHandle!;
                let { x, y, w, h: height } = init;
                if (h.includes('e')) w += zDx;
                if (h.includes('s')) height += zDy;
                if (h.includes('w')) { x += zDx; w -= zDx; }
                if (h.includes('n')) { y += zDy; height -= zDy; }
                onSelectionChange({ x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(height)) });
            }

            if (dragRef.current.mode === 'layer' && dragRef.current.initialLayerPos) {
                setVisualLayerPos({ id: dragRef.current.targetId as string, x: dragRef.current.initialLayerPos.x + zDx, y: dragRef.current.initialLayerPos.y + zDy });
            }

            if ((dragRef.current.mode === 'frame_move' || dragRef.current.mode === 'frame_resize') && dragRef.current.initialFrame) {
                const init = dragRef.current.initialFrame;
                let newX = init.x; let newY = init.y; let newW = init.width; let newH = init.height;
                if (dragRef.current.mode === 'frame_move') { newX += zDx; newY += zDy; } 
                else if (dragRef.current.mode === 'frame_resize' && dragRef.current.resizeHandle) {
                    const h = dragRef.current.resizeHandle;
                    if (h.includes('e')) newW += zDx; if (h.includes('s')) newH += zDy;
                    if (h.includes('w')) { newW -= zDx; newX += zDx; } if (h.includes('n')) { newH -= zDy; newY += zDy; }
                }
                setVisualFrame({ ...init, x: Math.round(newX), y: Math.round(newY), width: Math.max(1, Math.round(newW)), height: Math.max(1, Math.round(newH)) });
            }

            if (dragRef.current.mode === 'warp_pin' && dragRef.current.initialPins && warpNode) {
                const idx = dragRef.current.targetId as number;
                if (dragRef.current.initialPins[idx]) {
                    const nextPins = [...dragRef.current.initialPins];
                    nextPins[idx] = { x: dragRef.current.initialPins[idx].x + zDx, y: dragRef.current.initialPins[idx].y + zDy };
                    setVisualPins(nextPins);
                }
            }
        };

        const handleWindowUp = (e: MouseEvent) => {
            if (dragRef.current.mode === 'none') return;
            const { mode, targetId, initialFrame, startX, startY, initialLayerPos, initialPins } = dragRef.current;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const zDx = dx / transformRef.current.scale;
            const zDy = dy / transformRef.current.scale;

            if (mode === 'layer' && initialLayerPos) {
                dispatch({ type: 'UPDATE_LAYER', payload: { animId: entry.id, layerId: targetId as string, updates: { x: Math.round(initialLayerPos.x + zDx), y: Math.round(initialLayerPos.y + zDy) }, resetTimeline: false } });
            }

            if ((mode === 'frame_move' || mode === 'frame_resize') && initialFrame && activeLayerId && activeConfig) {
                const init = initialFrame;
                let newX = init.x; let newY = init.y; let newW = init.width; let newH = init.height;
                if (mode === 'frame_move') { newX += zDx; newY += zDy; } 
                else if (dragRef.current.resizeHandle) {
                    const h = dragRef.current.resizeHandle;
                    if (h.includes('e')) newW += zDx; if (h.includes('s')) newH += zDy;
                    if (h.includes('w')) { newW -= zDx; newX += zDx; } if (h.includes('n')) { newH -= zDy; newY += zDy; }
                }
                const newFrames = [...activeConfig.frames];
                newFrames[targetId as number] = { ...init, x: Math.round(newX), y: Math.round(newY), width: Math.max(1, Math.round(newW)), height: Math.max(1, Math.round(newH)) };
                dispatch({ type: 'UPDATE_LAYER', payload: { animId: entry.id, layerId: activeLayerId, updates: { spriteConfig: { ...activeConfig, frames: newFrames } }, resetTimeline: false } });
            }

            if (mode === 'pan') {
                dispatch({ type: 'UPDATE_EDITOR_TRANSFORM', payload: { animId: entry.id, transform: transformRef.current } });
            }

            if (mode === 'warp_pin' && initialPins && warpNode) {
                const idx = targetId as number;
                if (initialPins[idx]) {
                    const nextPins = [...initialPins];
                    nextPins[idx] = { x: initialPins[idx].x + zDx, y: initialPins[idx].y + zDy };
                    dispatch({ 
                        type: 'UPDATE_NODE_DATA', 
                        payload: { animId: entry.id, nodeId: warpNode.id, data: { pins: nextPins } } 
                    });
                }
            }

            dragRef.current = { startX: 0, startY: 0, mode: 'none' };
            setVisualFrame(null); setVisualLayerPos(null); setIsPanning(false);
        };

        window.addEventListener('mousemove', handleWindowMove);
        window.addEventListener('mouseup', handleWindowUp);
        return () => {
            window.removeEventListener('mousemove', handleWindowMove);
            window.removeEventListener('mouseup', handleWindowUp);
        };
    }, [activeLayerId, activeConfig, dispatch, entry.id, warpNode, onSelectionChange]);

    return { handleMouseDown, handleSelectionMouseDown, handleFrameMouseDown, handleWarpPinMouseDown, isPanning, visualFrame, visualLayerPos, visualPins };
};
