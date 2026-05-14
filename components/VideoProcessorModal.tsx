
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, Plus, Trash2, Film, Loader2, AlertCircle, Crop as CropIcon, MousePointer2, RotateCcw, Scissors, GripHorizontal } from 'lucide-react';
import CropOverlay from './common/CropOverlay';
import { Frame } from '../types';
import { NumberInput, Slider, Section, Label } from './common/DesignSystem';
import { moveSegment, resizeSegmentStart, resizeSegmentEnd, calculateEstimatedFrames, TimeSegment } from '../utils/video';

interface VideoProcessorModalProps {
  file: File;
  onConfirm: (imageSrc: string, config: { rows: number, cols: number, totalFrames: number, frameWidth: number, frameHeight: number, frames: Frame[] }) => void;
  onCancel: () => void;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const VideoProcessorModal: React.FC<VideoProcessorModalProps> = ({ file, onConfirm, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });
  
  // Settings
  const [segments, setSegments] = useState<TimeSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const [captureFps, setCaptureFps] = useState(10);
  const [scale, setScale] = useState(0.5); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedFrames, setEstimatedFrames] = useState(0);

  // Crop State
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 }); // In native video pixels

  // Interaction State (Timeline only now, crop handled by component)
  const [timelineDrag, setTimelineDrag] = useState<{
    type: 'playhead' | 'segment_start' | 'segment_end' | 'segment_move';
    id?: string;
    startOffset?: number; // Time offset from segment start for moving
  } | null>(null);

  // Initialize
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      setDuration(dur);
      setVideoDims({ w: vw, h: vh });
      
      const firstId = Date.now().toString();
      setSegments([{ id: firstId, start: 0, end: Math.min(dur, 5) }]);
      setActiveSegmentId(firstId);
      
      if (crop.w === 0 || crop.h === 0) {
          setCrop({ x: 0, y: 0, w: vw, h: vh });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !timelineDrag) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);

      // Loop Logic: Strictly within Active Segment
      if (isPlaying && activeSegmentId) {
          const activeSeg = segments.find(s => s.id === activeSegmentId);
          if (activeSeg) {
              // Add a small buffer (0.1s) to end check to allow hitting the end frame
              if (t >= activeSeg.end) {
                  videoRef.current.currentTime = activeSeg.start;
                  setCurrentTime(activeSeg.start);
              }
          }
      }
    }
  };

  useEffect(() => {
    setEstimatedFrames(calculateEstimatedFrames(segments, captureFps));
  }, [segments, captureFps]);


  // --- Logic ---

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
          videoRef.current.pause();
      } else {
          // If starting play, ensure we are inside the active segment
          const activeSeg = segments.find(s => s.id === activeSegmentId);
          if (activeSeg) {
              if (videoRef.current.currentTime < activeSeg.start || videoRef.current.currentTime >= activeSeg.end) {
                  videoRef.current.currentTime = activeSeg.start;
                  setCurrentTime(activeSeg.start);
              }
          }
          videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const addSegment = () => {
    const start = currentTime;
    const end = Math.min(duration, currentTime + 2);
    const newId = Date.now().toString();
    setSegments([...segments, { id: newId, start, end }]);
    setActiveSegmentId(newId); // Switch to new clip
  };

  const removeSegment = (id: string) => {
    if (segments.length > 1) {
      const newSegs = segments.filter(s => s.id !== id);
      setSegments(newSegs);
      if (activeSegmentId === id) {
          setActiveSegmentId(newSegs[newSegs.length-1].id);
      }
    }
  };

  const updateSegment = (id: string, key: 'start' | 'end', value: number) => {
    setSegments(prev => prev.map(s => {
        if (s.id !== id) return s;
        if (key === 'start') return resizeSegmentStart(s, value);
        if (key === 'end') return resizeSegmentEnd(s, value, duration);
        return s;
    }));
  };

  const updateCrop = (key: keyof CropRect, value: number) => {
      setCrop(prev => {
          let val = Math.round(value);
          if (isNaN(val)) val = 0;
          const next = { ...prev, [key]: val };
          // Basic validation
          if (next.x < 0) next.x = 0;
          if (next.y < 0) next.y = 0;
          if (next.x + next.w > videoDims.w) {
              if (key === 'x') next.x = videoDims.w - next.w;
              if (key === 'w') next.w = videoDims.w - next.x;
          }
          if (next.y + next.h > videoDims.h) {
              if (key === 'y') next.y = videoDims.h - next.h;
              if (key === 'h') next.h = videoDims.h - next.y;
          }
          return next;
      });
  };

  const resetCrop = () => {
      setCrop({ x: 0, y: 0, w: videoDims.w, h: videoDims.h });
  };

  // --- Helpers for Coordinates ---
  
  const getVideoContentRect = () => {
     if (!videoRef.current || !videoContainerRef.current) return null;
     const vid = videoRef.current;
     if (vid.videoWidth === 0 || vid.videoHeight === 0) return null;

     const vidRect = vid.getBoundingClientRect();
     const rectRatio = vidRect.width / vidRect.height;
     const sourceRatio = vid.videoWidth / vid.videoHeight;

     let renderW = vidRect.width;
     let renderH = vidRect.height;
     let renderX = vidRect.left;
     let renderY = vidRect.top;

     if (Math.abs(rectRatio - sourceRatio) > 0.01) {
         if (rectRatio > sourceRatio) {
             renderW = renderH * sourceRatio;
             renderX = vidRect.left + (vidRect.width - renderW) / 2;
         } else {
             renderH = renderW / sourceRatio;
             renderY = vidRect.top + (vidRect.height - renderH) / 2;
         }
     }

     return { 
         x: renderX, 
         y: renderY,
         w: renderW,
         h: renderH,
         scale: vid.videoWidth / renderW 
     };
  };

  // --- Timeline Drag Logic ---

  const getTimelineTime = (clientX: number) => {
    if (!timelineRef.current || duration === 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  };

  const handleTimelineDown = (e: React.MouseEvent, type: typeof timelineDrag.type, id?: string) => {
    e.stopPropagation();
    e.preventDefault(); 
    
    const time = getTimelineTime(e.clientX);
    
    if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
    }

    let startOffset = 0;
    if (type === 'segment_move' && id) {
        const seg = segments.find(s => s.id === id);
        if (seg) {
            startOffset = time - seg.start;
        }
    }

    setTimelineDrag({ type, id, startOffset });
    
    if (type === 'playhead') {
        setCurrentTime(time);
        if (videoRef.current) videoRef.current.currentTime = time;
    } else if (id) {
        setActiveSegmentId(id);
    }
  };

  const handleGlobalMove = useCallback((e: MouseEvent) => {
    if (!timelineDrag) return;
    const clientX = e.clientX;

    // Use RAF for smooth scrubbing and dragging
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
        if (!timelineRef.current || duration === 0) return;
        const time = getTimelineTime(clientX);

        if (timelineDrag.type === 'playhead') {
            setCurrentTime(time);
            if (videoRef.current) videoRef.current.currentTime = time;
        } 
        else if (timelineDrag.id) {
            setSegments(prev => prev.map(s => {
                if (s.id !== timelineDrag.id) return s;
                
                if (timelineDrag.type === 'segment_start') {
                    return resizeSegmentStart(s, time);
                }
                if (timelineDrag.type === 'segment_end') {
                    return resizeSegmentEnd(s, time, duration);
                }
                if (timelineDrag.type === 'segment_move' && timelineDrag.startOffset !== undefined) {
                    return moveSegment(s, time, timelineDrag.startOffset, duration);
                }
                return s;
            }));
        }
    });
  }, [timelineDrag, duration]);

  const handleGlobalUp = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTimelineDrag(null);
  }, []);

  useEffect(() => {
    if (timelineDrag) {
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [timelineDrag, handleGlobalMove, handleGlobalUp]);

  // --- Render Crop Wrapper ---
  const renderCropWrapper = () => {
    if (!isCropping) return null;
    const vidRect = getVideoContentRect();
    if (!vidRect) return null;

    const containerRect = videoContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return null;

    // Convert Video Crop (source px) to Screen CSS (px) relative to container
    const scale = 1 / vidRect.scale;
    const cssRect = {
        x: (vidRect.x - containerRect.left) + crop.x * scale,
        y: (vidRect.y - containerRect.top) + crop.y * scale,
        w: crop.w * scale,
        h: crop.h * scale
    };

    return (
        <CropOverlay 
            rect={cssRect}
            color="yellow"
            containerScale={scale} // Map mouse CSS px back to Source px
            label={`${Math.round(crop.w)}x${Math.round(crop.h)}`}
            onUpdate={(newRect) => {
                // newRect is in CSS px relative to container
                // Convert back to source video pixels relative to video origin
                const vidOriginX = vidRect.x - containerRect.left;
                const vidOriginY = vidRect.y - containerRect.top;
                
                let sx = (newRect.x - vidOriginX) * vidRect.scale;
                let sy = (newRect.y - vidOriginY) * vidRect.scale;
                let sw = newRect.w * vidRect.scale;
                let sh = newRect.h * vidRect.scale;

                // Clamp to video bounds
                const maxW = videoDims.w;
                const maxH = videoDims.h;

                sx = Math.max(0, Math.min(sx, maxW - sw));
                sy = Math.max(0, Math.min(sy, maxH - sh));
                if (sx < 0) { sw += sx; sx = 0; }
                if (sy < 0) { sh += sy; sy = 0; }
                sw = Math.min(sw, maxW - sx);
                sh = Math.min(sh, maxH - sy);

                setCrop({
                    x: Math.round(sx),
                    y: Math.round(sy),
                    w: Math.round(sw),
                    h: Math.round(sh)
                });
            }}
        />
    );
  };

  const processVideo = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setProgress(0);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const sX = Math.round(Math.max(0, crop.x));
    const sY = Math.round(Math.max(0, crop.y));
    const sW = Math.round(Math.min(crop.w, video.videoWidth - sX));
    const sH = Math.round(Math.min(crop.h, video.videoHeight - sY));

    if (sW <= 0 || sH <= 0) {
        alert("Invalid Crop Area");
        setIsProcessing(false);
        return;
    }

    const targetW = Math.floor(sW * scale);
    const targetH = Math.floor(sH * scale);
    
    // Estimate frames from utility
    const totalFrames = calculateEstimatedFrames(segments, captureFps) || 1;

    const cols = Math.ceil(Math.sqrt(totalFrames));
    const rows = Math.ceil(totalFrames / cols);

    canvas.width = cols * targetW;
    canvas.height = rows * targetH;

    video.pause();
    let frameCount = 0;
    const interval = 1 / captureFps;
    const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
    const frames: Frame[] = [];

    for (const seg of sortedSegments) {
        let t = seg.start;
        // Strict Loop Condition with epsilon
        while (t < seg.end - 0.001 && frameCount < totalFrames) {
            video.currentTime = Math.min(t, video.duration);
            await new Promise<void>(resolve => {
                const onSeek = () => { video.removeEventListener('seeked', onSeek); resolve(); };
                video.addEventListener('seeked', onSeek);
            });

            const c = frameCount % cols;
            const r = Math.floor(frameCount / cols);
            const fx = c * targetW;
            const fy = r * targetH;

            ctx.drawImage(video, sX, sY, sW, sH, fx, fy, targetW, targetH);
            
            frames.push({
                id: frameCount,
                x: fx, y: fy, width: targetW, height: targetH,
                name: `Frame ${frameCount}`
            });

            frameCount++;
            t += interval;
            setProgress(Math.round((frameCount / totalFrames) * 100));
            await new Promise(r => setTimeout(r, 0));
        }
    }

    const dataUrl = canvas.toDataURL('image/png');
    onConfirm(dataUrl, { 
        rows, cols, totalFrames: frameCount, 
        frameWidth: targetW, frameHeight: targetH,
        frames 
    });
    setIsProcessing(false);
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div className="bg-panel border border-border-base/20 rounded-xl shadow-2xl w-[90vw] h-[85vh] flex flex-col overflow-hidden text-txt-primary">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-base/10 bg-panel/50 shrink-0">
           <div className="flex items-center gap-2 font-semibold">
               <Film className="text-blue-500" />
               <span>Import Video Sequence</span>
           </div>
           <button onClick={onCancel} className="text-txt-muted hover:text-txt-primary p-1 rounded hover:bg-surface/50 transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
           
           {/* LEFT: Video & Timeline */}
           <div className="flex-1 flex flex-col bg-black/50 relative min-h-0">
               
               {/* Video Area */}
               <div ref={videoContainerRef} className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                   <video 
                      ref={videoRef}
                      src={videoUrl}
                      onLoadedMetadata={handleMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      className="max-w-full max-h-full object-contain"
                      onEnded={() => { /* Loop handles playback now */ }}
                      muted
                   />
                   {renderCropWrapper()}
               </div>

               {/* Timeline Area */}
               <div className="h-36 bg-panel border-t border-border-base/10 shrink-0 flex flex-col">
                  {/* Controls */}
                  <div className="h-10 border-b border-border-base/10 flex items-center px-4 gap-4 bg-surface/30">
                      <button onClick={togglePlay} className="text-txt-primary hover:text-blue-400 transition-colors">
                         {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                      </button>
                      <div className="text-xs font-mono text-blue-400 w-20">
                          {formatTime(currentTime)}
                      </div>
                      <div className="h-4 w-px bg-border-base/10 mx-2" />
                      <button 
                         onClick={() => setIsCropping(!isCropping)}
                         className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                             isCropping ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-surface border-border-base/20 text-txt-secondary hover:text-txt-primary'
                         }`}
                      >
                          {isCropping ? <MousePointer2 size={12}/> : <CropIcon size={12} />}
                          {isCropping ? 'Finish Crop' : 'Crop Video'}
                      </button>
                      <div className="h-4 w-px bg-border-base/10 mx-2" />
                      <button onClick={addSegment} className="flex items-center gap-1 text-xs text-txt-secondary hover:text-txt-primary bg-surface px-2 py-1 rounded border border-border-base/20 transition-colors">
                          <Plus size={12} /> New Clip
                      </button>
                      <div className="flex-1" />
                      <div className="text-xs text-txt-muted">Duration: {formatTime(duration)}</div>
                  </div>

                  {/* The Track */}
                  <div className="flex-1 relative px-4 py-4 cursor-text group select-none" 
                       ref={timelineRef}
                       onMouseDown={(e) => handleTimelineDown(e, 'playhead')}
                  >
                      {/* Ruler */}
                      <div className="absolute inset-x-4 top-4 h-8 bg-surface/50 rounded overflow-hidden pointer-events-none">
                         <div className="w-full h-full opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 19px, currentColor 20px)' }} />
                      </div>
                      
                      {/* Active Segment (Only show active for focus) */}
                      {segments.map(seg => {
                          if (seg.id !== activeSegmentId) return null; // "Tabbed" view - hide others

                          const leftPct = (seg.start / duration) * 100;
                          const widthPct = ((seg.end - seg.start) / duration) * 100;
                          const isDragBody = timelineDrag?.type === 'segment_move' && timelineDrag.id === seg.id;

                          return (
                              <div 
                                key={seg.id}
                                className={`absolute top-4 h-8 bg-blue-500/40 border border-blue-400/50 rounded group/segment backdrop-blur-sm transition-colors hover:bg-blue-500/30`}
                                style={{ left: `calc(${leftPct}% + 16px)`, width: `calc(${widthPct}% - 2px)` }}
                                // Note: We do NOT put onMouseDown here. Clicks pass through to 'playhead' unless hitting handles.
                              >
                                  {/* Left Handle */}
                                  <div 
                                    className="absolute top-0 bottom-0 left-0 w-4 -ml-2 cursor-ew-resize z-20 flex items-center justify-center group/left"
                                    onMouseDown={(e) => handleTimelineDown(e, 'segment_start', seg.id)}
                                  >
                                      <div className="w-1.5 h-4 bg-white/50 rounded-full group-hover/left:bg-white shadow-sm" />
                                  </div>
                                  
                                  {/* Center Grip - Distinct Handle for Moving */}
                                  <div 
                                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-6 flex items-center justify-center z-10 rounded-full
                                                  ${isDragBody ? 'cursor-grabbing bg-blue-600 text-white' : 'cursor-grab bg-blue-500/50 text-white/80 hover:bg-blue-600 hover:text-white'} 
                                                  transition-all shadow-sm border border-white/20`}
                                      onMouseDown={(e) => handleTimelineDown(e, 'segment_move', seg.id)}
                                  >
                                      <GripHorizontal size={14} />
                                  </div>

                                  {/* Right Handle */}
                                  <div 
                                    className="absolute top-0 bottom-0 right-0 w-4 -mr-2 cursor-ew-resize z-20 flex items-center justify-center group/right"
                                    onMouseDown={(e) => handleTimelineDown(e, 'segment_end', seg.id)}
                                  >
                                      <div className="w-1.5 h-4 bg-white/50 rounded-full group-hover/right:bg-white shadow-sm" />
                                  </div>
                              </div>
                          );
                      })}
                      
                      {/* Playhead */}
                      <div 
                        className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none" 
                        style={{ 
                            left: `calc(${(currentTime / duration) * 100}% + 16px)`,
                            transition: timelineDrag ? 'none' : 'left 0.1s linear' // Disable transition during drag for 1:1 feel
                        }}
                      >
                          <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rotate-45" />
                      </div>
                  </div>
               </div>
           </div>

           {/* RIGHT: Settings Panel */}
           <div className="w-full lg:w-80 bg-panel border-l border-border-base/10 flex flex-col shrink-0">
               <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                   
                   <Section title={`Clips (${segments.length})`} defaultOpen={true}>
                       <div className="space-y-1">
                           {segments.map((seg, i) => {
                               const isActive = seg.id === activeSegmentId;
                               return (
                                   <div 
                                      key={seg.id} 
                                      className={`rounded-lg border transition-all ${isActive ? 'bg-surface/50 border-blue-500/30' : 'bg-transparent border-transparent hover:bg-surface/30'}`}
                                   >
                                       {/* Tab Header */}
                                       <div 
                                          onClick={() => setActiveSegmentId(seg.id)}
                                          className="flex items-center justify-between p-2 cursor-pointer"
                                       >
                                           <div className="flex items-center gap-2">
                                                <Scissors size={12} className={isActive ? "text-blue-400" : "text-txt-muted"} />
                                                <span className={`text-xs font-bold ${isActive ? 'text-txt-primary' : 'text-txt-secondary'}`}>Clip {i+1}</span>
                                           </div>
                                           {segments.length > 1 && (
                                               <button onClick={(e) => { e.stopPropagation(); removeSegment(seg.id); }} className="text-txt-muted hover:text-red-400 transition-colors p-1 rounded hover:bg-surface">
                                                   <Trash2 size={12} />
                                               </button>
                                           )}
                                       </div>

                                       {/* Expanded Details (Only for Active) */}
                                       {isActive && (
                                           <div className="p-2 pt-0 grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 fade-in duration-200">
                                               <NumberInput label="Start (s)" value={seg.start} step={0.1} onChange={(v) => updateSegment(seg.id, 'start', v)} accent="blue" />
                                               <NumberInput label="End (s)" value={seg.end} step={0.1} onChange={(v) => updateSegment(seg.id, 'end', v)} accent="blue" />
                                           </div>
                                       )}
                                   </div>
                               );
                           })}
                           <button onClick={addSegment} className="w-full py-1.5 text-[10px] text-txt-muted hover:text-blue-400 border border-dashed border-border-base/20 rounded hover:border-blue-500/30 transition-all flex items-center justify-center gap-1 mt-2">
                               <Plus size={10} /> Add Clip
                           </button>
                       </div>
                   </Section>

                   {isCropping && (
                       <Section title="Crop Area" defaultOpen={true} className="animate-in fade-in slide-in-from-right-2">
                           <div className="space-y-3 bg-yellow-500/5 p-3 rounded-xl border border-yellow-500/20">
                               <div className="flex items-center justify-between">
                                   <Label className="!mb-0 text-yellow-600 dark:text-yellow-500">Dimensions</Label>
                                   <button onClick={resetCrop} className="text-[10px] text-yellow-500 hover:text-yellow-400 flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20 transition-colors">
                                       <RotateCcw size={10} /> Reset
                                   </button>
                               </div>
                               <div className="grid grid-cols-2 gap-2">
                                    <NumberInput label="X" value={Math.round(crop.x)} onChange={(v) => updateCrop('x', v)} accent="yellow" />
                                    <NumberInput label="Y" value={Math.round(crop.y)} onChange={(v) => updateCrop('y', v)} accent="yellow" />
                                    <NumberInput label="Width" value={Math.round(crop.w)} onChange={(v) => updateCrop('w', v)} accent="yellow" />
                                    <NumberInput label="Height" value={Math.round(crop.h)} onChange={(v) => updateCrop('h', v)} accent="yellow" />
                               </div>
                               <p className="text-[9px] text-txt-muted text-right font-mono opacity-70">Source: {videoDims.w}x{videoDims.h}</p>
                           </div>
                       </Section>
                   )}
                   
                   <Section title="Export Settings">
                       <Slider 
                            label="Capture FPS" 
                            min={1} max={60} 
                            value={captureFps} 
                            onChange={setCaptureFps} 
                            accent="blue" 
                        />
                       
                       <div className="pt-2 space-y-1">
                            <Slider 
                                label="Scale Output" 
                                min={0.1} max={1} step={0.1} 
                                value={scale} 
                                onChange={setScale} 
                                accent="blue" 
                            />
                            <div className="flex justify-between text-[9px] text-txt-muted font-mono px-1">
                                <span>{Math.round(scale * 100)}%</span>
                                <span>{Math.floor(crop.w * scale)}x{Math.floor(crop.h * scale)}px</span>
                            </div>
                       </div>
                   </Section>

                   {estimatedFrames > 300 && (
                       <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl flex gap-2 items-start text-orange-500">
                           <AlertCircle className="shrink-0 mt-0.5" size={16} />
                           <p className="text-[11px] leading-tight">
                               <strong>High Frame Count ({estimatedFrames}).</strong><br/>
                               This might slow down the browser. Consider reducing FPS or shortening the clip.
                           </p>
                       </div>
                   )}
               </div>

               <div className="p-4 border-t border-border-base/10 bg-surface/30">
                    <button 
                        onClick={processVideo} 
                        disabled={isProcessing} 
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait transition-all"
                    >
                        {isProcessing ? <><Loader2 className="animate-spin" size={18}/> Processing {progress}%</> : <><Film size={18} /> Import {estimatedFrames} Frames</>}
                    </button>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default VideoProcessorModal;
