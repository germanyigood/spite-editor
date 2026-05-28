
import React, { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { CropNode as CropNodeType, NodePayload } from '../../../../types';
import { NumberInput, Section, Toggle } from '../../../common/DesignSystem';
import CropOverlay from '../../../common/CropOverlay';
import { Maximize, Minimize, AlertCircle } from 'lucide-react';
import { BitmapView } from '../../../common/BitmapView';

interface CropNodeProps {
    node: CropNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload | null;
}

export const CropNode: React.FC<CropNodeProps> = React.memo(({ node, onUpdate, input }) => {
    const config = useMemo(() => ({
        x: 0, y: 0, width: 0, height: 0,
        resize: false, finalWidth: 0, finalHeight: 0,
        ...(node.data || {})
    }), [node.data]);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState<{w: number, h: number} | null>(null);
    const [imageNaturalSize, setImageNaturalSize] = useState<{w: number, h: number} | null>(null);
    const [localRect, setLocalRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);

    const activeConfig = useMemo(() => {
        if (localRect) return { ...config, ...localRect };
        return config;
    }, [config, localRect]);

    const src = useMemo(() => {
        if (!input) return null;
        if (input.type === 'TIMELINE') return input.frames?.[0] || null;
        if (input.type === 'IMAGE' || input.type === 'IMAGE_SEQUENCE') return input.image || null;
        return null;
    }, [input]);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                setContainerSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
            }
        };
        const ro = new ResizeObserver(updateSize);
        ro.observe(containerRef.current);
        updateSize();
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!src) {
            setImageNaturalSize(null);
            return;
        }
        if (src instanceof ImageBitmap) {
            setImageNaturalSize({ w: src.width, h: src.height });
        } else if (typeof src === 'string') {
            const img = new Image();
            img.onload = () => setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
            img.src = src;
        }
    }, [src]);

    useEffect(() => {
        if (imageNaturalSize && (config.width === 0 || config.height === 0)) {
            const w = Math.floor(imageNaturalSize.w * 0.8) || 100;
            const h = Math.floor(imageNaturalSize.h * 0.8) || 100;
            onUpdate(node.id, { 
                data: { ...config, width: w, height: h, x: Math.floor((imageNaturalSize.w - w) / 2), y: Math.floor((imageNaturalSize.h - h) / 2) }
            });
        }
    }, [imageNaturalSize, node.id, onUpdate]);

    const updateConfig = (updates: any) => onUpdate(node.id, { data: { ...config, ...updates } });

    const layout = useMemo(() => {
        if (!containerSize || !imageNaturalSize) return null;
        const rContainer = containerSize.w / containerSize.h;
        const rImage = imageNaturalSize.w / imageNaturalSize.h;
        let renderW, renderH;
        if (rContainer > rImage) { renderH = containerSize.h; renderW = renderH * rImage; } 
        else { renderW = containerSize.w; renderH = renderW / rImage; }
        return { renderW, renderH, offsetX: (containerSize.w - renderW) / 2, offsetY: (containerSize.h - renderH) / 2, scale: renderW / imageNaturalSize.w };
    }, [containerSize, imageNaturalSize]);

    const visualRect = useMemo(() => {
        if (!layout) return { x: 0, y: 0, w: 0, h: 0 };
        return { x: layout.offsetX + (activeConfig.x * layout.scale), y: layout.offsetY + (activeConfig.y * layout.scale), w: activeConfig.width * layout.scale, h: activeConfig.height * layout.scale };
    }, [layout, activeConfig.x, activeConfig.y, activeConfig.width, activeConfig.height]);

    const handleVisualUpdate = (rect: {x:number, y:number, w:number, h:number}) => {
        if (!layout || !imageNaturalSize) return;
        const newX = Math.round((rect.x - layout.offsetX) / layout.scale);
        const newY = Math.round((rect.y - layout.offsetY) / layout.scale);
        const newW = Math.round(rect.w / layout.scale);
        const newH = Math.round(rect.h / layout.scale);
        setLocalRect({ x: newX, y: newY, width: Math.max(1, newW), height: Math.max(1, newH) });
    };

    const handleDragEnd = useCallback(() => {
        if (localRect) {
            updateConfig(localRect);
            setLocalRect(null);
        }
    }, [localRect]);

    return (
        <div className="flex flex-col h-full bg-surface/5">
            <div ref={containerRef} className="flex-1 bg-black/40 relative overflow-hidden min-h-0 flex items-center justify-center checkerboard">
                {!src ? (
                    <div className="flex flex-col items-center gap-2 text-txt-muted opacity-50 text-center p-4">
                        <AlertCircle size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-widest italic">Waiting for connection...</span>
                    </div>
                ) : (
                    layout && (
                        <>
                            <div style={{ position: 'absolute', left: layout.offsetX, top: layout.offsetY, width: layout.renderW, height: layout.renderH, pointerEvents: 'none' }}>
                                <BitmapView image={src} mode="contain" className="w-full h-full object-contain" />
                            </div>
                            <CropOverlay rect={visualRect} onUpdate={handleVisualUpdate} onDragEnd={handleDragEnd} color="amber" label={`${activeConfig.width}x${activeConfig.height}`} bounds={{ w: containerSize?.w || 0, h: containerSize?.h || 0 }} />
                        </>
                    )
                )}
            </div>
            <div className="p-3 border-t border-border-base/10 space-y-4 shrink-0 bg-surface/30 overflow-y-auto custom-scrollbar max-h-[50%]">
                <Section title="Crop Area" defaultOpen={true}>
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput label="Width" min={1} value={activeConfig.width} onChange={(v) => updateConfig({ width: Math.max(1, v) })} accent="amber" />
                        <NumberInput label="Height" min={1} value={activeConfig.height} onChange={(v) => updateConfig({ height: Math.max(1, v) })} accent="amber" />
                        <NumberInput label="X" value={activeConfig.x} onChange={(v) => updateConfig({ x: v })} accent="amber" />
                        <NumberInput label="Y" value={activeConfig.y} onChange={(v) => updateConfig({ y: v })} accent="amber" />
                    </div>
                </Section>
                <Section title="Post-process">
                     <Toggle label="Enable Resizing" value={!!config.resize} onChange={(v) => updateConfig({ resize: v })} icon={config.resize ? Maximize : Minimize} accent="amber" />
                     {config.resize && (
                         <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                             <NumberInput label="Target W" min={1} value={config.finalWidth || config.width} onChange={(v) => updateConfig({ finalWidth: Math.max(1, v) })} accent="amber" />
                             <NumberInput label="Target H" min={1} value={config.finalHeight || config.height} onChange={(v) => updateConfig({ finalHeight: Math.max(1, v) })} accent="amber" />
                         </div>
                     )}
                </Section>
            </div>
        </div>
    );
});
