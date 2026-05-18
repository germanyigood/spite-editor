
import React, { useState, useMemo, useRef, memo, useCallback, useEffect } from 'react';
import { ToolMode, SpriteConfig } from '../types';
import { getGraphLayers, generateGridFrames, DEFAULT_SPRITE_CONFIG } from '../utils';
import { useProject } from '../context/ProjectContext';
import { useNodeProcessing } from '../hooks/useNodeProcessing';

// Logic Hooks
import { usePanelResizer } from '../hooks/usePanelResizer';
import { usePreviewState } from '../hooks/usePreviewState';
import { useProjectExport } from '../hooks/useProjectExport';
import { useFileHandler } from '../hooks/useFileHandler';

// Components
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import DropZone from './DropZone';
import SpriteEditor from './SpriteEditor';
import LayoutEditor from './LayoutEditor/LayoutEditor';
import Timeline from './Timeline';
import VideoProcessorModal from './VideoProcessorModal';
import NodeGraph from './NodeEditor/NodeGraph';
import StartupTestRunner from './StartupTestRunner';
import ErrorPopup from './common/ErrorPopup';
import { LayoutShell } from './LayoutShell';
import { GlobalDropOverlay } from './GlobalDropOverlay';

// E2E Package
import { E2EEngine, E2EDebugUI, StepStatus, E2EResult, E2EEngineHandle } from '../tools/packages/aistudio-e2e';
import { E2E_SCENARIOS } from '../tests/e2e.spec';

// --- VIEWPORT STACK ---
const MainViewportStack = memo(({ toolMode, nodeOutputs, currentAnim, layerCount, onFileLoad }: { toolMode: ToolMode, nodeOutputs: any, currentAnim: any, layerCount: number, onFileLoad: (f: File) => void }) => {
    const showNodes = toolMode === 'nodes';
    const showLayout = toolMode === 'layout';
    const showEditor = toolMode !== 'nodes' && toolMode !== 'layout';

    if (!currentAnim || layerCount === 0) {
        return (
            <div className="h-full w-full p-10 flex items-center justify-center bg-transparent">
                <div className="w-full max-w-[400px] h-[400px]">
                    <DropZone onFileReady={onFileLoad} message={<span>Upload assets for <strong className="text-white">{currentAnim?.name || 'Project'}</strong></span>} />
                </div>
            </div>
        );
    }
    return (
        <div className="w-full h-full relative overflow-hidden bg-transparent">
            <div style={{ display: showNodes ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute' }}><NodeGraph visible={showNodes} nodeOutputs={nodeOutputs} /></div>
            <div style={{ display: showLayout ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute' }}><LayoutEditor nodeOutputs={nodeOutputs} /></div>
            <div style={{ display: showEditor ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute' }}><SpriteEditor nodeOutputs={nodeOutputs} /></div>
        </div>
    );
});

export const MainWorkspace: React.FC = () => {
    const { state, dispatch } = useProject();
    const { animations, activeAnimationId, toolMode } = state;
    
    // --- DRAG AND DROP STATE ---
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const dragCounter = useRef(0);

    const currentAnim = useMemo(() => animations.find(a => a.id === activeAnimationId), [animations, activeAnimationId]);
    const layerCount = useMemo(() => currentAnim ? getGraphLayers(currentAnim.nodeGraph).length : 0, [currentAnim]);
    const viewportRef = useRef<HTMLDivElement>(null);

    const { rightPanelWidth, timelineHeight, startResizeRight, startResizeTimeline } = usePanelResizer();
    const { handleExport } = useProjectExport();
    const nodeOutputs = useNodeProcessing({ nodes: currentAnim?.nodeGraph.nodes || [], connections: currentAnim?.nodeGraph.connections || [] });
    const { nodePreviewData, generatedFrames } = usePreviewState(currentAnim, nodeOutputs);
    const { handleFileLoad, handleVideoConfirm, errorMsg, setErrorMsg, pendingVideoFile, setPendingVideoFile } = useFileHandler({ currentAnim, layerCount, viewportRef });

    const [showDebug, setShowDebug] = useState(false);
    const [simSpeed, setSimSpeed] = useState(1);
    const [e2eStepState, setE2EStepState] = useState<Record<string, { 
        setup: Record<number, { status: StepStatus; error?: string }>,
        steps: Record<number, { status: StepStatus; error?: string }> 
    }>>({});
    
    const e2eEngineRef = useRef<E2EEngineHandle>(null);

    // --- GLOBAL DRAG AND DROP HANDLERS ---
    useEffect(() => {
        const resetDragState = () => { setIsDraggingFile(false); dragCounter.current = 0; };
        const onDragEnter = (e: DragEvent) => { e.preventDefault(); dragCounter.current++; if (e.dataTransfer?.types.includes('Files')) setIsDraggingFile(true); };
        const onDragLeave = (e: DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current <= 0 || !e.relatedTarget) resetDragState(); };
        const onDragOver = (e: DragEvent) => { e.preventDefault(); if (!isDraggingFile && e.dataTransfer?.types.includes('Files')) setIsDraggingFile(true); };
        const onDrop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); resetDragState(); if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) handleFileLoad(e.dataTransfer.files[0]); };
        window.addEventListener('dragenter', onDragEnter, true);
        window.addEventListener('dragleave', onDragLeave, true);
        window.addEventListener('dragover', onDragOver, true);
        window.addEventListener('drop', onDrop, true);
        window.addEventListener('dragend', resetDragState, true);
        return () => {
            window.removeEventListener('dragenter', onDragEnter, true);
            window.removeEventListener('dragleave', onDragLeave, true);
            window.removeEventListener('dragover', onDragOver, true);
            window.removeEventListener('drop', onDrop, true);
            window.removeEventListener('dragend', resetDragState, true);
        };
    }, [handleFileLoad, isDraggingFile]);

    const handleRunE2E = useCallback((scenarioId: string) => {
        setE2EStepState(prev => ({ ...prev, [scenarioId]: { setup: {}, steps: {} } }));
        setShowDebug(false);
        return e2eEngineRef.current?.run(scenarioId, E2E_SCENARIOS);
    }, []);

    useEffect(() => {
        (window as any).__RUN_E2E__ = async (id: string) => {
             return await handleRunE2E(id);
        };
    }, [handleRunE2E]);

    const handleRunAllE2E = useCallback(() => {
        const resetState: typeof e2eStepState = {};
        E2E_SCENARIOS.forEach(s => resetState[s.id] = { setup: {}, steps: {} });
        setE2EStepState(resetState);
        setShowDebug(false);
        e2eEngineRef.current?.runAll(E2E_SCENARIOS);
    }, []);

    const handleStopE2E = useCallback(() => {
        e2eEngineRef.current?.stop();
    }, []);

    const onE2EStepUpdate = useCallback((scenarioId: string, stepIndex: number, status: StepStatus, isSetup: boolean, error?: string) => {
        setE2EStepState(prev => {
            const current = prev[scenarioId] || { setup: {}, steps: {} };
            const typeKey = isSetup ? 'setup' : 'steps';
            return {
                ...prev,
                [scenarioId]: {
                    ...current,
                    [typeKey]: { ...current[typeKey], [stepIndex]: { status, error } }
                }
            };
        });
    }, []);

    const handleE2EInject = useCallback((dataUrl: string, name: string) => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth; const h = img.naturalHeight;
            const config: SpriteConfig = { ...DEFAULT_SPRITE_CONFIG, cols: 1, rows: 1, width: w, height: h, totalFrames: 1, frames: generateGridFrames(1, 1, w, h, 0, 0, 0) };
            if (currentAnim) {
                dispatch({ type: 'ADD_LAYER', payload: { animId: currentAnim.id, layer: { name, imageSrc: dataUrl, spriteConfig: config, width: w, height: h } } });
                
                let x = 0;
                let y = 0;
                
                if (viewportRef.current) {
                    x = Math.floor((viewportRef.current.clientWidth - w) / 2);
                    y = Math.floor((viewportRef.current.clientHeight - h) / 2);
                }

                setTimeout(() => {
                    dispatch({ type: 'UPDATE_EDITOR_TRANSFORM', payload: { animId: currentAnim.id, transform: { x, y, scale: 1 } } });
                    dispatch({ type: 'UPDATE_LAYOUT_CAMERA', payload: { animId: currentAnim.id, transform: { x, y, scale: 1 } } });
                }, 50);
            }
        };
        img.src = dataUrl;
    }, [currentAnim, dispatch, viewportRef]);

    const onE2EFinished = useCallback(() => {
        setTimeout(() => { setShowDebug(true); }, 500);
    }, []);

    const handlePanelResize = (panel: 'right' | 'timeline', size: number) => panel === 'right' ? startResizeRight() : startResizeTimeline();

    const leftPanel = <LeftSidebar onImportFile={handleFileLoad} onExport={handleExport} copySuccess={false} />;
    const rightPanel = <RightSidebar width={rightPanelWidth} previewData={nodePreviewData} nodeOutputs={nodeOutputs} />;
    const bottomPanel = currentAnim ? <Timeline generatedFrames={generatedFrames} nodeOutputs={nodeOutputs} /> : null;
    const mainPanel = <MainViewportStack toolMode={toolMode} nodeOutputs={nodeOutputs} currentAnim={currentAnim} layerCount={layerCount} onFileLoad={handleFileLoad} />;

    return (
        <div className="h-full w-full flex flex-col bg-transparent text-txt-primary overflow-hidden relative">
            <GlobalDropOverlay isVisible={isDraggingFile} />
            <E2EEngine 
                ref={e2eEngineRef} 
                simSpeed={simSpeed} 
                onFinished={onE2EFinished}
                onStepUpdate={onE2EStepUpdate}
                onReset={() => dispatch({ type: 'NEW_PROJECT' })}
                onInjectImage={handleE2EInject}
            />
            <StartupTestRunner onOpenDebug={() => setShowDebug(true)} />
            
            {showDebug && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200 p-8">
                    <div className={`w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden border border-white/10`}>
                        <E2EDebugUI 
                            onClose={() => setShowDebug(false)} 
                            onRunE2E={handleRunE2E} 
                            onRunAll={handleRunAllE2E}
                            onStopE2E={handleStopE2E}
                            simSpeed={simSpeed} 
                            onSetSpeed={setSimSpeed} 
                            isRunning={e2eEngineRef.current?.isRunning} 
                            activeScenarioId={e2eEngineRef.current?.activeScenarioId}
                            stepState={e2eStepState}
                            scenarios={E2E_SCENARIOS}
                        />
                    </div>
                </div>
            )}

            {errorMsg && <ErrorPopup message={errorMsg} onClose={() => setErrorMsg(null)} />}
            {pendingVideoFile && <VideoProcessorModal file={pendingVideoFile} onConfirm={handleVideoConfirm} onCancel={() => setPendingVideoFile(null)} />}
            
            <Header onOpenDebug={() => setShowDebug(true)} />
            
            <LayoutShell 
                leftPanel={leftPanel} 
                rightPanel={rightPanel} 
                bottomPanel={bottomPanel} 
                mainPanel={mainPanel} 
                showLeft={true} 
                showRight={true} 
                showTimeline={toolMode !== 'draw'} 
                rightPanelWidth={rightPanelWidth} 
                timelineHeight={timelineHeight} 
                onResizePanel={handlePanelResize} 
                viewportRef={viewportRef} 
            />
        </div>
    );
};
