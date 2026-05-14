
import React from 'react';
import { X, LucideIcon, Power, Pin, ChevronDown, ChevronRight } from 'lucide-react';
import { NodeData, SocketType, NodePayload, SocketDefinition } from '../../../types';
import { NODE_REGISTRY, RegisteredNodeType } from '../nodes2';

interface SocketHandleProps {
    type: 'in' | 'out';
    nodeId: string;
    handleId: string;
    isConnected?: boolean;
    socketType?: SocketType | SocketType[];
    runtimeType?: SocketType;
    index: number;
    total: number;
    onMouseDown?: (e: React.MouseEvent, type: 'in' | 'out', nodeId: string, handleId: string) => void;
}

export const SocketHandle = ({ type, nodeId, handleId, isConnected, socketType = 'ANY', runtimeType, index, total, onMouseDown }: SocketHandleProps) => {
    
    // Determine effective type for color
    const effectiveType = runtimeType || (Array.isArray(socketType) ? socketType[0] : socketType);

    const getSocketStyle = (t: SocketType) => {
        switch(t) {
            case 'IMAGE': return 'bg-cyan-400 border-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.8)]';
            case 'IMAGE_SEQUENCE': return 'bg-pink-500 border-pink-200 shadow-[0_0_8px_rgba(236,72,153,0.8)]';
            case 'TIMELINE': return 'bg-green-500 border-green-200 shadow-[0_0_8px_rgba(34,197,94,0.8)]';
            case 'SETTINGS': return 'bg-yellow-500 border-yellow-200 shadow-[0_0_8px_rgba(234,179,8,0.8)]';
            case 'OPTIMIZATION': return 'bg-yellow-500 border-yellow-200 shadow-[0_0_8px_rgba(234,179,8,0.8)]';
            case 'ANY': return 'bg-white border-gray-300 shadow-[0_0_8px_rgba(255,255,255,0.8)]';
            default: return 'bg-gray-500 border-gray-400';
        }
    };

    const step = 100 / (total + 1);
    const topPos = `${step * (index + 1)}%`;

    const label = Array.isArray(socketType) ? socketType.join(' | ') : socketType;

    return (
        <div 
            className={`absolute w-4 h-4 rounded-full border-2 z-30 flex items-center justify-center cursor-crosshair transition-transform hover:scale-125
            ${type === 'in' ? '-left-2' : '-right-2'}
            ${getSocketStyle(effectiveType as SocketType)}
            ${isConnected ? 'scale-110' : ''}
            `}
            style={{ top: topPos, transform: 'translateY(-50%)' }}
            onMouseDown={(e) => {
                e.stopPropagation(); 
                onMouseDown?.(e, type, nodeId, handleId);
            }}
            data-socket-type={type}
            data-socket-node={nodeId}
            data-socket-handle={handleId}
            data-socket-dtype={effectiveType}
            title={`${handleId.toUpperCase()} (${label})`}
        >
            {effectiveType === 'ANY' && <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />}
        </div>
    );
};

// 8-Direction Resize Handle
export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const ResizeZone = ({ dir, onResizeStart }: { dir: ResizeDirection, onResizeStart: (e: React.MouseEvent, dir: ResizeDirection) => void }) => {
    let cursor = 'cursor-move';
    
    switch(dir) {
        case 'n': cursor='cursor-ns-resize'; break;
        case 's': cursor='cursor-ns-resize'; break;
        case 'e': cursor='cursor-ew-resize'; break;
        case 'w': cursor='cursor-ew-resize'; break;
        case 'nw': cursor='cursor-nwse-resize'; break;
        case 'ne': cursor='cursor-nesw-resize'; break;
        case 'sw': cursor='cursor-nesw-resize'; break;
        case 'se': cursor='cursor-nwse-resize'; break;
    }

    const baseStyle: React.CSSProperties = { position: 'absolute' };
    if (dir === 'n') Object.assign(baseStyle, { top: -4, left: 6, right: 6, height: 8 });
    if (dir === 's') Object.assign(baseStyle, { bottom: -4, left: 6, right: 6, height: 8 });
    if (dir === 'e') Object.assign(baseStyle, { right: -4, top: 6, bottom: 6, width: 8 });
    if (dir === 'w') Object.assign(baseStyle, { left: -4, top: 6, bottom: 6, width: 8 });
    if (dir === 'nw') Object.assign(baseStyle, { top: -5, left: -5, width: 12, height: 12, zIndex: 40 });
    if (dir === 'ne') Object.assign(baseStyle, { top: -5, right: -5, width: 12, height: 12, zIndex: 40 });
    if (dir === 'sw') Object.assign(baseStyle, { bottom: -5, left: -5, width: 12, height: 12, zIndex: 40 });
    if (dir === 'se') Object.assign(baseStyle, { bottom: -5, right: -5, width: 12, height: 12, zIndex: 40 });

    return (
        <div 
            className={`absolute ${cursor} rounded-sm`}
            style={baseStyle}
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, dir); }}
        />
    );
};

interface NodeWrapperProps {
    node: NodeData;
    title: string;
    icon: LucideIcon;
    colorClass: 'cyan' | 'purple' | 'pink' | 'green' | 'amber' | 'blue' | 'yellow' | 'gray';
    variant?: 'default' | 'clean';
    children: React.ReactNode;
    onDelete?: (id: string) => void;
    onResize: (e: React.MouseEvent, id: string, dir: ResizeDirection) => void;
    connectedInputs?: string[]; 
    connectedOutputs?: string[]; 
    onSocketDown: (e: React.MouseEvent, type: 'in' | 'out', nodeId: string, handleId: string) => void;
    onUpdate?: (id: string, updates: Partial<NodeData>) => void;
    outputPayload?: NodePayload;
    inputRuntimeTypes?: Record<string, SocketType>;
}

const arraysEqual = (a?: string[], b?: string[]) => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

const objectsEqual = (a?: Record<string, any>, b?: Record<string, any>) => {
    if (a === b) return true;
    if (!a || !b) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
        if (a[key] !== b[key]) return false;
    }
    return true;
};

export const NodeWrapper = React.memo(({ 
    node, title, icon: Icon, colorClass, variant = 'default', children, onDelete, onResize, 
    connectedInputs = [], connectedOutputs = [], onSocketDown, onUpdate, outputPayload, inputRuntimeTypes 
}: NodeWrapperProps) => {
    
    // Theme Colors (Adjusted for Light Mode visibility)
    const colors: Record<string, string> = {
        cyan: 'text-cyan-600 dark:text-cyan-400 border-cyan-500/30 from-cyan-100 to-cyan-50 dark:from-cyan-900/50 dark:to-cyan-800/20', 
        purple: 'text-purple-600 dark:text-purple-400 border-purple-500/30 from-purple-100 to-purple-50 dark:from-purple-900/50 dark:to-purple-800/20',
        pink: 'text-pink-600 dark:text-pink-400 border-pink-500/30 from-pink-100 to-pink-50 dark:from-pink-900/50 dark:to-pink-800/20',
        green: 'text-green-600 dark:text-green-400 border-green-500/30 from-green-100 to-green-50 dark:from-green-900/50 dark:to-green-800/20',
        amber: 'text-amber-600 dark:text-amber-400 border-amber-500/30 from-orange-100 to-orange-50 dark:from-amber-900/50 dark:to-orange-800/20',
        blue: 'text-blue-600 dark:text-blue-400 border-blue-500/30 from-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-800/20',
        yellow: 'text-yellow-600 dark:text-yellow-400 border-yellow-500/30 from-yellow-100 to-yellow-50 dark:from-yellow-900/50 dark:to-yellow-800/20',
        gray: 'text-slate-600 dark:text-slate-400 border-slate-500/30 from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/20',
    };
    const activeTheme = colors[colorClass] || colors['cyan'];
    const accentColor = activeTheme.split(' ')[0] + ' ' + activeTheme.split(' ')[1]; // Extract text colors

    const handleResizeStart = (e: React.MouseEvent, dir: ResizeDirection) => {
        if (!node.collapsed) {
            onResize(e, node.id, dir);
        }
    };

    const handleToggleDisable = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onUpdate) {
            onUpdate(node.id, { disabled: !node.disabled });
        }
    };

    const handleToggleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onUpdate) {
            onUpdate(node.id, { collapsed: !node.collapsed });
        }
    };

    const handleTogglePin = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onUpdate) {
            // Set timestamp to pin, undefined to unpin
            const newVal = node.pinnedAt !== undefined ? undefined : Date.now();
            onUpdate(node.id, { pinnedAt: newVal });
        }
    };

    const isClean = variant === 'clean';
    const isDisabled = !!node.disabled;
    const isPinned = node.pinnedAt !== undefined;
    const isCollapsed = !!node.collapsed;
    
    // Container Style
    const containerStyle = isClean 
        ? 'bg-transparent' 
        : `bg-white/80 dark:bg-gray-900/90 border rounded-xl backdrop-blur-xl shadow-xl transition-opacity ${activeTheme} ${isDisabled ? 'opacity-60 border-gray-400 dark:border-gray-600 grayscale' : ''}`;
    
    // Header Style
    const headerStyle = isClean
        ? 'absolute top-0 left-0 w-full z-20 bg-white/70 dark:bg-black/70 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity rounded-t-sm'
        : `relative bg-gradient-to-r ${activeTheme.split(' ').slice(2).join(' ')} border-b border-border-base/10 rounded-t-xl`;

    // Content Style
    const contentStyle = isClean
        ? 'absolute inset-0 z-10'
        : `relative flex-1 overflow-hidden ${isDisabled ? 'pointer-events-none' : ''}`;

    const bundle = NODE_REGISTRY[node.type as RegisteredNodeType];
    const schema = bundle ? bundle.io : { inputs: {}, outputs: {} };
    
    const inputKeys = Object.keys(schema.inputs || {});
    const outputKeys = Object.keys(schema.outputs || {});

    let runtimeOutputType: SocketType | undefined;
    if (outputPayload) {
        if (outputPayload.type === 'IMAGE') runtimeOutputType = 'IMAGE';
        else if (outputPayload.type === 'IMAGE_SEQUENCE') runtimeOutputType = 'IMAGE_SEQUENCE';
        else if (outputPayload.type === 'TIMELINE') runtimeOutputType = 'TIMELINE';
        else if (outputPayload.type === 'OPTIMIZATION') runtimeOutputType = 'OPTIMIZATION';
    }

    const canDisable = node.type !== 'source' && node.type !== 'output';
    const canPin = node.type !== 'source' && node.type !== 'output';

    return (
        <div 
            className={`absolute flex flex-col group select-none ${containerStyle}`}
            style={{ 
                left: node.x, 
                top: node.y, 
                width: node.width, 
                height: isCollapsed ? 'auto' : node.height 
            }}
            data-node-id={node.id}
            onWheel={(e) => e.stopPropagation()} 
        >
            {/* Header */}
            <div 
                className={`h-8 flex items-center px-3 cursor-grab active:cursor-grabbing handle shrink-0 ${headerStyle} ${isCollapsed ? 'rounded-xl border-none' : ''}`}
                onDoubleClick={handleToggleCollapse}
                data-testid="node-header"
            >
                <button
                    onClick={handleToggleCollapse}
                    className="mr-2 text-txt-secondary hover:text-txt-primary"
                >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${accentColor}`}>
                        <Icon size={12} /> {title}
                    </span>
                </div>
                
                <div className="flex items-center gap-1">
                    {canPin && (
                        <button
                            onClick={handleTogglePin}
                            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${isPinned ? 'text-indigo-500 bg-indigo-500/10' : 'text-gray-400 dark:text-gray-500'}`}
                            title={isPinned ? "Unpin from Sidebar" : "Pin to Sidebar"}
                        >
                            <Pin size={12} fill={isPinned ? "currentColor" : "none"} />
                        </button>
                    )}
                    {canDisable && (
                        <button 
                            onClick={handleToggleDisable}
                            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${isDisabled ? 'text-gray-500' : 'text-green-600 dark:text-green-400'}`}
                            title={isDisabled ? "Enable Node" : "Disable Node (Bypass)"}
                        >
                            <Power size={12} />
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} 
                            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1.5 cursor-pointer"
                        >
                            <X size={12}/>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div className={contentStyle}>
                    {isDisabled && !isClean && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500/50 dark:text-white/50 border border-slate-300 dark:border-white/20 px-2 py-1 rounded">Bypassed</span>
                        </div>
                    )}
                    {children}
                </div>
            )}

            {/* Resizing Handles */}
            {!isCollapsed && (
                <>
                    <ResizeZone dir="n" onResizeStart={handleResizeStart} />
                    <ResizeZone dir="s" onResizeStart={handleResizeStart} />
                    <ResizeZone dir="e" onResizeStart={handleResizeStart} />
                    <ResizeZone dir="w" onResizeStart={handleResizeStart} />
                    <ResizeZone dir="nw" onResizeStart={handleResizeStart} />
                    <ResizeZone dir="ne" onResizeStart={handleResizeStart} />
                    <ResizeZone dir="sw" onResizeStart={handleResizeStart} />
                    <ResizeZone dir="se" onResizeStart={handleResizeStart} />
                </>
            )}
            
            {/* Input Sockets */}
            <div className="absolute left-0 top-0 h-full w-0 z-30 pointer-events-none">
                <div className="relative w-0 h-full">
                    {inputKeys.map((handleId, i) => {
                        const inputDef = schema.inputs[handleId];
                        const type = (inputDef && typeof inputDef === 'object' && 'type' in inputDef && !Array.isArray(inputDef)) 
                            ? (inputDef as SocketDefinition).type 
                            : (inputDef as SocketType | SocketType[]);

                        return (
                            <div key={handleId} className="pointer-events-auto">
                                <SocketHandle 
                                    type="in" 
                                    nodeId={node.id}
                                    handleId={handleId}
                                    isConnected={connectedInputs.includes(handleId)} 
                                    socketType={type}
                                    runtimeType={inputRuntimeTypes?.[handleId]}
                                    index={i}
                                    total={inputKeys.length}
                                    onMouseDown={onSocketDown} 
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Output Sockets */}
            <div className="absolute right-0 top-0 h-full w-0 z-30 pointer-events-none">
                <div className="relative w-0 h-full">
                    {outputKeys.map((handleId, i) => (
                        <div key={handleId} className="pointer-events-auto">
                            <SocketHandle 
                                type="out" 
                                nodeId={node.id}
                                handleId={handleId}
                                isConnected={connectedOutputs.includes(handleId)} 
                                socketType={schema.outputs[handleId]}
                                runtimeType={runtimeOutputType}
                                index={i}
                                total={outputKeys.length}
                                onMouseDown={onSocketDown} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.node === next.node &&
        prev.title === next.title &&
        prev.variant === next.variant &&
        prev.outputPayload === next.outputPayload &&
        arraysEqual(prev.connectedInputs, next.connectedInputs) &&
        arraysEqual(prev.connectedOutputs, next.connectedOutputs) &&
        objectsEqual(prev.inputRuntimeTypes, next.inputRuntimeTypes)
    );
});
