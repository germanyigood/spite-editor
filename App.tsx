
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SpriteConfig, AnimationConfig, BackgroundRemovalConfig, AnimationEntry, SourceLayer } from './types';
import { sliceFrames, stitchFrames, createProjectBundle, loadProjectBundle, createTsCodeZip, DEFAULT_SPRITE_CONFIG } from './utils';
import { analyzeSpriteSheet } from './services/geminiService';
import { GripVertical } from 'lucide-react';

// Components
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import DropZone from './components/DropZone';
import SpriteEditor from './components/SpriteEditor';
import Timeline from './components/Timeline';
import VideoProcessorModal from './components/VideoProcessorModal';

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
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(400);
  const [timelineHeight, setTimelineHeight] = useState(180);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState<number | null>(null);
  const [toolMode, setToolMode] = useState<'select' | 'move_layer'>('select');
  const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);
  
  // Video Processing State
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);

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
            const frames = await sliceFrames(currentAnim.layers, currentAnim.bgConfig);
            setGeneratedFrames(frames);
        } else {
            setGeneratedFrames([]);
        }
    }, 50);
    return () => clearTimeout(timer);
  }, [currentAnim]); 

  // --- Helpers ---

  const updateEntry = useCallback((id: string, updates: Partial<AnimationEntry>) => {
    setAnimations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const updateLayer = (layerId: string, updates: Partial<SourceLayer>) => {
      if (!currentAnim) return;
      const newLayers = currentAnim.layers.map(l => l.id === layerId ? { ...l, ...updates } : l);
      updateEntry(currentAnim.id, { layers: newLayers });
  };

  const updateGrid = (key: keyof SpriteConfig, value: number) => {
    if (!currentAnim || !activeLayerId) return;
    
    const layer = currentAnim.layers.find(l => l.id === activeLayerId);
    if (!layer) return;

    const img = new Image();
    img.src = layer.imageSrc;
    img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const prevConfig = layer.spriteConfig;
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
        updateLayer(activeLayerId, { spriteConfig: next });
    };
  };

  const handleAddFrame = useCallback((addToTimeline: boolean = false) => {
      if (!activeLayerId || !currentAnim) {
          alert("Please select a layer first.");
          return;
      }
      
      const layerIndex = currentAnim.layers.findIndex(l => l.id === activeLayerId);
      if (layerIndex === -1) return;
      const layer = currentAnim.layers[layerIndex];

      const newTotal = layer.spriteConfig.totalFrames + 1;
      const newIndex = newTotal - 1; 
      
      const w = layer.spriteConfig.width || 64;
      const h = layer.spriteConfig.height || 64;

      const newOffsets = { 
          ...layer.spriteConfig.frameOffsets, 
          [newIndex]: { x: 0, y: 0, w, h } 
      };

      const newLayers = [...currentAnim.layers];
      newLayers[layerIndex] = {
          ...layer,
          spriteConfig: { ...layer.spriteConfig, totalFrames: newTotal, frameOffsets: newOffsets }
      };

      let globalThreshold = 0;
      for (let i = 0; i <= layerIndex; i++) {
          globalThreshold += currentAnim.layers[i].spriteConfig.totalFrames;
      }
      
      let newTimelineFrames = currentAnim.frames.map(idx => idx >= globalThreshold ? idx + 1 : idx);

      if (addToTimeline) {
          let thisLayerStart = 0;
          for(let i=0; i<layerIndex; i++) thisLayerStart += currentAnim.layers[i].spriteConfig.totalFrames;
          const newGlobalIndex = thisLayerStart + newIndex; 
          newTimelineFrames = [...newTimelineFrames, newGlobalIndex];
      }

      updateEntry(currentAnim.id, {
          layers: newLayers,
          frames: newTimelineFrames
      });
      
      setSelectedFrameIndex(newIndex);
      if (addToTimeline) {
          setSelectedTimelineIndex(newTimelineFrames.length - 1);
      }

  }, [activeLayerId, currentAnim, updateEntry]);


  // --- Handlers ---

  const handleNewProject = () => {
    if(confirm("Start a new project? All unsaved changes will be lost.")) {
         const newId = `anim_${Date.now()}`;
         setAnimations([{
            id: newId,
            name: 'Idle',
            imageSrc: null,
            layers: [],
            bgConfig: { ...DEFAULT_BG_CONFIG, colors: [{ color: '#00ff00', tolerance: 10 }] },
            animConfig: { ...DEFAULT_ANIM_CONFIG },
            frames: []
         }]);
         setActiveAnimationId(newId);
         setActiveLayerId(null);
         setSelectedFrameIndex(null);
         setGeneratedFrames([]);
         setPendingVideoFile(null);
    }
  };

  const handleFileLoad = useCallback(async (file: File) => {
    // 1. Project Bundle
    if (file.name.endsWith('.sforge') || file.type.includes('zip') || file.type.includes('compressed')) {
      try {
        setIsProcessing(true);
        const loadedEntries = await loadProjectBundle(file);
        if (loadedEntries.length > 0) {
            setAnimations(loadedEntries);
            setActiveAnimationId(loadedEntries[0].id);
            if (loadedEntries[0].layers.length > 0) {
                setActiveLayerId(loadedEntries[0].layers[0].id);
            } else {
                setActiveLayerId(null);
            }
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

    // 2. Video File
    if (file.type.startsWith('video/')) {
        setPendingVideoFile(file);
        return;
    }

    // 3. Image File
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const src = e.target.result as string;
        const img = new Image();
        img.onload = () => {
            if (!currentAnim) return;
            
            const estimatedCols = 4;
            const w = Math.floor(img.naturalWidth / estimatedCols);
            const initialConfig: SpriteConfig = {
                ...DEFAULT_SPRITE_CONFIG,
                cols: estimatedCols,
                rows: 1,
                width: w,
                height: img.naturalHeight,
                totalFrames: estimatedCols
            };

            const newLayerId = `layer_${Date.now()}`;
            const newLayer: SourceLayer = {
                id: newLayerId,
                name: file.name,
                imageSrc: src,
                x: 0, y: 0, opacity: 1, visible: true,
                spriteConfig: initialConfig
            };

            const newLayers = [...currentAnim.layers, newLayer];
            updateEntry(currentAnim.id, { layers: newLayers });
            setActiveLayerId(newLayerId);
        };
        img.src = src;
      }
    };
    reader.readAsDataURL(file);
  }, [activeAnimationId, currentAnim, updateEntry]);

  const handleVideoConfirm = (imageSrc: string, config: { rows: number, cols: number, totalFrames: number, frameWidth: number, frameHeight: number }) => {
      if (!currentAnim || !pendingVideoFile) return;

      const img = new Image();
      img.onload = () => {
          // Use the explicit frame dimensions from the export process to avoid rounding errors
          const w = config.frameWidth;
          const h = config.frameHeight;
          
          const spriteConfig: SpriteConfig = {
              ...DEFAULT_SPRITE_CONFIG,
              rows: config.rows,
              cols: config.cols,
              width: w,
              height: h,
              totalFrames: config.totalFrames
          };

          const newLayerId = `vid_${Date.now()}`;
          const newLayer: SourceLayer = {
              id: newLayerId,
              name: pendingVideoFile.name,
              imageSrc,
              x: 0, y: 0, opacity: 1, visible: true,
              spriteConfig
          };

          // Calculate where the new frames will start in the global generated array
          let globalStartIndex = 0;
          currentAnim.layers.forEach(l => {
              globalStartIndex += l.spriteConfig.totalFrames;
          });

          // Generate indices for the new frames
          const newFrameIndices = Array.from(
              { length: config.totalFrames }, 
              (_, i) => globalStartIndex + i
          );

          const newLayers = [...currentAnim.layers, newLayer];
          const newTimeline = [...currentAnim.frames, ...newFrameIndices];

          updateEntry(currentAnim.id, { 
              layers: newLayers,
              frames: newTimeline 
          });
          
          setActiveLayerId(newLayerId);
          setPendingVideoFile(null);
      };
      img.src = imageSrc;
  };

  const handleMagicDetect = async () => {
    if (!currentAnim || !activeLayerId) return;
    setIsProcessing(true);
    const layer = currentAnim.layers.find(l => l.id === activeLayerId);
    if (!layer) return;

    try {
      const result = await analyzeSpriteSheet(layer.imageSrc);
      if (result) {
        const img = new Image();
        img.src = layer.imageSrc;
        await new Promise(r => img.onload = r);
        const { rows, cols, backgroundColor } = result;
        const newW = Math.floor(img.naturalWidth / cols);
        const newH = Math.floor(img.naturalHeight / rows);
        const total = rows * cols;

        const newConfig = { ...layer.spriteConfig, rows, cols, width: newW, height: newH, totalFrames: total };
        
        let newBgConfig = { ...currentAnim.bgConfig };
        if (backgroundColor) {
             const exists = newBgConfig.colors.some(c => c.color.toLowerCase() === backgroundColor.toLowerCase());
             if (!exists) {
                 newBgConfig.colors = [{ color: backgroundColor, tolerance: 10 }, ...newBgConfig.colors];
                 newBgConfig.enabled = true;
             }
        }
        
        updateLayer(activeLayerId, { spriteConfig: newConfig });
        updateEntry(activeAnimationId, { bgConfig: newBgConfig });
      }
    } catch (e) {
      console.error(e);
      alert("AI Detection failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async (type: 'download' | 'clipboard' | 'json' | 'ts' | 'project' | 'zip-ts') => {
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

      if (type === 'zip-ts') {
          const blob = await createTsCodeZip(animations);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sprites-ts.zip`;
          a.click();
          return;
      }

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
              const frames = await sliceFrames(anim.layers, anim.bgConfig);
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
      
      {pendingVideoFile && (
          <VideoProcessorModal 
             file={pendingVideoFile}
             onConfirm={handleVideoConfirm}
             onCancel={() => setPendingVideoFile(null)}
          />
      )}

      <Header 
        currentAnimId={activeAnimationId}
        showCrosshair={activeLayerId ? currentAnim?.layers.find(l => l.id === activeLayerId)?.spriteConfig.showCrosshair || false : false}
        onToggleCrosshair={() => {
            if (activeLayerId) {
                const layer = currentAnim?.layers.find(l => l.id === activeLayerId);
                if (layer) updateLayer(activeLayerId, { spriteConfig: { ...layer.spriteConfig, showCrosshair: !layer.spriteConfig.showCrosshair } });
            }
        }}
        onNewProject={handleNewProject}
        toolMode={toolMode}
        onToolModeChange={setToolMode}
        onAddFrame={() => handleAddFrame(false)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        
        <LeftSidebar 
            isProcessing={isProcessing}
            animations={animations}
            activeAnimationId={activeAnimationId}
            onSelectAnim={(id) => { 
                setActiveAnimationId(id); 
                const anim = animations.find(a => a.id === id);
                if (anim && anim.layers.length > 0) setActiveLayerId(anim.layers[0].id);
                else setActiveLayerId(null);
                setSelectedFrameIndex(null); 
            }}
            onRenameAnim={(id, name) => updateEntry(id, { name })}
            onAddAnim={() => {
                const id = `anim_${Date.now()}`;
                setAnimations(prev => [...prev, {
                    id, name: 'New Anim', imageSrc: null, layers: [],
                    bgConfig: { ...DEFAULT_BG_CONFIG, colors: [{ color: '#00ff00', tolerance: 10 }] },
                    animConfig: { ...DEFAULT_ANIM_CONFIG }, frames: []
                }]);
                setActiveAnimationId(id);
                setActiveLayerId(null);
                setSelectedFrameIndex(null);
            }}
            onRemoveAnim={(id) => {
                if(animations.length <= 1) return;
                const newAnims = animations.filter(a => a.id !== id);
                setAnimations(newAnims);
                if(activeAnimationId === id) setActiveAnimationId(newAnims[0].id);
            }}
            currentAnim={currentAnim}
            
            // Layer Props
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onImportFile={handleFileLoad}
            onUpdateLayers={(layers) => currentAnim && updateEntry(currentAnim.id, { layers })}
            onRemoveLayer={(layerId) => currentAnim && updateEntry(currentAnim.id, { layers: currentAnim.layers.filter(l => l.id !== layerId) })}
            onUpdateLayer={updateLayer}

            onDetect={handleMagicDetect}
            selectedFrameIndex={selectedFrameIndex}
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
                        activeLayerId={activeLayerId}
                        selectedFrameIndex={selectedFrameIndex}
                        onEntryUpdate={(updates) => updateEntry(currentAnim.id, updates)}
                        onLayerUpdate={updateLayer}
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
                        onAddNewFrame={() => handleAddFrame(true)}
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
