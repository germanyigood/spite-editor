
import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2, FlaskConical, Bug } from 'lucide-react';
import { defineUtilsSpecs } from '../tests/utils.spec';
import { defineReducerSpecs } from '../tests/reducer.spec';
import { defineSeamlessSpecs } from '../tests/seamless.spec';
import { defineExportSpecs } from '../tests/export.spec';
import { defineInteractionSpecs } from '../tests/interaction.spec';
import { defineProcessorSpecs } from '../tests/processor.spec';
import { defineNormalMapSpecs } from '../tests/normalMap.spec';
import { defineProjectSpecs } from '../tests/project.spec';
import { defineTimelineSpecs } from '../tests/timeline.spec';
import { definePerformanceSpecs } from '../tests/performance.spec';
import { defineVideoSpecs } from '../tests/video.spec';
import { defineSwitcherSpecs } from '../tests/switcher.spec';
import { defineLayoutSpecs } from '../tests/layout.spec';
import { defineTopologySpecs } from '../tests/topology.spec';
import { defineSyncSpecs } from '../tests/sync.spec';
import { defineDrawSpecs } from '../tests/draw.spec';
import { definePixelizeSpecs } from '../tests/pixelize.spec';

let testStatus: 'loading' | 'running' | 'success' | 'failure' = 'loading';
let testStats = { total: 0, passed: 0, failed: 0 };
let isInitialized = false;
let updateListeners: (() => void)[] = [];

function notifyListeners() {
  updateListeners.forEach(listener => listener());
}

declare global {
  interface Window {
    jasmine: any;
    jasmineRequire: any;
    __specsDefined?: boolean;
    __jasmineRunning?: boolean;
  }
}

const initializeTests = () => {
  if (isInitialized) return;
  isInitialized = true;

  const loadJasmine = async () => {
    if (window.jasmine && window.jasmineRequire) {
      runTests();
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jasmine/5.1.0/jasmine.js";
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = (e) => reject(new Error(`Script load error`));
        document.head.appendChild(script);
      });
      
      bootJasmine();
      runTests();
    } catch (e) {
      console.error("%c[STARTUP] Jasmine Engine Load Failed", "color: red; font-weight: bold;", e);
      testStatus = 'failure';
      notifyListeners();
    }
  };

  const bootJasmine = () => {
    if (!window.jasmineRequire) return;
    if (window.jasmine) return; 

    const jasmine = window.jasmineRequire.core(window.jasmineRequire);
    window.jasmine = jasmine;
    const env = jasmine.getEnv();
    const jasmineInterface = window.jasmineRequire.interface(jasmine, env);
    Object.assign(window, jasmineInterface);
  };

  const runTests = () => {
    if (window.__jasmineRunning) return;
    window.__jasmineRunning = true;
    
    console.log("%c[STARTUP] Running System Self-Diagnostics...", "color: #3b82f6; font-weight: bold;");

    testStatus = 'running';
    notifyListeners();

    const env = window.jasmine.getEnv();
    env.clearReporters();
    
    if (!window.__specsDefined) {
        defineUtilsSpecs(); defineReducerSpecs(); defineSeamlessSpecs();
        defineExportSpecs(); defineInteractionSpecs(); defineProcessorSpecs();
        defineNormalMapSpecs(); defineProjectSpecs(); defineTimelineSpecs();
        definePerformanceSpecs(); defineVideoSpecs(); defineSwitcherSpecs();
        defineLayoutSpecs(); defineTopologySpecs(); defineSyncSpecs();
        defineDrawSpecs(); definePixelizeSpecs();
        window.__specsDefined = true;
    }

    const reporter = {
      specDone: (result: any) => {
        if (result.status === 'failed') {
          testStats.total++;
          testStats.failed++;
          
          // LOG INDIVIDUAL FAILURE IMMEDIATELY
          console.groupCollapsed(`%c[UNIT FAIL] ${result.fullName}`, "background: #ef4444; color: white; padding: 2px; font-weight: bold;");
          result.failedExpectations.forEach((failure: any) => {
              console.error("Message:", failure.message);
              console.error("Stack:", failure.stack);
          });
          console.groupEnd();
        } else {
          testStats.total++;
          testStats.passed++;
        }
        notifyListeners();
      },
      jasmineDone: (result: any) => {
        window.__jasmineRunning = false;
        if (result?.overallStatus === 'passed') {
          console.log("%c[STARTUP] All systems nominal.", "color: #10b981; font-weight: bold;");
          testStatus = 'success';
        } else {
          console.warn(`%c[STARTUP] Diagnostics complete with ${testStats.failed} failures. See console logs.`, "color: #f59e0b; font-weight: bold;");
          testStatus = 'failure';
        }
        notifyListeners();
      }
    };

    env.addReporter(reporter);
    env.execute();
  };

  loadJasmine();
};

interface StartupTestRunnerProps {
    onOpenDebug: () => void;
}

const StartupTestRunner: React.FC<StartupTestRunnerProps> = ({ onOpenDebug }) => {
  const [status, setStatus] = useState(testStatus);
  const [stats, setStats] = useState({ ...testStats });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    initializeTests();

    const listener = () => {
      setStatus(testStatus);
      setStats({ ...testStats });
    };

    updateListeners.push(listener);
    return () => {
      updateListeners = updateListeners.filter(l => l !== listener);
    };
  }, []);

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className={`fixed bottom-4 right-4 z-[100] max-w-sm w-full animate-in slide-in-from-right-10 duration-500`}>
      <div className={`
        flex items-center gap-3 p-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all
        ${status === 'loading' || status === 'running' ? 'bg-gray-900/80 border-white/10' : ''}
        ${status === 'success' ? 'bg-green-900/80 border-green-500/30 shadow-green-900/20' : ''}
        ${status === 'failure' ? 'bg-red-900/90 border-red-500/50 shadow-red-900/30' : ''}
      `}>
        <div className="shrink-0">
          {(status === 'loading' || status === 'running') && <Loader2 className="animate-spin text-blue-400" size={20} />}
          {status === 'success' && <CheckCircle2 className="text-green-400" size={20} />}
          {status === 'failure' && <XCircle className="text-red-400" size={20} />}
        </div>
        
        <div className="flex-1 min-w-0">
           <div className="flex items-center justify-between mb-0.5">
             <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
               <FlaskConical size={12} className="opacity-50"/> Code Integrity
             </span>
             {status !== 'loading' && <span className="text-[10px] font-mono opacity-60">{stats.passed}/{stats.total}</span>}
           </div>
           <div className="text-[11px] text-gray-300 leading-tight">
             {status === 'loading' && "Initializing..."}
             {status === 'running' && "Running Unit Tests..."}
             {status === 'success' && "All units nominal."}
             {status === 'failure' && <span className="text-red-200 font-semibold">{stats.failed} tests failed.</span>}
           </div>
        </div>

        <button onClick={onOpenDebug} className="shrink-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors ml-2"><Bug size={14} /></button>
      </div>
    </div>
  );
};

export default StartupTestRunner;
