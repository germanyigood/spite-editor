
import React, { useState, useEffect } from 'react';
import { NormalMapNode as NormalNodeType, NodePayload, ImageSource } from '../../../../types';
import NormalMapPreview from '../../NormalMapPreview';
import { Slider, Toggle } from '../../../common/DesignSystem';
import { Eye, Layers, Box } from 'lucide-react';
import { BitmapView } from '../../../common/BitmapView';

interface NormalMapNodeProps {
    node: NormalNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const NormalMapNode = React.memo(({ node, onUpdate, input, output }: NormalMapNodeProps) => {
    const { strength = 1.0, lightIntensity = 1.5, lightZ = 2.0 } = node.data;
    
    const [previewMap, setPreviewMap] = useState<ImageSource | null>(null);
    const [previewSrc, setPreviewSrc] = useState<ImageSource | null>(null);
    
    const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
    const [showDiffuse, setShowDiffuse] = useState(true);
    const [frameIndex, setFrameIndex] = useState(0);

    // Timeline Sync Vars
    const isTimeline = input?.type === 'TIMELINE';
    const fps = (isTimeline && input?.fps) ? input.fps : 12;
    const isPlaying = (isTimeline && input?.isPlaying !== undefined) ? input.isPlaying : true;
    const initialFrame = (isTimeline && input?.currentFrameIndex !== undefined) ? input.currentFrameIndex : 0;

    useEffect(() => {
        if (!isPlaying && isTimeline) {
            setFrameIndex(initialFrame);
        }
    }, [isPlaying, initialFrame, isTimeline]);

    useEffect(() => {
        if (input) {
            if (input.type === 'IMAGE') {
                setPreviewSrc(input.image);
            } else if (input.type === 'TIMELINE' && input.frames.length > 0) {
                 const idx = frameIndex % input.frames.length;
                 setPreviewSrc(input.frames[idx]);
            } else if (input.type === 'IMAGE_SEQUENCE') {
                 setPreviewSrc(input.image);
            }
        } else {
            setPreviewSrc(null);
        }

        if (output) {
            if (output.type === 'IMAGE') {
                setPreviewMap(output.image);
            } else if (output.type === 'TIMELINE' && output.frames.length > 0) {
                const idx = frameIndex % output.frames.length;
                setPreviewMap(output.frames[idx]);
            } else if (output.type === 'IMAGE_SEQUENCE') {
                 setPreviewMap(output.image);
            }
        } else {
            setPreviewMap(null);
        }

    }, [input, output, frameIndex]);

    useEffect(() => {
        if (input && input.type === 'TIMELINE' && input.frames.length > 1 && isPlaying) {
            const interval = 1000 / fps;
            const t = setInterval(() => {
                setFrameIndex(i => (i + 1) % input.frames.length);
            }, interval);
            return () => clearInterval(t);
        }
    }, [input, isPlaying, fps]);

    const update = (updates: any) => {
        onUpdate(node.id, { data: { ...node.data, ...updates } });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Main Preview Area */}
            <div className="flex-1 bg-black/5 dark:bg-black/50 relative overflow-hidden flex flex-col min-h-0 checkerboard">
                {previewSrc && previewMap ? (
                    viewMode === '3d' ? (
                        <NormalMapPreview 
                            imageSrc={previewSrc} 
                            normalMapSrc={previewMap} 
                            lightIntensity={lightIntensity}
                            lightZ={lightZ}
                            showDiffuse={showDiffuse}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BitmapView image={previewMap} className="max-w-full max-h-full object-contain pixelated" style={{width:'100%', height:'100%', objectFit:'contain'}} />
                        </div>
                    )
                ) : <div className="w-full h-full flex items-center justify-center text-txt-muted text-xs">Processing...</div>}
                
                {input && input.type === 'TIMELINE' && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-md border border-white/10 pointer-events-none z-10 flex items-center gap-2">
                         <span className={isPlaying ? "text-green-400" : "text-gray-400"}>{isPlaying ? "PLAY" : "PAUSE"}</span>
                        <span>Frame {frameIndex + 1}/{input.frames.length}</span>
                    </div>
                )}
            </div>
            
            {/* Controls */}
            <div className="p-3 border-t border-border-base/10 space-y-3 shrink-0 bg-surface/30 overflow-y-auto custom-scrollbar max-h-[40%] text-xs">
                 
                 <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all border ${
                            viewMode === '3d' 
                            ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/30' 
                            : 'bg-surface/50 text-txt-muted border-border-base/10 hover:bg-surface-hover/10'
                        }`}
                     >
                        {viewMode === '3d' ? <Box size={12} /> : <Layers size={12} />}
                        {viewMode === '3d' ? '3D Lit' : '2D Map'}
                     </button>
                 </div>

                 {viewMode === '3d' && (
                     <Toggle 
                        label="Show Diffuse" 
                        value={showDiffuse} 
                        onChange={setShowDiffuse} 
                        icon={Eye}
                        accent="amber"
                     />
                 )}

                 <Slider 
                    label="Normal Strength" 
                    min={0.1} max={5} step={0.1} 
                    value={strength} 
                    onChange={(v) => update({ strength: v })} 
                    accent="amber"
                 />
                 
                 {viewMode === '3d' && (
                     <Slider 
                        label="Light Z-Distance" 
                        min={0.5} max={5} step={0.1} 
                        value={lightZ} 
                        onChange={(v) => update({ lightZ: v })} 
                        accent="amber"
                     />
                 )}
            </div>
        </div>
    );
});
