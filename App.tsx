
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DropZone from './components/DropZone';
import SpriteEditor from './components/SpriteEditor';
import AnimationPreview from './components/AnimationPreview';
import { SpriteConfig, AnimationConfig, BackgroundRemovalConfig, AnimationEntry } from './types';
import { sliceFrames, stitchFrames, createProjectBundle, loadProjectBundle } from './utils';
import { analyzeSpriteSheet } from './services/geminiService';
import { Wand2, Grid, Layers, Trash2, Settings2, Loader2, Info, Plus, X, GripVertical, Crosshair, Download, Copy, Check, Save, FileJson, FileCode, PlayCircle, Move, RotateCcw, ImagePlus, Maximize } from 'lucide-react';

const DEFAULT_SPRITE_CONFIG: SpriteConfig = {
  rows: 1, cols: 1, width: 0, height: 0,
  offsetX: 0, offsetY: 0, margin: 0,
  totalFrames: 1, frameOffsets: {}, showCrosshair: false
};

const DEFAULT_BG_CONFIG: BackgroundRemovalConfig = {
  enabled: false, 
  colors: [{ color: '#00ff00', tolerance: 10 }], 
  tolerance: 10, // Legacy support
  edgeRadius: 0, edgeOpacity: 100, edgeTint: '#000000', edgeTintIntensity: 0
};

const DEFAULT_ANIM_CONFIG: AnimationConfig = {
  fps: 12, isPlaying: true, loop: true, scale: 1
};

const App: React.FC = () => {
  const [animations, setAnimations] = useState<AnimationEntry[]>([]);
  const [activeAnimationId, setActiveAnimationId] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(450);
  const [copySuccess, setCopySuccess] = useState(false);
  const [renamingAnimId, setRenamingAnimId] = useState<string | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);

  // Derived State
  const currentAnim = useMemo(() => 
    animations.find(a => a.id === activeAnimationId), 
  [animations, activeAnimationId]);

  // Ephemeral frames state (not saved in entry, regenerated on fly)
  const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);

  // Initialize with one empty animation if none
  useEffect(() => {
    if (animations.length === 0) {
      const newId = 'anim_default';
      setAnimations([{
        id: newId,
        name: 'Idle',
        imageSrc: null,
        spriteConfig: { ...DEFAULT_SPRITE_CONFIG, frameOffsets: {} },
        bgConfig: { ...DEFAULT_BG_CONFIG, colors: [{color: '#00ff00', tolerance: 10}] },
        animConfig: { ...DEFAULT_ANIM_CONFIG },
        frames: []
      }]);
      setActiveAnimationId(newId);
    }
  }, [animations.length]);

  // Regenerate frames when current animation configs change
  useEffect(() => {
    if (!currentAnim || !currentAnim.imageSrc) {
      setGeneratedFrames([]);
      return;
    }

    const timer = setTimeout(() => {
      const img = new Image();
      img.src = currentAnim.imageSrc!;
      img.onload = () => {
        const frames = sliceFrames(img, currentAnim.spriteConfig, currentAnim.bgConfig);
        setGeneratedFrames(frames);
      };
    }, 100);
    return () => clearTimeout(timer);
  }, [currentAnim]); 

  // Get Playable Data URLs
  const playableFrames = useMemo(() => {
    if (!currentAnim) return [];
    return currentAnim.frames.map(idx => generatedFrames[idx]).filter(Boolean);
  }, [currentAnim?.frames, generatedFrames]);


  // --- State Updaters ---

  const updateEntry = (id: string, updates: Partial<AnimationEntry>) => {
    setAnimations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const updateCurrentConfig = (updates: Partial<SpriteConfig>) => {
    if (!currentAnim) return;
    const newConfig = { ...currentAnim.spriteConfig, ...updates };
    updateEntry(currentAnim.id, { spriteConfig: newConfig });
  };

  const updateGrid = (key: keyof SpriteConfig, value: number) => {
    if (!currentAnim || !currentAnim.imageSrc) return;
    
    // We need image dimensions to calc w/h automatically
    const img = new Image();
    img.src = currentAnim.imageSrc;
    img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        
        const prevConfig = currentAnim.spriteConfig;
        const next = { ...prevConfig, [key]: value };
        
        if (key === 'rows' && value > 0) {
            next.height = Math.floor(h / value);
            next.totalFrames = value * next.cols;
        }
        if (key === 'cols' && value > 0) {
            next.width = Math.floor(w / value);
            next.totalFrames = next.rows * value;
        }
        
        // Sanitize frames
        const validFrames = currentAnim.frames.filter(f => f < next.totalFrames);
        updateEntry(currentAnim.id, { spriteConfig: next, frames: validFrames });
    };
  };


  // --- Handlers ---

  const handleNewProject = () => {
    if(confirm("Start a new project? All unsaved changes will be lost.")) {
         const newId = `anim_${Date.now()}`;
         const cleanEntry: AnimationEntry = {
            id: newId,
            name: 'Idle',
            imageSrc: null,
            spriteConfig: { ...DEFAULT_SPRITE_CONFIG, frameOffsets: {} },
            bgConfig: { ...DEFAULT_BG_CONFIG, colors: [{ color: '#00ff00', tolerance: 10 }] },
            animConfig: { ...DEFAULT_ANIM_CONFIG },
            frames: []
         };

         setAnimations([cleanEntry]);
         setActiveAnimationId(newId);
         setSelectedFrameIndex(null);
         setRenamingAnimId(null);
         setGeneratedFrames([]);
    }
  };

  const handleFileLoad = useCallback(async (file: File) => {
    if (file.name.endsWith('.sforge') || file.type.includes('zip') || file.type.includes('compressed')) {
      try {
        setIsProcessing(true);
        const loadedEntries = await loadProjectBundle(file);
        
        if (loadedEntries.length > 0) {
            setAnimations(loadedEntries);
            setActiveAnimationId(loadedEntries[0].id);
            setSelectedFrameIndex(null);
        } else {
            alert("Project file appears empty or invalid.");
        }
      } catch (e) {
        console.error(e);
        alert("Failed to load project. The file might be corrupted or incompatible.");
      } finally {
         setIsProcessing(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const src = e.target.result as string;
        
        const img = new Image();
        img.src = src;
        img.onload = () => {
          const estimatedCols = 4;
          const w = Math.floor(img.naturalWidth / estimatedCols);
          const totalFrames = estimatedCols;
          const initialFrames = Array.from({ length: totalFrames }, (_, i) => i);
          
          const newConfig: SpriteConfig = {
             ...DEFAULT_SPRITE_CONFIG,
             cols: estimatedCols,
             rows: 1,
             width: w,
             height: img.naturalHeight,
             totalFrames,
             frameOffsets: {}
          };
          
          updateEntry(activeAnimationId, {
              imageSrc: src,
              spriteConfig: newConfig,
              frames: initialFrames
          });
        };
      }
    };
    reader.readAsDataURL(file);
  }, [activeAnimationId]);

  const handleMagicDetect = async () => {
    if (!currentAnim?.imageSrc) return;
    setIsProcessing(true);
    try {
      const result = await analyzeSpriteSheet(currentAnim.imageSrc);
      if (result) {
        const img = new Image();
        img.src = currentAnim.imageSrc;
        await new Promise(r => img.onload = r);
        
        const { rows, cols, backgroundColor } = result;
        const newW = Math.floor(img.naturalWidth / cols);
        const newH = Math.floor(img.naturalHeight / rows);
        const total = rows * cols;
        const allFrames = Array.from({ length: total }, (_, i) => i);

        const newConfig = {
          ...currentAnim.spriteConfig,
          rows, cols, width: newW, height: newH, totalFrames: total
        };
        
        let newBgConfig = { ...currentAnim.bgConfig };
        if (backgroundColor) {
             // Check if already exists in object array
             const exists = newBgConfig.colors.some(c => c.color.toLowerCase() === backgroundColor.toLowerCase());
             if (!exists) {
                 newBgConfig.colors = [{ color: backgroundColor, tolerance: 10 }, ...newBgConfig.colors];
                 newBgConfig.enabled = true;
             }
        }

        updateEntry(activeAnimationId, {
            spriteConfig: newConfig,
            bgConfig: newBgConfig,
            frames: allFrames
        });
      }
    } catch (e) {
      console.error(e);
      alert("AI Detection failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const addAnimation = () => {
    const id = `anim_${Date.now()}`;
    const newAnim: AnimationEntry = {
        id,
        name: 'New Anim',
        imageSrc: null,
        spriteConfig: { ...DEFAULT_SPRITE_CONFIG, frameOffsets: {} },
        bgConfig: { ...DEFAULT_BG_CONFIG, colors: [{ color: '#00ff00', tolerance: 10 }] },
        animConfig: { ...DEFAULT_ANIM_CONFIG },
        frames: []
    };
    setAnimations(prev => [...prev, newAnim]);
    setActiveAnimationId(id);
    setRenamingAnimId(id);
    setSelectedFrameIndex(null);
  };

  const removeAnimation = (id: string) => {
      if (animations.length <= 1) return;
      const newAnims = animations.filter(a => a.id !== id);
      setAnimations(newAnims);
      if (activeAnimationId === id) {
          setActiveAnimationId(newAnims[0].id);
          setSelectedFrameIndex(null);
      }
  };

  // --- Export ---
  const handleExport = async (type: 'download' | 'clipboard' | 'json' | 'ts' | 'project') => {
      if (type === 'project') {
          const blob = await createProjectBundle(animations);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `my-sprites.sforge`;
          a.click();
          return;
      }

      if (!currentAnim) return;

      if (type === 'download' || type === 'clipboard') {
          if (playableFrames.length === 0) return alert("No frames in current animation");
          const blob = await stitchFrames(playableFrames, currentAnim.spriteConfig.width, currentAnim.spriteConfig.height);
          if (!blob) return;

          if (type === 'download') {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${currentAnim.name}.png`;
              a.click();
          } else {
              try {
                  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
              } catch (e) { alert("Clipboard failed"); }
          }
      } 
      else if (type === 'json' || type === 'ts') {
          // Export ALL animations data
          const exportData: any = {
              meta: { generatedBy: "SpriteForge" },
              animations: {}
          };
          
          for (const anim of animations) {
              if (!anim.imageSrc) continue;
              
              const img = new Image();
              img.src = anim.imageSrc;
              await new Promise(r => img.onload = r);
              const frames = sliceFrames(img, anim.spriteConfig, anim.bgConfig);
              const animFrames = anim.frames.map(i => frames[i]).filter(Boolean);
              
              if (animFrames.length === 0) continue;
              
              const blob = await stitchFrames(animFrames, anim.spriteConfig.width, anim.spriteConfig.height);
              if (!blob) continue;

              const reader = new FileReader();
              const base64 = await new Promise<string>(resolve => {
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
              });

              exportData.animations[anim.name] = {
                  fps: anim.animConfig.fps,
                  loop: anim.animConfig.loop,
                  frameWidth: anim.spriteConfig.width,
                  frameHeight: anim.spriteConfig.height,
                  totalFrames: animFrames.length,
                  image: base64
              };
          }

          const str = type === 'json' 
            ? JSON.stringify(exportData, null, 2)
            : `export default ${JSON.stringify(exportData, null, 2)};`;
          
          const blob = new Blob([str], { type: type === 'json' ? 'application/json' : 'application/typescript' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `project.${type}`;
          a.click();
      }
  };


  // --- Render ---

  const isResizing = useRef(false);
  const startResizing = useCallback(() => { isResizing.current = true; document.addEventListener('mousemove', resize); document.addEventListener('mouseup', stopResizing); document.body.style.cursor = 'col-resize'; }, []);
  const resize = useCallback((e: MouseEvent) => { if (isResizing.current) { const newWidth = document.body.clientWidth - e.clientX; if (newWidth > 250 && newWidth < 800) setPreviewWidth(newWidth); } }, []);
  const stopResizing = useCallback(() => { isResizing.current = false; document.removeEventListener('mousemove', resize); document.removeEventListener('mouseup', stopResizing); document.body.style.cursor = 'default'; }, [resize]);


  return (
    <div className="h-full w-full flex flex-col bg-gray-950 text-gray-200">
      {/* Header */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-2">
           <Layers className="text-blue-500" />
           <span className="font-bold text-lg text-gray-100">SpriteForge</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
             onClick={() => currentAnim && updateEntry(currentAnim.id, { spriteConfig: { ...currentAnim.spriteConfig, showCrosshair: !currentAnim.spriteConfig.showCrosshair } })}
             className={`p-2 rounded hover:bg-gray-800 transition-colors ${currentAnim?.spriteConfig.showCrosshair ? 'text-cyan-400' : 'text-gray-500'}`}
             title="Toggle Crosshairs"
          >
            <Crosshair size={20} />
          </button>
          <button 
             onClick={handleNewProject}
             className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 size={16} /> New Project
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto shrink-0 custom-scrollbar z-10 pb-10">
          <div className="p-4 space-y-6">
            
            {/* AI Detect */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30">
              <button 
                onClick={handleMagicDetect}
                disabled={isProcessing || !currentAnim?.imageSrc}
                className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                {isProcessing ? "Analyzing..." : "Magic Detect"}
              </button>
            </div>

            {/* Animations List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-gray-400 text-sm uppercase tracking-wider font-bold">
                <div className="flex items-center gap-2"><PlayCircle size={14} /> Animations</div>
                <button onClick={addAnimation} className="text-blue-400 hover:text-blue-300"><Plus size={16} /></button>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {animations.map((anim) => (
                  <div 
                    key={anim.id}
                    onClick={() => setActiveAnimationId(anim.id)}
                    onDoubleClick={() => setRenamingAnimId(anim.id)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-all ${
                      activeAnimationId === anim.id 
                      ? 'bg-blue-900/40 border-blue-500/50' 
                      : 'bg-gray-800 border-transparent hover:border-gray-700'
                    }`}
                  >
                     <div className="flex-1 min-w-0">
                        {renamingAnimId === anim.id ? (
                            <input 
                              autoFocus
                              defaultValue={anim.name}
                              onBlur={(e) => { updateEntry(anim.id, {name: e.target.value}); setRenamingAnimId(null); }}
                              onKeyDown={(e) => { if(e.key === 'Enter') { updateEntry(anim.id, {name: (e.target as any).value}); setRenamingAnimId(null); } }}
                              className="bg-gray-900 text-sm w-full border border-blue-500 rounded px-1 outline-none"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${anim.imageSrc ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-sm font-medium text-gray-200 truncate">{anim.name}</span>
                            </div>
                        )}
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); removeAnimation(anim.id); }} className="text-gray-500 hover:text-red-400 p-1"><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Configs (Only if image loaded) */}
            {currentAnim && currentAnim.imageSrc ? (
                <>
                {/* Frame Properties */}
                {selectedFrameIndex !== null && (
                    <div className="p-3 bg-cyan-900/10 border border-cyan-500/30 rounded-lg space-y-3 animate-in fade-in slide-in-from-left-2">
                        <div className="flex items-center justify-between text-cyan-400 text-xs font-bold uppercase">
                            <div className="flex items-center gap-1"><Move size={12}/> Frame #{selectedFrameIndex + 1}</div>
                            <button 
                                onClick={() => {
                                    const newOffsets = {...currentAnim.spriteConfig.frameOffsets};
                                    delete newOffsets[selectedFrameIndex];
                                    updateEntry(currentAnim.id, { spriteConfig: {...currentAnim.spriteConfig, frameOffsets: newOffsets} });
                                }}
                                className="p-1 hover:bg-cyan-900/40 rounded text-cyan-300"
                            >
                                <RotateCcw size={12} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Offsets */}
                            <div className="space-y-1">
                                <label className="text-[10px] text-cyan-200/70 block">Offset X</label>
                                <input 
                                    type="number" 
                                    value={currentAnim.spriteConfig.frameOffsets[selectedFrameIndex]?.x || 0}
                                    onChange={(e) => {
                                        const newOffsets = {...currentAnim.spriteConfig.frameOffsets};
                                        const cur = newOffsets[selectedFrameIndex] || {x:0, y:0};
                                        newOffsets[selectedFrameIndex] = { ...cur, x: parseFloat(e.target.value) };
                                        updateEntry(currentAnim.id, { spriteConfig: {...currentAnim.spriteConfig, frameOffsets: newOffsets} });
                                    }}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs focus:border-cyan-500 outline-none font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-cyan-200/70 block">Offset Y</label>
                                <input 
                                    type="number" 
                                    value={currentAnim.spriteConfig.frameOffsets[selectedFrameIndex]?.y || 0}
                                    onChange={(e) => {
                                        const newOffsets = {...currentAnim.spriteConfig.frameOffsets};
                                        const cur = newOffsets[selectedFrameIndex] || {x:0, y:0};
                                        newOffsets[selectedFrameIndex] = { ...cur, y: parseFloat(e.target.value) };
                                        updateEntry(currentAnim.id, { spriteConfig: {...currentAnim.spriteConfig, frameOffsets: newOffsets} });
                                    }}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs focus:border-cyan-500 outline-none font-mono"
                                />
                            </div>

                            {/* Dimensions */}
                            <div className="space-y-1">
                                <label className="text-[10px] text-cyan-200/70 block">Width (px)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={currentAnim.spriteConfig.frameOffsets[selectedFrameIndex]?.w ?? currentAnim.spriteConfig.width}
                                    onChange={(e) => {
                                        const val = Math.max(1, parseFloat(e.target.value));
                                        const newOffsets = {...currentAnim.spriteConfig.frameOffsets};
                                        const cur = newOffsets[selectedFrameIndex] || {x:0, y:0};
                                        newOffsets[selectedFrameIndex] = { ...cur, w: val };
                                        updateEntry(currentAnim.id, { spriteConfig: {...currentAnim.spriteConfig, frameOffsets: newOffsets} });
                                    }}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs focus:border-cyan-500 outline-none font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-cyan-200/70 block">Height (px)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={currentAnim.spriteConfig.frameOffsets[selectedFrameIndex]?.h ?? currentAnim.spriteConfig.height}
                                    onChange={(e) => {
                                        const val = Math.max(1, parseFloat(e.target.value));
                                        const newOffsets = {...currentAnim.spriteConfig.frameOffsets};
                                        const cur = newOffsets[selectedFrameIndex] || {x:0, y:0};
                                        newOffsets[selectedFrameIndex] = { ...cur, h: val };
                                        updateEntry(currentAnim.id, { spriteConfig: {...currentAnim.spriteConfig, frameOffsets: newOffsets} });
                                    }}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs focus:border-cyan-500 outline-none font-mono"
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                <hr className="border-gray-800" />
                
                {/* Grid Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm uppercase tracking-wider font-bold"><Grid size={14} /> Grid Layout</div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-xs text-gray-500">Rows</label>
                          <input type="number" min="1" value={currentAnim.spriteConfig.rows} onChange={(e) => updateGrid('rows', parseInt(e.target.value)||1)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs text-gray-500">Cols</label>
                          <input type="number" min="1" value={currentAnim.spriteConfig.cols} onChange={(e) => updateGrid('cols', parseInt(e.target.value)||1)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" />
                      </div>
                  </div>
                   <div className="space-y-1 pt-2">
                        <label className="text-xs text-gray-500">Offset (X / Y) & Margin</label>
                        <div className="flex gap-2">
                        <input type="number" value={currentAnim.spriteConfig.offsetX} onChange={(e) => updateCurrentConfig({offsetX: parseInt(e.target.value)||0})} className="w-1/3 bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" placeholder="X" />
                        <input type="number" value={currentAnim.spriteConfig.offsetY} onChange={(e) => updateCurrentConfig({offsetY: parseInt(e.target.value)||0})} className="w-1/3 bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" placeholder="Y" />
                        <input type="number" value={currentAnim.spriteConfig.margin} onChange={(e) => updateCurrentConfig({margin: parseInt(e.target.value)||0})} className="w-1/3 bg-gray-800 border border-gray-700 rounded p-2 text-sm outline-none" placeholder="Gap" />
                        </div>
                    </div>
                </div>

                <hr className="border-gray-800" />

                {/* Background Settings */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between text-gray-400 text-sm uppercase tracking-wider font-bold">
                        <div className="flex items-center gap-2"><Settings2 size={14} /> Background</div>
                        <button onClick={() => updateEntry(currentAnim.id, { bgConfig: {...currentAnim.bgConfig, enabled: !currentAnim.bgConfig.enabled} })} className={`w-10 h-5 rounded-full relative transition-colors ${currentAnim.bgConfig.enabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${currentAnim.bgConfig.enabled ? 'left-6' : 'left-1'}`} />
                        </button>
                   </div>
                   {currentAnim.bgConfig.enabled && (
                       <div className="space-y-3 bg-gray-800/50 p-3 rounded-lg border border-gray-800">
                           <div className="space-y-2">
                               {currentAnim.bgConfig.colors.map((c, i) => (
                                   <div key={i} className="flex flex-col gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700 shadow-sm group hover:border-blue-500/50 transition-all">
                                      <div className="flex items-center gap-2">
                                         <input 
                                            type="color" 
                                            value={c.color} 
                                            onChange={(e) => {
                                                 const newColors = [...currentAnim.bgConfig.colors];
                                                 newColors[i] = { ...newColors[i], color: e.target.value };
                                                 updateEntry(currentAnim.id, { bgConfig: {...currentAnim.bgConfig, colors: newColors} });
                                            }} 
                                            className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 hover:border-2 hover:border-white/50"
                                         />
                                         <div className="flex-1">
                                             <label className="text-[10px] text-gray-500 font-mono uppercase">Color #{i+1}</label>
                                         </div>
                                         <button onClick={() => {
                                              const newColors = currentAnim.bgConfig.colors.filter((_, idx) => idx !== i);
                                              updateEntry(currentAnim.id, { bgConfig: {...currentAnim.bgConfig, colors: newColors} });
                                         }} className="text-gray-500 hover:text-red-400 p-2"><X size={16}/></button>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-gray-500 uppercase min-w-[30px]">Tol</span>
                                          <input 
                                              type="range" 
                                              min="0" 
                                              max="100" 
                                              value={c.tolerance} 
                                              onChange={(e) => {
                                                  const newColors = [...currentAnim.bgConfig.colors];
                                                  newColors[i] = { ...newColors[i], tolerance: parseInt(e.target.value) };
                                                  updateEntry(currentAnim.id, { bgConfig: {...currentAnim.bgConfig, colors: newColors} });
                                              }} 
                                              className="w-full h-1 bg-gray-700 rounded appearance-none accent-blue-500" 
                                          />
                                          <span className="text-[10px] text-gray-400 w-6 text-right">{c.tolerance}</span>
                                      </div>
                                   </div>
                               ))}
                               <button 
                                  onClick={() => updateEntry(currentAnim.id, { bgConfig: {...currentAnim.bgConfig, colors: [...currentAnim.bgConfig.colors, {color: '#000000', tolerance: 10}]} })} 
                                  className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-blue-500 hover:border-blue-500 flex items-center justify-center transition-colors text-xs gap-1"
                               >
                                  <Plus size={14}/> Add Color
                               </button>
                           </div>
                           
                           <hr className="border-gray-700/50" />

                           <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 font-semibold uppercase">Edge Radius</label>
                                    <input type="range" min="0" max="10" value={currentAnim.bgConfig.edgeRadius} onChange={(e) => updateEntry(currentAnim.id, { bgConfig: {...currentAnim.bgConfig, edgeRadius: parseInt(e.target.value)} })} className="w-full h-1 bg-gray-700 rounded appearance-none accent-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 font-semibold uppercase">Edge Opacity</label>
                                    <input type="range" min="0" max="100" value={currentAnim.bgConfig.edgeOpacity} onChange={(e) => updateEntry(currentAnim.id, { bgConfig: {...currentAnim.bgConfig, edgeOpacity: parseInt(e.target.value)} })} className="w-full h-1 bg-gray-700 rounded appearance-none accent-blue-500" />
                                </div>
                           </div>
                           <div className="flex items-center gap-3 pt-1 bg-gray-900/50 p-2 rounded border border-gray-700/50">
                                <label className="text-[10px] text-gray-500 font-semibold uppercase min-w-[30px]">Tint</label>
                                <input 
                                  type="color" 
                                  value={currentAnim.bgConfig.edgeTint} 
                                  onChange={(e) => updateEntry(currentAnim.id, { bgConfig: {...currentAnim.bgConfig, edgeTint: e.target.value} })} 
                                  className="h-8 w-10 rounded cursor-pointer bg-transparent border-none p-0" 
                                />
                                <input type="range" min="0" max="100" value={currentAnim.bgConfig.edgeTintIntensity} onChange={(e) => updateEntry(currentAnim.id, { bgConfig: {...currentAnim.bgConfig, edgeTintIntensity: parseInt(e.target.value)} })} className="flex-1 h-1 bg-gray-700 rounded appearance-none accent-blue-500" />
                           </div>
                       </div>
                   )}
                </div>
                </>
            ) : (
                <div className="p-4 text-center text-gray-500 text-sm border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
                    <p>No image loaded for this animation.</p>
                </div>
            )}
            
            <hr className="border-gray-800" />

            <div className="space-y-4">
               <div className="flex items-center gap-2 text-gray-400 text-sm uppercase tracking-wider font-bold">
                  <Download size={14} /> Export Options
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleExport('project')} className="flex flex-col items-center justify-center p-3 bg-indigo-900/40 hover:bg-indigo-900/60 rounded-lg border border-indigo-700/50 text-xs text-indigo-200 gap-1"><Save size={16} /><span>Save Project</span></button>
                  <button onClick={() => handleExport('download')} disabled={!currentAnim?.imageSrc} className="disabled:opacity-50 flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-xs text-gray-300 gap-1"><Download size={16} /><span>Strip (Active)</span></button>
                  <button onClick={() => handleExport('clipboard')} disabled={!currentAnim?.imageSrc} className="disabled:opacity-50 flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-xs text-gray-300 gap-1"><Copy size={16} /><span>{copySuccess ? 'Copied' : 'Copy'}</span></button>
                  <button onClick={() => handleExport('json')} disabled={!currentAnim?.imageSrc} className="disabled:opacity-50 flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-xs text-gray-300 gap-1"><FileJson size={16} /><span>JSON (All)</span></button>
                  <button onClick={() => handleExport('ts')} disabled={!currentAnim?.imageSrc} className="disabled:opacity-50 flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-xs text-gray-300 gap-1"><FileCode size={16} /><span>TS (All)</span></button>
               </div>
            </div>

          </div>
        </aside>

        {/* Center Canvas */}
        <section key={activeAnimationId} className="flex-1 flex flex-col relative bg-gray-950 overflow-hidden">
          {currentAnim && currentAnim.imageSrc ? (
              <SpriteEditor 
                entry={currentAnim}
                activeAnimationId={activeAnimationId}
                selectedFrameIndex={selectedFrameIndex}
                onConfigChange={(newConfig) => updateEntry(currentAnim.id, { spriteConfig: newConfig })}
                onEntryUpdate={(updates) => updateEntry(currentAnim.id, updates)}
                onFrameSelect={setSelectedFrameIndex}
              />
          ) : (
              <div className="h-full w-full flex items-center justify-center p-8">
                  <div className="max-w-lg w-full">
                      <DropZone onFileReady={handleFileLoad} />
                      <p className="text-center text-gray-500 mt-4 text-sm">Upload an image for "<strong>{currentAnim?.name}</strong>"</p>
                  </div>
              </div>
          )}
        </section>

        <div className="w-1.5 bg-gray-900 border-l border-r border-gray-800 cursor-col-resize hover:bg-blue-500/50 hover:border-blue-400 z-30 flex items-center justify-center" onMouseDown={startResizing}>
            <GripVertical size={12} className="text-gray-600" />
        </div>

        {/* Right Sidebar - Preview */}
        <aside className="bg-gray-900 p-4 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar z-10" style={{ width: previewWidth }}>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider font-bold mb-2">Animation Preview</h3>
            {currentAnim ? (
                <AnimationPreview 
                    frames={playableFrames}
                    config={currentAnim.animConfig}
                    setConfig={(cfg) => updateEntry(currentAnim.id, { animConfig: cfg })}
                />
            ) : <div className="text-gray-500 text-sm">No animation selected</div>}
            
            <div className="bg-blue-900/20 border border-blue-900/50 p-3 rounded-lg flex gap-3 items-start">
                <Info className="text-blue-400 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-blue-200 space-y-1">
                <p><strong>Click Frame body</strong> to select & edit.</p>
                <p><strong>Eye Icon</strong> includes/excludes frame.</p>
                <p><strong>Drag Handles</strong> to resize capture area.</p>
                </div>
            </div>
        </aside>
      </main>
    </div>
  );
};

export default App;
