import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SourceNode, PaintNode, WarpNode, NodePayload } from '../../types';
import { getPerspectiveTransform, transformPoint, floodFill } from '../../utils/math';
import { loadBitmap } from '../../utils';

interface DrawingEngineProps {
    layer: SourceNode;
    paintNode?: PaintNode;
    warpNode?: WarpNode;
    paintInputPayload?: NodePayload | null;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    dispatch: any;
    animId: string;
    currentDrawTool?: 'brush' | 'eraser' | 'select' | 'bucket' | 'rect' | 'ellipse' | 'path';
}

export const useDrawingEngine = ({
    layer,
    paintNode,
    warpNode,
    paintInputPayload,
    canvasRef,
    dispatch,
    animId,
    currentDrawTool
}: DrawingEngineProps) => {
    const workingCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
    const [isPointerDown, setIsPointerDown] = useState(false);
    const syncTimeoutRef = useRef<any>(null);
    const lastLoadedSrc = useRef<string | null>(null);

    const [drawTrigger, setDrawTrigger] = useState(0);
    const pointsRef = useRef<{x: number, y: number, pressure: number}[]>([]);
    const lastDrawnIndexRef = useRef<number>(0);
    const startPosRef = useRef<{x: number, y: number} | null>(null);

    const performSync = useCallback(() => {
        if (!paintNode) return;
        workingCanvasRef.current.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            lastLoadedSrc.current = url;
            dispatch({
                type: 'UPDATE_NODE_DATA',
                payload: {
                    animId,
                    nodeId: paintNode.id,
                    data: { paintData: url }
                }
            });
        }, 'image/png');
    }, [animId, paintNode?.id, dispatch]);

    const syncToNodeDebounced = useCallback(() => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(performSync, 150);
    }, [performSync]);

    useEffect(() => {
        const canvas = workingCanvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        
        const w = (paintInputPayload?.type === 'IMAGE') ? paintInputPayload.width : layer.data.width;
        const h = (paintInputPayload?.type === 'IMAGE') ? paintInputPayload.height : layer.data.height;

        let requiresTrigger = false;

        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            requiresTrigger = true;
        }

        if (paintNode?.data.paintData) {
            const sourceSrc = paintNode.data.paintData;
            if (sourceSrc !== lastLoadedSrc.current) {
                loadBitmap(sourceSrc).then(bmp => {
                    ctx.globalCompositeOperation = 'copy';
                    ctx.drawImage(bmp, 0, 0);
                    ctx.globalCompositeOperation = 'source-over';
                    lastLoadedSrc.current = sourceSrc;
                    setDrawTrigger(t => t + 1);
                });
            } else if (requiresTrigger) {
                 // if width/height changed but sourceSrc is same, it was cleared! We need to forcefully redraw!
                 // Wait! if sourceSrc is same, it means we didn't reload. So canvas is blank in this specific case.
                 // We should force load it.
                 lastLoadedSrc.current = null; // force reload next time, or do it now:
                 loadBitmap(sourceSrc).then(bmp => {
                    ctx.globalCompositeOperation = 'copy';
                    ctx.drawImage(bmp, 0, 0);
                    ctx.globalCompositeOperation = 'source-over';
                    lastLoadedSrc.current = sourceSrc;
                    setDrawTrigger(t => t + 1);
                });
            }
        } else if (paintInputPayload?.type === 'IMAGE') {
            // Draw directly from ImageBitmap if we don't have paintData yet
            if (paintInputPayload.image && (paintInputPayload.image instanceof ImageBitmap || paintInputPayload.image instanceof HTMLImageElement || paintInputPayload.image instanceof HTMLCanvasElement)) {
                ctx.globalCompositeOperation = 'copy';
                ctx.drawImage(paintInputPayload.image, 0, 0);
                ctx.globalCompositeOperation = 'source-over';
                // Reset lastLoadedSrc since we are drawing directly from a payload without a specific src
                lastLoadedSrc.current = null;
                setDrawTrigger(t => t + 1);
            } else if (paintInputPayload.src) {
                if (paintInputPayload.src !== lastLoadedSrc.current || requiresTrigger) {
                    loadBitmap(paintInputPayload.src).then(bmp => {
                        ctx.globalCompositeOperation = 'copy';
                        ctx.drawImage(bmp, 0, 0);
                        ctx.globalCompositeOperation = 'source-over';
                        lastLoadedSrc.current = paintInputPayload.src;
                        setDrawTrigger(t => t + 1);
                    });
                }
            }
        }
        
    }, [layer.id, paintNode?.id, paintNode?.data.paintData, paintInputPayload, layer.data.width, layer.data.height]);

    const getCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const rx = (e.clientX - rect.left) / rect.width;
        const ry = (e.clientY - rect.top) / rect.height;

        const w = (paintInputPayload?.type === 'IMAGE') ? paintInputPayload.width : layer.data.width;
        const h = (paintInputPayload?.type === 'IMAGE') ? paintInputPayload.height : layer.data.height;

        let texX = rx * w;
        let texY = ry * h;

        // Note: If warp is BEFORE paint, paintInputPayload already reflects the warp. 
        // We only inverse-warp if warp is AFTER paint and we are somehow drawing in source space.
        // Actually, if we are painting, we paint on the direct source of the paint node.
        // The warping of the cursor should only happen if we are mapping from target space back to paint space (which is rare, because LayerRenderer displays the paint canvas as-is).
        // Let's assume user is interacting directly with the displayed paint layer boundaries.
        if (warpNode && warpNode.data.pins && !warpNode.disabled) {
            const tw = warpNode.data.targetWidth || layer.data.width;
            const th = warpNode.data.targetHeight || layer.data.height;
            const targetX = rx * tw;
            const targetY = ry * th;
            const srcRect = [{ x: 0, y: 0 }, { x: layer.data.width, y: 0 }, { x: layer.data.width, y: layer.data.height }, { x: 0, y: layer.data.height }];
            const invMatrix = getPerspectiveTransform(warpNode.data.pins, srcRect);
            const p = transformPoint({ x: targetX, y: targetY }, invMatrix);
            texX = p.x; texY = p.y;
        }
        return { texX, texY };
    }, [layer.data.width, layer.data.height, warpNode]);

    const drawCircle = (x: number, y: number, pressure: number) => {
        if (!paintNode) return;
        const config = paintNode.data;
        const baseRadius = (config.brushSize || 20) / 2;
        // Basic pressure support -> modulates size
        const radius = Math.max(1, baseRadius * pressure);

        const canvases = [workingCanvasRef.current];
        if (canvasRef.current) canvases.push(canvasRef.current);

        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d')!;
            ctx.imageSmoothingEnabled = false;
            ctx.save();
            ctx.globalCompositeOperation = config.isEraser ? 'destination-out' : 'source-over';
            
            if (!config.isEraser) {
                // Future: support hardness via radial gradient
                ctx.fillStyle = config.brushColor || '#000000';
                ctx.globalAlpha = config.brushOpacity ?? 1.0;
            } else {
                ctx.globalAlpha = 1.0; 
            }

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    };

    const redrawShapePreview = useCallback((currentX: number, currentY: number) => {
        if (!paintNode || !startPosRef.current) return;
        const s = startPosRef.current;
        const config = paintNode.data;
        const tool = currentDrawTool || config.drawTool;

        const ctx = workingCanvasRef.current.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'copy';
        
        // Reset to original image
        if (lastLoadedSrc.current) {
             const img = new Image();
             img.src = lastLoadedSrc.current;
             // Since it's synchronous during drag, we might need a backup canvas,
             // But for now, we rely on the fact we can quickly draw it if it's in memory.
             // Best to just use an offscreen canvas or cached image data.
        }
        
    }, [paintNode]);

    const flushSpline = useCallback(() => {
        const points = pointsRef.current;
        if (points.length < 2) {
            if (points.length === 1 && lastDrawnIndexRef.current === 0) {
               drawCircle(points[0].x, points[0].y, points[0].pressure);
               lastDrawnIndexRef.current = 1;
            }
            return;
        }

        const startIndex = Math.max(0, lastDrawnIndexRef.current - 1);
        for (let i = startIndex; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            // Interpolate distance, dab spacing
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const config = paintNode?.data;
            const spacing = Math.max(1, (config?.brushSize || 20) * 0.1); 
            const steps = Math.max(1, Math.floor(dist / spacing));

            for (let t = 0; t <= 1; t += 1/steps) {
                const t2 = t * t;
                const t3 = t2 * t;

                const f0 = -0.5 * t3 + t2 - 0.5 * t;
                const f1 = 1.5 * t3 - 2.5 * t2 + 1.0;
                const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
                const f3 = 0.5 * t3 - 0.5 * t2;

                const x = p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3;
                const y = p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3;
                const pr = p0.pressure * f0 + p1.pressure * f1 + p2.pressure * f2 + p3.pressure * f3;
                
                // Avoid overdrawing identical coords back to back (for very dense steps)
                drawCircle(x, y, pr);
            }
        }
        lastDrawnIndexRef.current = points.length;
    }, [paintNode]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.button !== 0 || !paintNode) return;
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setIsPointerDown(true);

        const pos = getCoords(e);
        const config = paintNode.data;
        const tool = currentDrawTool || config.drawTool || (config.isEraser ? 'eraser' : 'brush');

        if (tool === 'bucket') {
             const ctx = workingCanvasRef.current.getContext('2d', { willReadFrequently: true })!;
             floodFill(ctx, pos.texX, pos.texY, config.brushColor, 20); // 20 tolerance hardcoded for now
             if (canvasRef.current) {
                 const destCtx = canvasRef.current.getContext('2d')!;
                 destCtx.imageSmoothingEnabled = false;
                 destCtx.globalCompositeOperation = 'copy';
                 destCtx.drawImage(workingCanvasRef.current, 0, 0);
             }
             syncToNodeDebounced();
             return;
        }

        if (tool === 'rect' || tool === 'ellipse') {
             startPosRef.current = { x: pos.texX, y: pos.texY };
             
             // Backup canvas state before dragging
             if (!lastLoadedSrc.current) {
                 workingCanvasRef.current.toBlob(b => {
                     if(b) lastLoadedSrc.current = URL.createObjectURL(b);
                 })
             }
             return;
        }

        const pressure = e.pointerType === 'pen' ? e.pressure : 1.0;
        pointsRef.current = [{ x: pos.texX, y: pos.texY, pressure }];
        lastDrawnIndexRef.current = 0;
        
        flushSpline();
    }, [getCoords, paintNode, flushSpline, currentDrawTool]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isPointerDown || !paintNode) return;
        e.stopPropagation();
        const pos = getCoords(e);
        const config = paintNode.data;
        const tool = currentDrawTool || config.drawTool || (config.isEraser ? 'eraser' : 'brush');

        if (tool === 'bucket') return;

        if (tool === 'rect' || tool === 'ellipse') {
            if (!startPosRef.current || !lastLoadedSrc.current) return;
            // Draw shape logic
            const img = new Image();
            img.src = lastLoadedSrc.current;
            
            const renderShape = () => {
                const canvases = [workingCanvasRef.current];
                if (canvasRef.current) canvases.push(canvasRef.current);

                canvases.forEach(canvas => {
                     const ctx = canvas.getContext('2d')!;
                     ctx.imageSmoothingEnabled = false;
                     ctx.globalCompositeOperation = 'copy';
                     ctx.drawImage(img, 0, 0);

                     ctx.globalCompositeOperation = 'source-over';
                     ctx.fillStyle = config.brushColor || '#000000';
                     ctx.globalAlpha = config.brushOpacity ?? 1.0;

                     ctx.beginPath();
                     if (tool === 'rect') {
                         const rw = pos.texX - startPosRef.current!.x;
                         const rh = pos.texY - startPosRef.current!.y;
                         ctx.rect(startPosRef.current!.x, startPosRef.current!.y, rw, rh);
                     } else {
                         const rx = Math.abs(pos.texX - startPosRef.current!.x) / 2;
                         const ry = Math.abs(pos.texY - startPosRef.current!.y) / 2;
                         const cx = startPosRef.current!.x + (pos.texX - startPosRef.current!.x) / 2;
                         const cy = startPosRef.current!.y + (pos.texY - startPosRef.current!.y) / 2;
                         ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                     }
                     ctx.fill();
                });
            };

            if (img.complete) {
                renderShape();
            } else {
                img.onload = renderShape;
            }
            return;
        }

        const pressure = e.pointerType === 'pen' ? e.pressure : 1.0;
        
        // Coalesced events for smoother tracking on high refresh rate displays / tablets
        if (typeof e.nativeEvent.getCoalescedEvents === 'function') {
            const events = e.nativeEvent.getCoalescedEvents();
            if (events && events.length > 0) {
                for (const ev of events) {
                     const evPos = getCoords({ clientX: ev.clientX, clientY: ev.clientY, currentTarget: e.currentTarget } as any);
                     const evPr = ev.pointerType === 'pen' ? ev.pressure : 1.0;
                     pointsRef.current.push({ x: evPos.texX, y: evPos.texY, pressure: evPr });
                }
            } else {
                 pointsRef.current.push({ x: pos.texX, y: pos.texY, pressure });
            }
        } else {
             pointsRef.current.push({ x: pos.texX, y: pos.texY, pressure });
        }

        flushSpline();
    }, [isPointerDown, getCoords, flushSpline, paintNode, currentDrawTool]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isPointerDown || !paintNode) return;
        e.stopPropagation();
        setIsPointerDown(false);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        
        const config = paintNode.data;
        const tool = currentDrawTool || config.drawTool || (config.isEraser ? 'eraser' : 'brush');

        if (tool === 'brush' || tool === 'eraser') {
            flushSpline();
        }

        startPosRef.current = null;

        // Мгновенная синхронизация при отпускании
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        performSync();
    }, [isPointerDown, performSync, flushSpline, paintNode, currentDrawTool]);

    return {
        isPointerDown,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        paintCanvasRef: workingCanvasRef,
        drawTrigger
    };
};