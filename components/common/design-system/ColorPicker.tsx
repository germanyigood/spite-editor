
import React, { memo, useState, useEffect } from 'react';
import { Pipette } from 'lucide-react';
import { BaseControlProps } from './types';
import { getAccentColors } from './utils';
import { Label } from './Label';

interface ColorPickerProps extends BaseControlProps {
  value: string;
  onChange: (val: string) => void;
  onPick?: () => void;
  isPicking?: boolean;
}

export const ColorPicker = memo(({ 
  label, value, onChange, accent = 'blue', className = '', onPick, isPicking 
}: ColorPickerProps) => {
  const colors = getAccentColors(accent);
  const safeValue = value || "#000000";
  const [inputValue, setInputValue] = useState(safeValue);

  useEffect(() => {
    setInputValue(safeValue);
  }, [safeValue]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    // Simple hex validation before triggering upstream change
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className={`bg-surface/20 p-2 rounded-lg border border-border-base/5 ${className}`}>
      {label && <Label className="mb-2">{label}</Label>}
      
      <div className="flex items-center gap-2">
        {/* Color Preview & Native Picker */}
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border-base/10 shadow-sm shrink-0 cursor-pointer group hover:scale-105 transition-transform">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-20" />
           <div className="absolute inset-0" style={{ backgroundColor: safeValue }} />
           <input 
               type="color" 
               data-testid="color-input"
               value={safeValue} 
               onChange={(e) => onChange(e.target.value)} 
               className="absolute inset-0 w-[200%] h-[200%] -left-1/2 -top-1/2 p-0 m-0 cursor-pointer opacity-0"
               onMouseDown={(e) => e.stopPropagation()}
           />
        </div>

        {/* Manual Hex Input */}
        <input 
          type="text"
          data-testid="color-hex-input"
          value={inputValue}
          onChange={handleTextChange}
          className={`flex-1 min-w-0 bg-surface/40 border border-border-base/10 rounded px-2 py-1.5 text-[10px] text-txt-primary font-mono outline-none focus:ring-1 ${colors.border} ${colors.ring}`}
          placeholder="#000000"
          onMouseDown={(e) => e.stopPropagation()}
        />

        {/* Eye Dropper */}
        {onPick && (
            <button 
               onClick={onPick}
               className={`p-1.5 rounded-md transition-all ${isPicking ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-txt-secondary hover:text-white hover:bg-surface-hover/10'}`}
               title="Pick from canvas"
            >
               <Pipette size={14} />
            </button>
        )}
      </div>
    </div>
  );
});
