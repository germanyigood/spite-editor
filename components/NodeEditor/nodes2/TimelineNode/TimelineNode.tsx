
import React from 'react';
import { NodePayload, TimelineNode as TimelineNodeType } from '../../../../types';
import { Play, Pause, Repeat, Unplug } from 'lucide-react';
import { useProject } from '../../../../context/ProjectContext';
import { Slider, Toggle } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';

interface TimelineNodeProps {
    node: TimelineNodeType;
    onUpdate: (id: string, updates: any) => void;
    input?: NodePayload;
    output?: NodePayload;
}

export const TimelineNode = React.memo(({ input, output, node, onUpdate }: TimelineNodeProps) => {
    const { state } = useProject();
    const fps = node.data.fps ?? 12;
    const loop = node.data.loop ?? true;
    const isPlaying = node.data.isPlaying ?? true;
    const currentFrame = node.data.currentFrame ?? 0;

    const previewPayload = output || input;
    const frames = (previewPayload && previewPayload.type === 'TIMELINE') ? previewPayload.frames : [];
    
    const isDisconnected = !input;

    const updateValues = (updates: { fps?: number, loop?: boolean, isPlaying?: boolean, currentFrame?: number }) => {
        onUpdate(node.id, { data: { ...node.data, ...updates } });
    };

    const startIdx = Math.max(0, currentFrame - 1);
    const endIdx = startIdx + 4;
    const previewFrames = frames.slice(startIdx, endIdx);

    return (
        <div className="flex flex-col h-full p-3 gap-3">
            <div className={`flex-1 flex items-center gap-1 overflow-hidden bg-surface/10 rounded-lg p-1 border border-border-base/10 relative min-h-0 ${isDisconnected ? 'border-red-500/30' : ''}`}>
                 
                 {isDisconnected ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-1 opacity-80">
                         <Unplug size={20} />
                         <span className="text-[9px] font-bold uppercase tracking-wider">Disconnected</span>
                     </div>
                 ) : frames.length === 0 ? (
                     <div className="absolute inset-0 flex items-center justify-center text-[9px] text-txt-muted font-medium">No Frames Loaded</div>
                 ) : null}
                 
                {!isDisconnected && previewFrames.map((src, i) => {
                    const idx = startIdx + i;
                    const isActive = idx === currentFrame;
                    return (
                        <div 
                            key={i} 
                            onClick={() => updateValues({ currentFrame: idx, isPlaying: false })}
                            className={`h-full aspect-square bg-black/5 dark:bg-black/50 checkerboard rounded flex-shrink-0 overflow-hidden cursor-pointer transition-all border 
                                ${isActive ? 'border-green-500 ring-1 ring-green-500/50 scale-105 z-10' : 'border-border-base/10 hover:border-border-base/30'}`}
                        >
                            {src && <BitmapView image={src} className="w-full h-full object-contain pixelated" style={{width:'100%', height:'100%'}} />}
                        </div>
                    );
                })}
                {!isDisconnected && frames.length > endIdx && (
                    <div className="h-full aspect-square flex items-center justify-center text-[9px] text-txt-muted bg-surface/30 rounded border border-border-base/5">
                        +{frames.length - endIdx}
                    </div>
                )}
            </div>
            
            {/* Controls */}
            <div className={`flex flex-col gap-3 ${isDisconnected ? 'opacity-50 pointer-events-none' : ''}`}>
                 <div className="flex items-center gap-3">
                     <button 
                        onClick={() => updateValues({ isPlaying: !isPlaying })}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-lg ${isPlaying ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-surface hover:bg-surface-hover/10 text-txt-secondary hover:text-txt-primary border border-border-base/10'}`}
                     >
                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                     </button>
                     <div className="flex-1">
                        <Slider 
                            label="Playback Speed" 
                            min={1} max={60} 
                            value={fps} 
                            onChange={(v) => updateValues({ fps: v })} 
                            accent="green"
                        />
                     </div>
                 </div>
                 
                 <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                        <Toggle 
                            label="Loop" 
                            value={loop} 
                            onChange={(v) => updateValues({ loop: v })} 
                            icon={Repeat}
                            accent="green"
                        />
                    </div>
                     
                    <div className="text-[10px] font-mono text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1.5 rounded border border-green-500/20 whitespace-nowrap">
                        {currentFrame + 1} / {frames.length}
                    </div>
                 </div>
            </div>
        </div>
    );
});
