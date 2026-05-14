
import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { BaseControlProps } from './types';
import { getAccentColors } from './utils';

interface ToggleProps extends BaseControlProps {
  value: boolean;
  onChange: (val: boolean) => void;
  icon?: LucideIcon;
}

export const Toggle = memo(({ 
  label, value, onChange, icon: Icon,
  accent = 'blue', className = '' 
}: ToggleProps) => {
  const colors = getAccentColors(accent);
  
  return (
    <div className={`flex items-center justify-between ${className}`}>
        {/* Left Side: Label */}
        {label && (
           <div className="flex items-center gap-2">
               {Icon && <Icon size={12} className={value ? colors.text : 'text-txt-muted'} />}
               <span className={`text-[10px] font-bold uppercase tracking-wider ${value ? 'text-txt-primary' : 'text-txt-muted'}`}>
                   {label}
               </span>
           </div>
        )}
        
        {/* Right Side: Switch Button */}
        <button 
            onClick={(e) => { e.stopPropagation(); onChange(!value); }}
            className={`w-10 h-5 rounded-full relative transition-colors border border-transparent flex-shrink-0
                ${value ? `${colors.bg}/20 border-${accent}-500/50` : 'bg-surface-hover/10'}
            `}
            style={{ borderColor: value ? undefined : 'transparent' }} // Fallback for dynamic border class
        >
             <div 
                className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all shadow-sm
                    ${value ? `left-5 ${colors.knob}` : 'left-0.5 bg-txt-muted'}
                `} 
             />
        </button>
    </div>
  );
});
