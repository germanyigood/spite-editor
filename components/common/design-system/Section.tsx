
import React, { useState, memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionProps {
    title?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
}

export const Section = memo(({ title, children, defaultOpen = true, className = '' }: SectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`space-y-3 ${className}`}>
            {title && (
                <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1 text-[9px] text-txt-muted font-bold uppercase tracking-widest cursor-pointer hover:text-txt-secondary select-none border-b border-border-base/5 pb-1"
                >
                   {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                   {title}
                </div>
            )}
            {isOpen && <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-3 pl-1">{children}</div>}
        </div>
    );
});
