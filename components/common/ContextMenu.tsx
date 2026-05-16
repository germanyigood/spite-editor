
import React from 'react';
import { CircuitBoard, Scissors, Lightbulb, Film, MonitorUp, Crop, Cable, Grid3X3, Palette, Scaling, Gauge, CircleDashed, Layers, Sparkles, LucideIcon, ImagePlus, PaintBucket, Brush } from 'lucide-react';
import { NodeType } from '../../types';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onAddNode: (type: NodeType) => void;
    isEdgeAction?: boolean;
    allowedTypes?: NodeType[]; // If provided, only these types are shown
}

interface MenuItem {
    type: NodeType;
    label: string;
    icon: LucideIcon;
    colorClass: string;
}

const ITEMS: MenuItem[] = [
    { type: 'generate', label: 'AI Sprite Gen', icon: Sparkles, colorClass: 'text-purple-400 hover:bg-purple-500/20' },
    { type: 'paint', label: 'Paint', icon: Brush, colorClass: 'text-purple-400 hover:bg-purple-500/20' },
    { type: 'chroma', label: 'Chroma Key', icon: CircuitBoard, colorClass: 'text-purple-400 hover:bg-purple-500/20' },
    { type: 'fill_color', label: 'Background Color', icon: PaintBucket, colorClass: 'text-blue-400 hover:bg-blue-500/20' },
    { type: 'composite', label: 'Composite Image', icon: ImagePlus, colorClass: 'text-blue-400 hover:bg-blue-500/20' },
    { type: 'color_correct', label: 'Color Correct', icon: Palette, colorClass: 'text-blue-400 hover:bg-blue-500/20' },
    { type: 'outline', label: 'Outline', icon: CircleDashed, colorClass: 'text-gray-400 hover:bg-gray-500/20' },
    { type: 'drop_shadow', label: 'Drop Shadow', icon: Layers, colorClass: 'text-gray-400 hover:bg-gray-500/20' },
    { type: 'grid', label: 'Slice Grid', icon: Scissors, colorClass: 'text-pink-400 hover:bg-pink-500/20' },
    { type: 'normal_map', label: 'Normal Map', icon: Lightbulb, colorClass: 'text-amber-400 hover:bg-amber-500/20' },
    { type: 'seamless', label: 'Seamless Tile', icon: Grid3X3, colorClass: 'text-pink-300 hover:bg-pink-500/20' },
    { type: 'timeline', label: 'Timeline', icon: Film, colorClass: 'text-green-400 hover:bg-green-500/20' },
    { type: 'crop', label: 'Crop', icon: Crop, colorClass: 'text-orange-400 hover:bg-orange-500/20' },
    { type: 'resize', label: 'Resize Output', icon: Scaling, colorClass: 'text-cyan-400 hover:bg-cyan-500/20' },
    { type: 'optimize', label: 'Optimization', icon: Gauge, colorClass: 'text-yellow-400 hover:bg-yellow-500/20' },
];

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onAddNode, isEdgeAction, allowedTypes }) => {
    
    // Helper to render a button
    const renderButton = (item: MenuItem) => (
        <button 
            key={item.type}
            onClick={() => onAddNode(item.type)} 
            className={`w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white flex items-center gap-2 ${item.colorClass}`}
        >
            <item.icon size={14} className="shrink-0"/> {item.label}
        </button>
    );

    // Filter Items
    const visibleItems = ITEMS.filter(item => !allowedTypes || allowedTypes.includes(item.type));

    const groups = [
        ['generate', 'paint'],
        ['chroma', 'fill_color', 'composite', 'color_correct', 'grid'],
        ['outline', 'drop_shadow'],
        ['normal_map', 'seamless'],
        ['timeline', 'crop', 'resize', 'optimize']
    ];

    return (
        <div 
            className="fixed z-50 bg-gray-900 border border-white/10 rounded-lg shadow-2xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: x, top: y }}
            onMouseLeave={onClose}
            onMouseDown={(e) => e.stopPropagation()} 
        >
            <div className="px-3 py-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-widest border-b border-white/5 mb-1 flex items-center justify-between">
                <span>{isEdgeAction ? 'Insert Node' : 'Add Node'}</span>
                {isEdgeAction && <Cable size={10} className="text-yellow-500" />}
            </div>

            {visibleItems.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-600 italic text-center">
                    No compatible nodes
                </div>
            ) : (
                <>
                    {groups.map((group, groupIndex) => {
                        const groupItems = visibleItems.filter(i => group.includes(i.type));
                        if (groupItems.length === 0) return null;
                        
                        return (
                            <React.Fragment key={groupIndex}>
                                {groupIndex > 0 && <div className="my-1 h-px bg-white/5 mx-3" />}
                                {groupItems.map(item => renderButton(item))}
                            </React.Fragment>
                        );
                    })}

                    {/* Output Node (Special Case: Not in Edge Action, checks allowedTypes if provided) */}
                    {!isEdgeAction && (!allowedTypes || allowedTypes.includes('output')) && (
                        <>
                            <div className="my-1 h-px bg-white/5 mx-3" />
                            <button onClick={() => onAddNode('output')} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-blue-500/20 hover:text-white flex items-center gap-2 text-blue-400">
                                <MonitorUp size={14} className="shrink-0"/> Output
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ContextMenu;
