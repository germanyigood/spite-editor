

import React from 'react';
import { Settings2 } from 'lucide-react';
import { KeyingConfig } from '../../types';
import { Toggle, ColorPicker, Slider, Section } from '../common/DesignSystem';
import { useProject } from '../../context/ProjectContext';

interface BackgroundConfigPanelProps {
  config: KeyingConfig;
  onUpdateConfig: (newConfig: KeyingConfig) => void;
}

const BackgroundConfigPanel: React.FC<BackgroundConfigPanelProps> = ({ config, onUpdateConfig }) => {
    const { state, dispatch } = useProject();
    const isPickerActive = state.toolMode === 'picker';

    // Safety check for legacy configs if any
    const safeConfig: KeyingConfig = {
        enabled: false,
        keyColor: '#00ff00',
        similarity: 35,
        smoothness: 10,
        spill: 60,
        clipBlack: 0,
        clipWhite: 0,
        ...config
    };

    const update = (updates: Partial<KeyingConfig>) => onUpdateConfig({ ...safeConfig, ...updates });

    const handleTogglePicker = () => {
        dispatch({ type: 'SET_TOOL_MODE', payload: isPickerActive ? 'select' : 'picker' });
    };

  return (
    <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
       <div className="flex items-center justify-between text-gray-400 text-[10px] uppercase tracking-wider font-bold mb-2">
            <div className="flex items-center gap-2"><Settings2 size={14} /> Advanced Keyer</div>
            <Toggle 
                value={safeConfig.enabled}
                onChange={(v) => update({ enabled: v })}
                accent="purple"
            />
       </div>
       {safeConfig.enabled && (
           <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
               
               <ColorPicker 
                   label="Screen Color" 
                   value={safeConfig.keyColor}
                   onChange={(v) => update({ keyColor: v })}
                   accent="purple"
                   onPick={handleTogglePicker}
                   isPicking={isPickerActive}
               />

               <div className="grid grid-cols-2 gap-4">
                   <Slider label="Threshold" value={safeConfig.similarity} min={0} max={100} onChange={(v) => update({similarity: v})} accent="purple" />
                   <Slider label="Softness" value={safeConfig.smoothness} min={0} max={100} onChange={(v) => update({smoothness: v})} accent="purple" />
               </div>

               <Section title="Matte Refinement">
                   <div className="grid grid-cols-2 gap-4">
                       <Slider label="Clip Black" value={safeConfig.clipBlack} min={0} max={100} onChange={(v) => update({clipBlack: v})} accent="purple" />
                       <Slider label="Clip White" value={safeConfig.clipWhite} min={0} max={100} onChange={(v) => update({clipWhite: v})} accent="purple" />
                   </div>
                   <Slider label="Despill Strength" value={safeConfig.spill} min={0} max={100} onChange={(v) => update({spill: v})} accent="purple" />
               </Section>
           </div>
       )}
    </div>
  );
};

export default BackgroundConfigPanel;