import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { MousePointer2, Loader2, Square } from 'lucide-react';
import { E2EScenario, E2EResult, StepStatus } from './types';

export interface E2EEngineHandle {
    run: (scenarioId: string, scenarios: E2EScenario[]) => Promise<void>;
    runAll: (scenarios: E2EScenario[]) => Promise<void>;
    stop: () => void;
    isRunning: boolean;
    activeScenarioId: string | null;
}

interface E2EEngineProps {
    simSpeed: number;
    onFinished: (results: E2EResult[]) => void;
    onStepUpdate: (scenarioId: string, stepIndex: number, status: StepStatus, isSetup: boolean, error?: string) => void;
    onReset: () => void;
    onInjectImage: (dataUrl: string, name: string) => void;
}

const VisualMouseOverlay = ({ cursorRef }: { cursorRef: React.MutableRefObject<any> }) => {
    const [pos, setPos] = useState({ x: -100, y: -100 });
    const [isDown, setIsDown] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        cursorRef.current = {
            move: (x: number, y: number) => { setPos({ x, y }); setIsVisible(true); },
            down: (dragging = false) => { setIsDown(true); setIsDragging(dragging); },
            up: () => { setIsDown(false); setIsDragging(false); },
            hide: () => setIsVisible(false)
        };
        (window as any).__E2E_CURSOR__ = cursorRef.current;
        return () => { delete (window as any).__E2E_CURSOR__; };
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed pointer-events-none z-[11000] transition-[left,top] duration-300 ease-out" style={{ left: pos.x, top: pos.y, transform: `translate(-2px, -2px)` }}>
            <div className={`relative flex items-start justify-start transition-transform duration-150 ${isDown ? 'scale-75' : 'scale-100'}`}>
                <div className={`absolute top-0 left-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 bg-red-600/40 rounded-full blur-lg ${isDragging ? 'animate-none' : 'animate-pulse'}`} />
                <div className={`${isDown ? 'text-white' : 'text-red-500'} drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]`}>
                    <MousePointer2 size={28} fill={isDown ? "currentColor" : "rgba(239,68,68,0.3)"} strokeWidth={3} />
                </div>
                {isDown && !isDragging && (
                    <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-4 border-red-500 rounded-full animate-ping opacity-100" />
                )}
            </div>
        </div>
    );
};

export const E2EEngine = forwardRef<E2EEngineHandle, E2EEngineProps>(({ simSpeed, onFinished, onStepUpdate, onReset, onInjectImage }, ref) => {
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [currentStatusName, setCurrentStatusName] = useState("");
    const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
    const cursorRef = useRef<any>(null);
    const isCancelledRef = useRef(false);

    useEffect(() => {
        (window as any).__E2E_SPEED__ = simSpeed;
        (window as any).__E2E_RESET__ = onReset;
        (window as any).__E2E_INJECT_IMAGE__ = onInjectImage;
        return () => {
            delete (window as any).__E2E_SPEED__;
            delete (window as any).__E2E_RESET__;
            delete (window as any).__E2E_INJECT_IMAGE__;
        };
    }, [simSpeed, onReset, onInjectImage]);

    const handleStop = useCallback(() => {
        isCancelledRef.current = true;
        setIsTestRunning(false);
    }, []);

    const runScenario = async (scenario: E2EScenario): Promise<E2EResult> => {
        setRunningScenarioId(scenario.id);
        const setupResults: E2EResult['setupResults'] = {};
        const stepResults: E2EResult['stepResults'] = {};

        const setupSteps = scenario.setup || [];
        for (let i = 0; i < setupSteps.length; i++) {
            if (isCancelledRef.current) break;
            const step = setupSteps[i];
            setCurrentStatusName(`[Setup] ${step.name}`);
            onStepUpdate(scenario.id, i, 'running', true);
            try {
                await step.action();
                setupResults[i] = { status: 'success' };
                onStepUpdate(scenario.id, i, 'success', true);
            } catch (err: any) {
                // NEVER DELETE THESE CONSOLE LOGGING LINES - they are critical for error visibility in the browser console during E2E testing.
                console.group(`%c[E2E SETUP FAIL] ${scenario.name}: ${step.name}`, "color: white; background: #ef4444; padding: 2px 4px; border-radius: 2px; font-weight: bold;");
                console.error("Scenario setup failed:", err);
                console.groupEnd();

                setupResults[i] = { status: 'failed', error: err.message };
                onStepUpdate(scenario.id, i, 'failed', true, err.message);
                return { scenarioId: scenario.id, setupResults, stepResults }; 
            }
            await new Promise(r => setTimeout(r, 300));
        }

        const testSteps = scenario.steps || [];
        for (let i = 0; i < testSteps.length; i++) {
            if (isCancelledRef.current) break;
            const step = testSteps[i];
            setCurrentStatusName(`${scenario.name}: ${step.name}`);
            onStepUpdate(scenario.id, i, 'running', false);
            try {
                await step.action();
                stepResults[i] = { status: 'success' };
                onStepUpdate(scenario.id, i, 'success', false);
            } catch (err: any) {
                // NEVER DELETE THESE CONSOLE LOGGING LINES - they are critical for error visibility in the browser console during E2E testing.
                console.group(`%c[E2E STEP FAIL] ${scenario.name}: ${step.name}`, "color: white; background: #ef4444; padding: 2px 4px; border-radius: 2px; font-weight: bold;");
                console.error("Step execution failed:", err);
                console.groupEnd();

                stepResults[i] = { status: 'failed', error: err.message };
                onStepUpdate(scenario.id, i, 'failed', false, err.message);
                break;
            }
            await new Promise(r => setTimeout(r, 500)); 
        }

        return { scenarioId: scenario.id, setupResults, stepResults };
    };

    const handleRun = useCallback(async (scenarioId: string, scenarios: E2EScenario[]) => {
        isCancelledRef.current = false;
        setIsTestRunning(true);
        const scenario = scenarios.find(s => s.id === scenarioId);
        if (scenario) {
            await runScenario(scenario);
        }
        cursorRef.current?.hide();
        setIsTestRunning(false);
        setRunningScenarioId(null);
        setCurrentStatusName("");
        onFinished([]);
    }, [onFinished, onStepUpdate]);

    const handleRunAll = useCallback(async (scenarios: E2EScenario[]) => {
        isCancelledRef.current = false;
        setIsTestRunning(true);
        const allResults: E2EResult[] = [];
        
        for (const scenario of scenarios) {
            if (isCancelledRef.current) break;
            const res = await runScenario(scenario);
            allResults.push(res);
            await new Promise(r => setTimeout(r, 1000));
        }

        cursorRef.current?.hide();
        setIsTestRunning(false);
        setRunningScenarioId(null);
        setCurrentStatusName("");
        onFinished(allResults);
    }, [onFinished, onStepUpdate]);

    useImperativeHandle(ref, () => ({
        run: handleRun,
        runAll: handleRunAll,
        stop: handleStop,
        isRunning: isTestRunning,
        activeScenarioId: runningScenarioId
    }));

    return (
        <>
            <VisualMouseOverlay cursorRef={cursorRef} />
            {isTestRunning && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10500] flex items-center gap-5 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 font-bold border border-white/20">
                    <Loader2 size={20} className="animate-spin shrink-0" />
                    <div className="flex flex-col min-w-[140px]">
                        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-none mb-1">Executing Flow</span>
                        <span className="text-sm truncate max-w-[220px]">{currentStatusName}</span>
                    </div>
                    <div className="w-px h-8 bg-white/20" />
                    <button onClick={(e) => { e.stopPropagation(); handleStop(); }} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-xl transition-all shadow-lg active:scale-95 group pointer-events-auto">
                        <Square size={14} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs uppercase tracking-wider font-black">STOP</span>
                    </button>
                </div>
            )}
        </>
    );
});