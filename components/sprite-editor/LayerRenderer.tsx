
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { SourceNode, NodeGraphData, NodePayload, PaintNode, WarpNode } from '../../types';
import { findModifierByType, findLastModifier, loadBitmap } from '../../utils';
import { useProject } from '../../context/ProjectContext';
import { useDrawingEngine } from './useDrawingEngine';

interface LayerRendererProps {
    layer: SourceNode;
    graph: NodeGraphData;
    isSelected: boolean;
    toolMode: string;
    drawTool?: 'brush' | 'eraser' | 'select'; 
    nodeOutputs: Record<string, NodePayload | null>;
    overridePos?: { x: number, y: number };
}

export const LayerRenderer = React.memo(({ 
    layer, 
    graph, 
    isSelected, 
    toolMode,
    drawTool = 'brush',
    nodeOutputs,
    overridePos
}: LayerRendererProps) => {
    const { state, dispatch } = useProject();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const paintNode = useMemo(() => findModifierByType(graph, layer.id, 'paint') as PaintNode | undefined, [graph, layer.id]);
    const warpNode = useMemo(() => findModifierByType(graph, layer.id, 'warp') as WarpNode | undefined, [graph, layer.id]);
    const lastModifier = useMemo(() => findLastModifier(graph, layer.id), [graph, layer.id]);
    
    const paintInputNodeId = useMemo(() => {
        if (!paintNode || !graph.connections) return layer.id;
        const conn = graph.connections.find(c => c.target === paintNode.id);
        return conn ? conn.source : layer.id;
    }, [graph.connections, paintNode, layer.id]);

    const finalPayload = useMemo(() => {
        if (toolMode === 'draw') {
             if (paintNode) return nodeOutputs[paintNode.id] || nodeOutputs[paintInputNodeId] || nodeOutputs[layer.id];
             return nodeOutputs[paintInputNodeId] || nodeOutputs[layer.id];
        }
        return lastModifier ? nodeOutputs[lastModifier.id] : nodeOutputs[layer.id];
    }, [toolMode, paintNode, paintInputNodeId, nodeOutputs, layer.id, lastModifier]);
    const canInteractWithBrush = toolMode === 'draw' && isSelected && (drawTool === 'brush' || drawTool === 'eraser') && paintNode && !paintNode.disabled;

    const paintInputPayload = nodeOutputs[paintInputNodeId] || nodeOutputs[layer.id];

    const { 
        isPointerDown, 
        handlePointerDown, 
        handlePointerMove, 
        handlePointerUp,
        paintCanvasRef,
        drawTrigger
    } = useDrawingEngine({
        layer,
        paintNode,
        warpNode,
        paintInputPayload,
        canvasRef, // Передаем реф напрямую, чтобы движок мог рисовать в этот элемент
        dispatch,
        animId: state.activeAnimationId
    });

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Если идет активное рисование, мы НЕ затираем холст через React-апдейты,
        // так как движок сам управляет отрисовкой кругов в реальном времени.
        const shouldShowPaintCanvas = toolMode === 'draw' && isSelected && paintNode && !paintNode.disabled;
        if (isPointerDown && shouldShowPaintCanvas) return;

        const displayW = finalPayload?.type === 'IMAGE' ? finalPayload.width : layer.data.width;
        const displayH = finalPayload?.type === 'IMAGE' ? finalPayload.height : layer.data.height;

        if (canvas.width !== displayW || canvas.height !== displayH) {
            canvas.width = displayW;
            canvas.height = displayH;
        }

        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = 'copy';

        let didDraw = false;

        if (shouldShowPaintCanvas && paintCanvasRef.current) {
            ctx.drawImage(paintCanvasRef.current, 0, 0);
            didDraw = true;
        }

        if (!didDraw && finalPayload && finalPayload.type === 'IMAGE' && finalPayload.image && (finalPayload.image instanceof ImageBitmap || finalPayload.image instanceof HTMLCanvasElement || finalPayload.image instanceof HTMLImageElement)) {
            ctx.drawImage(finalPayload.image, 0, 0);
            didDraw = true;
        } 
        
        if (!didDraw) {
            loadBitmap((finalPayload as any)?.src || layer.data.src).then(bmp => {
                if (!canInteractWithBrush && !shouldShowPaintCanvas) ctx.drawImage(bmp, 0, 0);
            }).catch(() => {});
        }
    }, [finalPayload, layer.data.src, layer.data.width, layer.data.height, canInteractWithBrush, paintCanvasRef, isPointerDown, toolMode, isSelected, paintNode, drawTrigger]);

    useEffect(() => {
        redraw();
    }, [redraw, finalPayload, drawTrigger]);

    const finalX = overridePos ? overridePos.x : (layer.data?.x || 0);
    const finalY = overridePos ? overridePos.y : (layer.data?.y || 0);

    return (
        <canvas 
            ref={canvasRef}
            className={`absolute origin-top-left checkerboard pixelated ${canInteractWithBrush ? 'touch-none cursor-none pointer-events-auto z-50 ring-2 ring-pink-500 shadow-2xl' : 'pointer-events-none'}`}
            style={{ 
                left: finalX, top: finalY, 
                opacity: layer.data?.opacity || 1, 
                zIndex: isSelected ? 10 : 1,
                width: finalPayload?.type === 'IMAGE' ? finalPayload.width : layer.data.width,
                height: finalPayload?.type === 'IMAGE' ? finalPayload.height : layer.data.height,
                display: 'block'
            }}
            onPointerDown={canInteractWithBrush ? handlePointerDown : undefined}
            onPointerMove={canInteractWithBrush ? handlePointerMove : undefined}
            onPointerUp={canInteractWithBrush ? handlePointerUp : undefined}
        />
    );
});
