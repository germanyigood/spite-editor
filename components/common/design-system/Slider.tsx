
import React, { useState, useEffect, memo } from 'react';
import { BaseControlProps } from './types';
import { getAccentColors } from './utils';
import { Label } from './Label';

interface SliderProps extends BaseControlProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  debounceTime?: number;
}

export const Slider = memo(({ 
  label, value, min, max, step = 1, onChange, 
  accent = 'blue', className = '', debounceTime = 50 
}: SliderProps) => {
  // Safe init
  const safeValue = isNaN(value) || value === null || value === undefined ? min : value;
  const [localValue, setLocalValue] = useState(safeValue);
  const colors = getAccentColors(accent);

  useEffect(() => {
    setLocalValue(safeValue);
  }, [safeValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== safeValue) {
        onChange(localValue);
      }
    }, debounceTime);
    return () => clearTimeout(timer);
  }, [localValue, onChange, debounceTime, safeValue]);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex justify-between items-center">
           <Label>{label}</Label>
           <span className={`text-[9px] font-mono ${colors.text}`}>{localValue}</span>
        </div>
      )}
      <div className="relative w-full h-3 flex items-center">
         <input 
            type="range" 
            min={min} max={max} step={step} 
            value={localValue}
            onChange={(e) => setLocalValue(parseFloat(e.target.value))}
            className={`w-full h-1 bg-surface-hover/20 rounded-full appearance-none cursor-pointer focus:outline-none ${colors.thumb} transition-all`}
            onMouseDown={(e) => e.stopPropagation()} 
         />
      </div>
    </div>
  );
});
