
import React, { useState, useEffect, memo } from 'react';
import { BaseControlProps } from './types';
import { getAccentColors } from './utils';
import { Label } from './Label';

interface NumberInputProps extends BaseControlProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  debounceTime?: number;
}

export const NumberInput = memo(({ 
  label, value, onChange, min, max, step,
  accent = 'blue', className = '', debounceTime = 300 
}: NumberInputProps) => {
  // Safe init: ensure value is never null/undefined
  const safeValue = isNaN(value) || value === null || value === undefined ? 0 : value;
  const [localValue, setLocalValue] = useState<string>(String(safeValue));
  const colors = getAccentColors(accent);

  useEffect(() => {
    setLocalValue(String(safeValue));
  }, [safeValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = parseFloat(localValue);
      if (!isNaN(parsed) && parsed !== safeValue) {
        onChange(parsed);
      }
    }, debounceTime);
    return () => clearTimeout(timer);
  }, [localValue, onChange, debounceTime, safeValue]);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <Label>{label}</Label>}
      <input 
        type="number"
        data-testid={`num-input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
        value={localValue}
        min={min} max={max} step={step}
        onChange={(e) => setLocalValue(e.target.value)}
        className={`w-full bg-surface/40 border border-border-base/10 rounded px-2 py-1.5 text-xs text-txt-primary font-mono outline-none transition-all focus:bg-surface/60 focus:ring-1 ${colors.border} ${colors.ring}`}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  );
});
