import React, { useMemo, useState, useEffect } from 'react';
import { X, Bug, CheckCircle2, XCircle, Play, Zap, Eye, Loader2, ChevronRight, ChevronDown, Circle, AlertTriangle, Settings2, Square, Terminal, History, SkipForward } from 'lucide-react';
import { E2EScenario, StepStatus } from './types';

interface DebugUIProps {
  onClose: () => void;
  onRunE2E: (scenarioId: string) => void;
  onRunAll: () => void;
  onStopE2E?: () => void;
  simSpeed?: number;
  onSetSpeed?: (s: number) => void;
  isRunning?: boolean;
  activeScenarioId?: string | null;
  scenarios: E2EScenario[];
  stepState?: Record<string, { 
      setup: Record<number, { status: StepStatus; error?: string }>,
      steps: Record<number, { status: StepStatus; error?: string }> 
  }>;
}

export const E2EDebugUI: React.FC<DebugUIProps> = ({ 
    onClose, onRunE2E, onRunAll, onStopE2E, scenarios,
    simSpeed = 1, onSetSpeed, isRunning, 
    activeScenarioId,
    stepState = {}
}) => {
  const [expandedScenarios, setExpandedScenarios] = useState<Record<string, boolean>>({});

  useEffect(() => {
      if (activeScenarioId) {
          setExpandedScenarios(prev => ({ ...prev, [activeScenarioId]: true }));
      }
  }, [activeScenarioId]);

  const stats = useMemo(() => {
    let passed = 0;
    let failed = 0;
    scenarios.forEach(s => {
        const scenarioState = stepState[s.id];
        if (scenarioState) {
            const setupVals = Object.values(scenarioState.setup) as { status: StepStatus; error?: string }[];
            const stepVals = Object.values(scenarioState.steps) as { status: StepStatus; error?: string }[];
            const allSteps = [...setupVals, ...stepVals];
            if (allSteps.some(st => st.status === 'failed')) failed++;
            else if (stepVals.length === s.steps.length && allSteps.every(st => st.status === 'success')) passed++;
        }
    });
    return { passed, failed, total: scenarios.length };
  }, [stepState, scenarios]);

  const getStepIcon = (status: StepStatus, isSetup?: boolean) => {
      switch(status) {
          case 'running': return <Loader2 size={12} className="animate-spin text-blue-500" />;
          case 'success': return <CheckCircle2 size={12} className={isSetup ? "text-gray-400" : "text-green-500"} />;
          case 'failed': return <XCircle size={12} className="text-red-500" />;
          default: return <Circle size={12} className="text-txt-muted opacity-30" />;
      }
  };

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-500`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
           <div className="flex items-center gap-3">
               <div className={`p-2 rounded-xl transition-colors duration-500 ${isRunning ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                   <Bug size={20} />
               </div>
               <div>
                   <h2 className="font-bold text-lg leading-none">E2E Diagnostics</h2>
                   <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mt-1">Standalone Package Core</p>
               </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"><X size={24}/></button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0">
            {/* Sidebar Controls */}
            <div className="w-80 border-r border-border-base/10 p-6 flex flex-col gap-6 bg-gray-50 dark:bg-black/20 shrink-0 overflow-y-auto">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 flex items-center gap-2"><Zap size={12}/> Controls</h3>
                    
                    {!isRunning ? (
                        <button onClick={onRunAll} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-500/20 transition-all font-bold group">
                            <SkipForward size={18} fill="currentColor" className="group-hover:translate-x-0.5 transition-transform" />
                            <span>Run All Scenarios</span>
                        </button>
                    ) : (
                        <button onClick={() => onStopE2E?.()} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 transition-all font-bold animate-pulse">
                            <Square size={18} fill="currentColor" />
                            <span>Stop Simulation</span>
                        </button>
                    )}

                    <div className="pt-2 space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest opacity-50 block">Simulation Speed</label>
                        <div className="flex bg-surface rounded-xl p-1 border border-border-base/10">
                            {[{ val: 0.3, label: 'Fast', icon: Zap }, { val: 1, label: 'Normal', icon: Play }, { val: 3, label: 'Slow', icon: Eye }].map(s => (
                                <button key={s.val} onClick={() => onSetSpeed?.(s.val)} className={`flex-1 py-2 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${simSpeed === s.val ? (isRunning ? 'bg-blue-500' : 'bg-purple-500') + ' text-white shadow-lg' : 'text-txt-muted hover:bg-surface-hover/10'}`}>
                                    <s.icon size={12} />
                                    <span>{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-auto space-y-4 pt-6 border-t border-border-base/5">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">Results</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                            <div className="text-2xl font-bold text-green-500">{stats.passed}</div>
                            <div className="text-[10px] uppercase font-bold opacity-60">Passed</div>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
                            <div className="text-[10px] uppercase font-bold opacity-60">Failed</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scenarios List */}
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900">
                <div className="flex px-6 border-b border-border-base/10 bg-gray-50 dark:bg-black/10">
                    <div className={`px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors duration-500 ${isRunning ? 'text-blue-500 border-blue-500' : 'text-purple-500 border-purple-500'}`}>App Scenarios</div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                    {scenarios.map((s) => {
                        const isExpanded = expandedScenarios[s.id];
                        const scenarioState = stepState[s.id] || { setup: {}, steps: {} };
                        const isActive = activeScenarioId === s.id;
                        
                        const setupVals = Object.values(scenarioState.setup) as { status: StepStatus; error?: string }[];
                        const stepVals = Object.values(scenarioState.steps) as { status: StepStatus; error?: string }[];
                        const allVals = [...setupVals, ...stepVals];

                        const isFailed = allVals.some(st => st.status === 'failed');
                        const isFinished = stepVals.length === s.steps.length && !isFailed && !isActive && stepVals.every(st => st.status === 'success');
                        
                        return (
                            <div key={s.id} className={`rounded-2xl border transition-all overflow-hidden ${isActive ? 'bg-blue-500/5 border-blue-500/30' : isFailed ? 'bg-red-500/5 border-red-500/30' : isFinished ? 'bg-green-500/5 border-green-500/30' : 'bg-surface/30 border-border-base/5'}`}>
                                <div onClick={() => setExpandedScenarios(prev => ({...prev, [s.id]: !prev[s.id]}))} className="flex items-center justify-between p-4 cursor-pointer group">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-sm flex items-center gap-2">
                                                {s.name}
                                                {isActive && <Loader2 size={12} className="animate-spin text-blue-500" />}
                                                {isFinished && <CheckCircle2 size={12} className="text-green-500" />}
                                                {isFailed && <AlertTriangle size={12} className="text-red-500" />}
                                            </h4>
                                            <p className="text-[11px] text-txt-muted truncate">{s.description}</p>
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); onRunE2E(s.id); }} disabled={isRunning} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-30 border ${isRunning ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500 hover:text-white'}`}>
                                        {isActive ? 'Simulating...' : 'Run Flow'}
                                    </button>
                                </div>
                                {isExpanded && (
                                    <div className="px-12 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-1.5 opacity-60">
                                            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-txt-muted mb-2"><Settings2 size={10} /> Prerequisites</div>
                                            {s.setup.map((step, idx) => {
                                                const res = scenarioState.setup[idx] || { status: 'pending' as StepStatus };
                                                return (<div key={`setup-${idx}`} className="flex items-center gap-3"><div className="shrink-0">{getStepIcon(res.status, true)}</div><span className="text-[11px] text-txt-secondary italic">{step.name}</span></div>);
                                            })}
                                        </div>
                                        <div className="h-px bg-border-base/5" />
                                        <div className="space-y-2">
                                            <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest mb-2 transition-colors duration-500 ${isRunning ? 'text-blue-500' : 'text-purple-500'}`}><Play size={10} /> Test Logic</div>
                                            {s.steps.map((step, idx) => {
                                                const res = scenarioState.steps[idx] || { status: 'pending' as StepStatus };
                                                return (
                                                    <div key={`step-${idx}`} className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="shrink-0">{getStepIcon(res.status)}</div>
                                                            <span className={`text-xs ${res.status === 'running' ? 'font-bold text-blue-500' : 'text-txt-secondary'}`}>{step.name}</span>
                                                        </div>
                                                        {res.error && <div className="ml-6 p-2 bg-red-500/10 rounded-lg text-[10px] text-red-400 font-mono border border-red-500/10">ERR: {res.error}</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs font-mono opacity-60 shrink-0">
            <div className="flex gap-4">
                <span className="flex items-center gap-1"><Terminal size={12}/> PACKAGE_V1</span>
                <span className="flex items-center gap-1"><History size={12}/> ENCAPSULATED: YES</span>
            </div>
        </div>
    </div>
  );
};