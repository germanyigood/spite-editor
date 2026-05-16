
import React, { useState, useEffect, memo } from 'react';
import { BaseControlProps } from './types';
import { getAccentColors } from './utils';
import { Label } from './Label';

interface TextInputProps extends BaseControlProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  debounceTime?: number;
}

export const TextInput = memo(({ 
  label, value, onChange, placeholder,
  accent = 'blue', className = '', debounceTime = 300 
}: TextInputProps) => {
  // Safe init
  const safeValue = value || "";
  const [localValue, setLocalValue] = useState(safeValue);
  const [isFocused, setIsFocused] = useState(false);
  const colors = getAccentColors(accent);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(safeValue);
    }
  }, [safeValue, isFocused]);

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
      {label && <Label>{label}</Label>}
      <input 
        type="text"
        value={localValue}
        placeholder={placeholder}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full bg-surface/40 border border-border-base/10 rounded px-2 py-1.5 text-xs text-txt-primary outline-none transition-all focus:bg-surface/60 focus:ring-1 ${colors.border} ${colors.ring}`}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  );
});
