import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SourceNode, PaintNode, WarpNode, NodePayload } from '../../types';
import { getPerspectiveTransform, transformPoint } from '../../utils/math';
import { loadBitmap } from '../../utils';

interface DrawingEngineProps {
    layer: SourceNode;
    paintNode?: PaintNode;
    warpNode?: WarpNode;
    nodeOutputs: Record<string, NodePayload | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    dispatch: any;
    animId: string;
}

export const useDrawingEngine = ({
    layer,
    paintNode,
    warpNode,
    nodeOutputs,
    canvasRef,
    dispatch,
    animId
}: DrawingEngineProps) => {
    const workingCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
    const [isPointerDown, setIsPointerDown] = useState(false);
    const syncTimeoutRef = useRef<any>(null);
    const lastLoadedSrc = useRef<string | null>(null);

    // Очистка старых ссылок для предотвращения утечек памяти
    const revokeLastUrl = () => {
        if (lastLoadedSrc.current && lastLoadedSrc.current.startsWith('blob:')) {
            URL.revokeObjectURL(lastLoadedSrc.current);
        }
    };

    const performSync = useCallback(() => {
        if (!paintNode) return;
        workingCanvasRef.current.toBlob((blob) => {
            if (!blob) return;
            revokeLastUrl();
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
        const w = layer.data.width;
        const h = layer.data.height;

        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }

        const inputPayload = nodeOutputs[layer.id];
        const sourceSrc = paintNode?.data.paintData || (inputPayload?.type === 'IMAGE' ? inputPayload.src : null);

        if (sourceSrc && sourceSrc !== lastLoadedSrc.current) {
            loadBitmap(sourceSrc).then(bmp => {
                ctx.globalCompositeOperation = 'copy';
                ctx.drawImage(bmp, 0, 0);
                ctx.globalCompositeOperation = 'source-over';
                lastLoadedSrc.current = sourceSrc;
            });
        }
        
        return () => revokeLastUrl();
    }, [layer.id, paintNode?.id, nodeOutputs[layer.id]]);

    const getCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const rx = (e.clientX - rect.left) / rect.width;
        const ry = (e.clientY - rect.top) / rect.height;

        let texX = rx * layer.data.width;
        let texY = ry * layer.data.height;

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

    const drawCircle = (x: number, y: number) => {
        if (!paintNode) return;
        const config = paintNode.data;
        const radius = (config.brushSize || 20) / 2;

        const canvases = [workingCanvasRef.current];
        if (canvasRef.current) canvases.push(canvasRef.current);

        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d')!;
            ctx.imageSmoothingEnabled = false;
            ctx.save();
            ctx.globalCompositeOperation = config.isEraser ? 'destination-out' : 'source-over';
            
            if (!config.isEraser) {
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

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.button !== 0 || !paintNode) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setIsPointerDown(true);

        const pos = getCoords(e);
        drawCircle(pos.texX, pos.texY);
        syncToNodeDebounced();
    }, [getCoords, paintNode, syncToNodeDebounced]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isPointerDown) return;
        const pos = getCoords(e);
        drawCircle(pos.texX, pos.texY);
        syncToNodeDebounced();
    }, [isPointerDown, getCoords, syncToNodeDebounced]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isPointerDown) return;
        setIsPointerDown(false);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        
        // Мгновенная синхронизация при отпускании
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        performSync();
    }, [isPointerDown, performSync]);

    return {
        isPointerDown,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        paintCanvasRef: workingCanvasRef
    };
};