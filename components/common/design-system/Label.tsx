
import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';

export const Label = memo(({ children, icon: Icon, className = '' }: { children: React.ReactNode, icon?: LucideIcon, className?: string }) => (
  <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-txt-muted mb-1 ${className}`}>
    {Icon && <Icon size={10} />}
    {children}
  </div>
));
