import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SpriteConfig, AnimationConfig, BackgroundRemovalConfig, AnimationEntry, SourceLayer } from './types';
import { sliceFrames, stitchFrames, createProjectBundle, loadProjectBundle } from './utils';
import { analyzeSpriteSheet } from './services/geminiService';
import { GripVertical } from 'lucide-react';

// Components
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import DropZone from './components/DropZone';
import SpriteEditor from './components/SpriteEditor';
import Timeline from './components/Timeline';

const DEFAULT_SPRITE_CONFIG: SpriteConfig = {
  rows: 1, cols: 1, width: 0, height: 0,
  offsetX: 0, offsetY: 0, margin: 0,
  totalFrames: 1, frameOffsets: {}, showCrosshair: false
};

const DEFAULT_BG_CONFIG: BackgroundRemovalConfig = {
  enabled: false, 
  colors: [{ color: '#00ff00', tolerance: 10 }], 
  tolerance: 10, 
  edgeRadius: 0, edgeOpacity: 100, edgeTint: '#000000', edgeTintIntensity: 0
};

const DEFAULT_ANIM_CONFIG: AnimationConfig = {
  fps: 12, isPlaying: true, loop: true, scale: 1
};

const App: React.FC = () => {
  // State
  const [animations, setAnimations] = useState<AnimationEntry[]>([]);
  const [activeAnimationId, setActiveAnimationId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(400);
  const [timelineHeight, setTimelineHeight] = useState(180);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null); // Grid Index
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState<number | null>(null); // Timeline Index
  const [toolMode, setToolMode] = useState<'select' | 'move_layer'>('select');
  const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);

  // Derived State
  const currentAnim = useMemo(() => 
    animations.find(a => a.id === activeAnimationId), 
  [animations, activeAnimationId]);

  const playableFrames = useMemo(() => {
    if (!currentAnim) return [];
    return currentAnim.frames.map(idx => generatedFrames[idx]).filter(Boolean);
  }, [currentAnim?.frames, generatedFrames]);

  // --- Effects ---

  // Initialize Default Animation
  useEffect(() => {
    if (animations.length === 0) {
      const newId = 'anim_default';
      setAnimations([{
        id: newId,
        name: 'Idle',
        imageSrc: null,
        layers: [],
        spriteConfig: { ...DEFAULT_SPRITE_CONFIG, frameOffsets: {} },
        bgConfig: { ...DEFAULT_BG_CONFIG, colors: [{color: '#00ff00', tolerance: 10}] },
        animConfig: { ...DEFAULT_ANIM_CONFIG },
        frames: []
      }]);
      setActiveAnimationId(newId);
    }
  }, [animations.length]);

  // Frame Generation
  useEffect(() => {
    if (!currentAnim) {
      setGeneratedFrames([]);
      return;
    }
    const timer = setTimeout(async () => {
        if (currentAnim.layers.length > 0) {
            const frames = await sliceFrames(currentAnim.layers, currentAnim.spriteConfig, currentAnim.bgConfig);
            setGeneratedFrames(frames);
        } else {
            setGeneratedFrames([]);
        }
    }, 50);
    return () => clearTimeout(timer);
  }, [currentAnim]); 

  // --- Helpers ---

  const updateEntry = (id: string, updates: Partial<AnimationEntry>) => {
    setAnimations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const updateGrid = (key: keyof SpriteConfig, value: number) => {
    if (!currentAnim || currentAnim.layers.length === 0) return;
    const img = new Image();
    img.src = currentAnim.layers[0].imageSrc;
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
        next.totalFrames = Math.max(next.totalFrames, prevConfig.totalFrames);
        updateEntry(currentAnim.id, { spriteConfig: next });
    };
  };

  // --- Handlers ---

  const handleNewProject = () => {
    if(confirm("Start a new project? All unsaved changes will be lost.")) {
         const newId = `anim_${Date.now()}`;
         setAnimations([{
            id: newId,
            name: 'Idle',
            imageSrc: null,
            layers: [],
            spriteConfig: { ...DEFAULT_SPRITE_CONFIG, frameOffsets: {} },
            bgConfig: { ...DEFAULT_BG_CONFIG, colors: [{ color: '#00ff00', tolerance: 10 }] },
            animConfig: { ...DEFAULT_ANIM_CONFIG },
            frames: []
         }]);
         setActiveAnimationId(newId);
         setSelectedFrameIndex(null);
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
        }
      } catch (e) {
        console.error(e);
        alert("Failed to load project.");
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
        img.onload = () => {
            if (!currentAnim) return;
            const newLayer: SourceLayer = {
                id: `layer_${Date.now()}`,
                name: file.name,
                imageSrc: src,
                x: 0, y: 0, opacity: 1, visible: true
            };
            const newLayers = [...currentAnim.layers, newLayer];
            let newConfig = { ...currentAnim.spriteConfig };
            let newFrames = [...currentAnim.frames];

            if (currentAnim.layers.length === 0) {
                 const estimatedCols = 4;
                 const w = Math.floor(img.naturalWidth / estimatedCols);
                 newConfig = { ...newConfig, cols: estimatedCols, rows: 1, width: w, height: img.naturalHeight, totalFrames: estimatedCols };
                 newFrames = Array.from({ length: estimatedCols }, (_, i) => i);
            }
            updateEntry(currentAnim.id, { layers: newLayers, spriteConfig: newConfig, frames: newFrames });
        };
        img.src = src;
      }
    };
    reader.readAsDataURL(file);
  }, [activeAnimationId, currentAnim]);

  const handleMagicDetect = async () => {
    if (!currentAnim || currentAnim.layers.length === 0) return;
    setIsProcessing(true);
    const mainSrc = currentAnim.layers[0].imageSrc;
    try {
      const result = await analyzeSpriteSheet(mainSrc);
      if (result) {
        const img = new Image();
        img.src = mainSrc;
        await new Promise(r => img.onload = r);
        const { rows, cols, backgroundColor } = result;
        const newW = Math.floor(img.naturalWidth / cols);
        const newH = Math.floor(img.naturalHeight / rows);
        const total = rows * cols;
        const allFrames = Array.from({ length: total }, (_, i) => i);

        const newConfig = { ...currentAnim.spriteConfig, rows, cols, width: newW, height: newH, totalFrames: total };
        let newBgConfig = { ...currentAnim.bgConfig };
        if (backgroundColor) {
             const exists = newBgConfig.colors.some(c => c.color.toLowerCase() === backgroundColor.toLowerCase());
             if (!exists) {
                 newBgConfig.colors = [{ color: backgroundColor, tolerance: 10 }, ...newBgConfig.colors];
                 newBgConfig.enabled = true;
             }
        }
        updateEntry(activeAnimationId, { spriteConfig: newConfig, bgConfig: newBgConfig, frames: allFrames });
      }
    } catch (e) {
      console.error(e);
      alert("AI Detection failed.");
    } finally {
      setIsProcessing(false);
    }
  };

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
          const blob = await stitchFrames(playableFrames);
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
          const exportData: any = { meta: { generatedBy: "SpriteForge" }, animations: {} };
          for (const anim of animations) {
              if (anim.layers.length === 0 && !anim.imageSrc) continue;
              const frames = await sliceFrames(anim.layers, anim.spriteConfig, anim.bgConfig);
              const animFrames = anim.frames.map(i => frames[i]).filter(Boolean);
              if (animFrames.length === 0) continue;
              const blob = await stitchFrames(animFrames);
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
          const str = type === 'json' ? JSON.stringify(exportData, null, 2) : `export default ${JSON.stringify(exportData, null, 2)};`;
          const blob = new Blob([str], { type: type === 'json' ? 'application/json' : 'application/typescript' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `project.${type}`;
          a.click();
      }
  };

  // --- Resizers ---
  const isResizingPreview = useRef(false);
  const isResizingTimeline = useRef(false);

  useEffect(() => {
      const handleMove = (e: MouseEvent) => {
          if (isResizingPreview.current) {
              const newW = document.body.clientWidth - e.clientX;
              if (newW > 250 && newW < 600) setPreviewWidth(newW);
          }
          if (isResizingTimeline.current) {
              const newH = document.body.clientHeight - e.clientY;
              if (newH > 100 && newH < 400) setTimelineHeight(newH);
          }
      };
      const handleUp = () => { isResizingPreview.current = false; isResizingTimeline.current = false; document.body.style.cursor = 'default'; };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
  }, []);


  return (
    <div className="h-full w-full flex flex-col bg-gray-950 text-gray-200">
      
      <Header 
        currentAnimId={activeAnimationId}
        showCrosshair={currentAnim?.spriteConfig.showCrosshair || false}
        onToggleCrosshair={() => currentAnim && updateEntry(currentAnim.id, { spriteConfig: { ...currentAnim.spriteConfig, showCrosshair: !currentAnim.spriteConfig.showCrosshair } })}
        onNewProject={handleNewProject}
        toolMode={toolMode}
        onToolModeChange={setToolMode}
      />

      <div className="flex-1 flex overflow-hidden relative">
        
        <LeftSidebar 
            isProcessing={isProcessing}
            animations={animations}
            activeAnimationId={activeAnimationId}
            onSelectAnim={(id) => { setActiveAnimationId(id); setSelectedFrameIndex(null); }}
            onRenameAnim={(id, name) => updateEntry(id, { name })}
            onAddAnim={() => {
                const id = `anim_${Date.now()}`;
                setAnimations(prev => [...prev, {
                    id, name: 'New Anim', imageSrc: null, layers: [],
                    spriteConfig: { ...DEFAULT_SPRITE_CONFIG, frameOffsets: {} },
                    bgConfig: { ...DEFAULT_BG_CONFIG, colors: [{ color: '#00ff00', tolerance: 10 }] },
                    animConfig: { ...DEFAULT_ANIM_CONFIG }, frames: []
                }]);
                setActiveAnimationId(id);
                setSelectedFrameIndex(null);
            }}
            onRemoveAnim={(id) => {
                if(animations.length <= 1) return;
                const newAnims = animations.filter(a => a.id !== id);
                setAnimations(newAnims);
                if(activeAnimationId === id) setActiveAnimationId(newAnims[0].id);
            }}
            currentAnim={currentAnim}
            onDetect={handleMagicDetect}
            onImportFile={handleFileLoad}
            onUpdateLayers={(layers) => currentAnim && updateEntry(currentAnim.id, { layers })}
            onRemoveLayer={(layerId) => currentAnim && updateEntry(currentAnim.id, { layers: currentAnim.layers.filter(l => l.id !== layerId) })}
            selectedFrameIndex={selectedFrameIndex}
            onUpdateSpriteConfig={(cfg) => currentAnim && updateEntry(currentAnim.id, { spriteConfig: cfg })}
            onUpdateGrid={updateGrid}
            onUpdateBgConfig={(cfg) => currentAnim && updateEntry(currentAnim.id, { bgConfig: cfg })}
            onExport={handleExport}
            copySuccess={copySuccess}
        />

        <section key={activeAnimationId} className="flex-1 flex flex-col min-w-0 bg-gray-950">
            {/* Sprite Editor */}
            <div className="flex-1 relative overflow-hidden border-b border-gray-800">
                {currentAnim && currentAnim.layers.length > 0 ? (
                    <SpriteEditor 
                        entry={currentAnim}
                        activeAnimationId={activeAnimationId}
                        selectedFrameIndex={selectedFrameIndex}
                        onConfigChange={(newConfig) => updateEntry(currentAnim.id, { spriteConfig: newConfig })}
                        onEntryUpdate={(updates) => updateEntry(currentAnim.id, updates)}
                        onFrameSelect={setSelectedFrameIndex}
                        toolMode={toolMode}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center p-8">
                        <div className="max-w-lg w-full">
                            <DropZone onFileReady={handleFileLoad} />
                            <p className="text-center text-gray-500 mt-4 text-sm">Upload an image for "<strong>{currentAnim?.name}</strong>"</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline */}
             <div 
                className="h-1.5 bg-gray-900 border-t border-b border-gray-800 cursor-row-resize hover:bg-blue-500/50 z-20 w-full"
                onMouseDown={() => { isResizingTimeline.current = true; document.body.style.cursor = 'row-resize'; }}
            />
            <div className="shrink-0 relative z-10" style={{ height: timelineHeight }}>
                {currentAnim && (
                    <Timeline 
                        frames={currentAnim.frames}
                        generatedFrames={generatedFrames}
                        onUpdateFrames={(frames) => updateEntry(currentAnim.id, { frames })}
                        selectedFrameIndex={selectedTimelineIndex}
                        onSelectTimelineFrame={setSelectedTimelineIndex}
                        onAddNewFrame={() => {
                            const newTotal = currentAnim.spriteConfig.totalFrames + 1;
                            const newIndex = newTotal - 1;
                            const newOffsets = { ...currentAnim.spriteConfig.frameOffsets, [newIndex]: { x: 0, y: 0, w: 32, h: 32 } };
                            updateEntry(currentAnim.id, { spriteConfig: { ...currentAnim.spriteConfig, totalFrames: newTotal, frameOffsets: newOffsets }, frames: [...currentAnim.frames, newIndex] });
                            setSelectedFrameIndex(newIndex);
                        }}
                    />
                )}
            </div>
        </section>

        <div className="w-1.5 bg-gray-900 border-l border-r border-gray-800 cursor-col-resize hover:bg-blue-500/50 hover:border-blue-400 z-30 flex items-center justify-center" onMouseDown={() => { isResizingPreview.current = true; document.body.style.cursor = 'col-resize'; }}>
            <GripVertical size={12} className="text-gray-600" />
        </div>

        <RightSidebar 
            width={previewWidth}
            currentAnim={currentAnim}
            playableFrames={playableFrames}
            onUpdateAnimConfig={(cfg) => currentAnim && updateEntry(currentAnim.id, { animConfig: cfg })}
        />

      </div>
    </div>
  );
};

export default App;
