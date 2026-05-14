
import React from 'react';
import { LayoutElement } from '../../types';
import { Section, TextInput, NumberInput, Toggle } from '../common/DesignSystem';
import { BoxSelect, Grid3X3, Lock, Trash2, Eye, EyeOff, PlusSquare } from 'lucide-react';

interface LayoutPropertiesPanelProps {
    element: LayoutElement | undefined;
    onUpdate: (updates: Partial<LayoutElement>) => void;
    onDelete: () => void;
    onAdd?: () => void; // New
}

const LayoutPropertiesPanel: React.FC<LayoutPropertiesPanelProps> = ({ element, onUpdate, onDelete, onAdd }) => {
    
    // Empty State with Add Button
    if (!element) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                <div className="p-4 rounded-full bg-surface/30 border border-border-base/10 text-txt-muted">
                    <BoxSelect size={32} />
                </div>
                <div className="text-sm font-bold text-txt-secondary">
                    No Element Selected
                </div>
                <p className="text-xs text-txt-muted max-w-[200px]">
                    Select an element on the canvas to edit its properties, or create a new one.
                </p>
                
                {onAdd && (
                    <button 
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg text-xs font-bold uppercase transition-all"
                    >
                        <PlusSquare size={14} /> Add Element
                    </button>
                )}
            </div>
        );
    }

    const { x, y, width, height, data } = element;

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <TextInput 
                        value={element.name} 
                        onChange={(v) => onUpdate({ name: v })} 
                        className="flex-1 font-bold"
                        accent="amber"
                    />
                    <button onClick={() => onUpdate({ visible: !element.visible })} className="p-1.5 text-txt-muted hover:text-txt-primary">
                        {element.visible ? <Eye size={14}/> : <EyeOff size={14}/>}
                    </button>
                    <button onClick={() => onUpdate({ locked: !element.locked })} className={`p-1.5 ${element.locked ? 'text-amber-500' : 'text-txt-muted hover:text-txt-primary'}`}>
                        <Lock size={14}/>
                    </button>
                </div>

                <Section title="Geometry" defaultOpen={true}>
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput label="X" value={Math.round(x)} onChange={(v) => onUpdate({ x: v })} accent="amber" />
                        <NumberInput label="Y" value={Math.round(y)} onChange={(v) => onUpdate({ y: v })} accent="amber" />
                        <NumberInput label="Width" min={1} value={Math.round(width)} onChange={(v) => onUpdate({ width: Math.max(1, v) })} accent="amber" />
                        <NumberInput label="Height" min={1} value={Math.round(height)} onChange={(v) => onUpdate({ height: Math.max(1, v) })} accent="amber" />
                    </div>
                </Section>

                {element.type === 'slice9' && (
                    <Section title="9-Slice Margins" defaultOpen={true}>
                        <div className="grid grid-cols-2 gap-2">
                            <NumberInput label="Top" min={0} value={data.sliceTop || 0} onChange={(v) => onUpdate({ data: { ...data, sliceTop: v } })} accent="green" />
                            <NumberInput label="Bottom" min={0} value={data.sliceBottom || 0} onChange={(v) => onUpdate({ data: { ...data, sliceBottom: v } })} accent="green" />
                            <NumberInput label="Left" min={0} value={data.sliceLeft || 0} onChange={(v) => onUpdate({ data: { ...data, sliceLeft: v } })} accent="green" />
                            <NumberInput label="Right" min={0} value={data.sliceRight || 0} onChange={(v) => onUpdate({ data: { ...data, sliceRight: v } })} accent="green" />
                        </div>
                    </Section>
                )}

                {element.type === 'text' && (
                    <Section title="Text Preview" defaultOpen={true}>
                        <TextInput 
                            label="Content" 
                            value={data.text || ''} 
                            onChange={(v) => onUpdate({ data: { ...data, text: v } })} 
                            accent="blue" 
                        />
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <NumberInput label="Size" min={1} value={data.fontSize || 12} onChange={(v) => onUpdate({ data: { ...data, fontSize: v } })} accent="blue" />
                        </div>
                    </Section>
                )}

                <Section title="Type">
                    <div className="flex gap-2">
                        {['box', 'slice9', 'text'].map(t => (
                            <button 
                                key={t}
                                onClick={() => onUpdate({ type: t as any })}
                                className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded border ${element.type === t ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 'bg-surface/50 border-transparent text-txt-muted'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </Section>
            </div>

            <div className="p-4 border-t border-border-base/10 bg-surface/30">
                <button 
                    onClick={onDelete}
                    className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold uppercase transition-colors"
                >
                    <Trash2 size={14} /> Delete Element
                </button>
            </div>
        </div>
    );
};

export default LayoutPropertiesPanel;
