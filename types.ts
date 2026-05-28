
export interface Frame {
  id: string | number;
  width: number;
  height: number;
  x: number;
  y: number;
  name?: string;
  data?: string; // Optional: The cropped base64 if pre-calculated (UI use only)
}

// --- Layout / UI Composer Types ---

export type LayoutElementType = 'box' | 'slice9' | 'point' | 'text';

export interface LayoutElement {
    id: string;
    name: string;
    type: LayoutElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    locked: boolean;
    // Type-specific metadata
    data: {
        // Slice9 margins
        sliceTop?: number;
        sliceBottom?: number;
        sliceLeft?: number;
        sliceRight?: number;
        // Text specific
        text?: string;
        fontSize?: number;
        align?: 'left' | 'center' | 'right';
        // Generic
        color?: string; // Guide color
        tags?: string[];
    };
}

export interface LayoutConfig {
    elements: LayoutElement[];
}

// --- Specific Configs ---

export interface SpriteConfig {
  rows: number;
  cols: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  margin: number;
  totalFrames: number;
  frames: Frame[]; // Single source of truth for frame data
  showCrosshair: boolean;
  autoUpdateTimeline?: boolean; // New: Controls if changes push to connected timelines
}

export interface WarpConfig {
    pins: Array<{x: number, y: number}>; // TL, TR, BR, BL
    targetWidth: number;
    targetHeight: number;
    interpolation: 'nearest' | 'smooth';
}

export interface KeyingConfig {
  enabled: boolean;
  keyColor: string;
  similarity: number;
  smoothness: number;
  spill: number;
  blur?: number; // New: Edge Blur radius
  blurContrast?: number; // New: Edge Blur contrast cutoff
  invert?: boolean; // New: Keep Color mode
  clipBlack: number;
  clipWhite: number;
  // Deprecated: colorCorrection moved to ColorCorrectNode
  colorCorrection?: {
    brightness: number;
    contrast: number;
    saturation: number;
    temperature: number;
  }
}

export interface PaintConfig {
    brushSize: number;
    brushColor: string;
    brushOpacity: number;
    brushHardness: number; // 0 = Hard, 1 = Soft
    isEraser: boolean; // Deprecated by drawTool, but kept for compatibility
    drawTool?: 'brush' | 'eraser' | 'bucket' | 'rect' | 'ellipse' | 'path' | 'path-select' | 'path-add' | 'path-delete' | 'path-convert' | 'pan' | 'move';
    paintData?: string; // Base64 of the painted layer
    sourceSrc?: string; // The source image string this paint data is based on
}

export interface ColorCorrectionConfig {
    brightness: number;
    contrast: number;
    saturation: number;
    temperature: number;
}

export interface CropConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    resize?: boolean;
    finalWidth?: number;
    finalHeight?: number;
}

export interface ResizeConfig {
    width: number;
    height: number;
    scale: number;
    useScale: boolean;
}

export interface FrameNormalizeConfig {
    width: number;
    height: number;
    fit: 'center' | 'contain' | 'cover' | 'stretch';
    background?: string; // Optional hex color for padding
}

export interface OptimizeConfig {
    cnum: number; // Number of Colors (0-256). 0 = lossless.
    dither: boolean;
}

export interface GenerateConfig {
    prompt: string;
    generatedImage?: string; // base64
}

export interface ExportConfig {
    // Deprecated in favor of ResizeNode, keeping for type compatibility during migration if needed
    width: number;
    height: number;
    x: number;
    y: number;
    scale: number;
    enabled: boolean;
}

// --- Node Types (Discriminated Union) ---

export type NodeType = 'source' | 'chroma' | 'grid' | 'normal_map' | 'timeline' | 'crop' | 'output' | 'seamless' | 'color_correct' | 'resize' | 'frame_normalize' | 'optimize' | 'outline' | 'drop_shadow' | 'generate' | 'composite' | 'fill_color' | 'paint' | 'warp' | 'pixelize' | 'frame_skip' | 'vector';

interface BaseNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isDefault?: boolean;
    disabled?: boolean; // Bypass Flag
    collapsed?: boolean; // UI Collapse state
    pinnedAt?: number; // Timestamp for ordering in sidebar. Undefined = not pinned.
}

export interface SourceNode extends BaseNode {
    type: 'source';
    data: {
        src: string;
        name: string;
        width: number;
        height: number;
        opacity: number;
        visible: boolean;
        x: number; // Layer X
        y: number; // Layer Y
    };
}

export interface PaintNode extends BaseNode {
    type: 'paint';
    data: PaintConfig;
}

export interface GenerateNode extends BaseNode {
    type: 'generate';
    data: GenerateConfig;
}

export interface GridNode extends BaseNode {
    type: 'grid';
    data: SpriteConfig;
}

export interface WarpNode extends BaseNode {
    type: 'warp';
    data: WarpConfig;
}

export interface PixelizeNode extends BaseNode {
    type: 'pixelize';
    data: {
        pixelSize: number; // 2 to 64
        mergeThreshold: number; // 0 to 100
        cleanup: number; // 0 to 10
        sampling?: 'dominant' | 'average'; // New: Sampling method
    };
}

export interface ChromaNode extends BaseNode {
    type: 'chroma';
    data: KeyingConfig;
}

export interface CompositeNode extends BaseNode {
    type: 'composite';
    data: {
        opacity: number; // Opacity of the background
        fit: 'cover' | 'contain' | 'stretch';
    };
}

export interface FillNode extends BaseNode {
    type: 'fill_color';
    data: {
        color: string;
    };
}

export interface ColorCorrectNode extends BaseNode {
    type: 'color_correct';
    data: ColorCorrectionConfig;
}

export interface OutlineNode extends BaseNode {
    type: 'outline';
    data: {
        color: string;
        thickness: number;
        opacity: number;
        position?: number;
    };
}

export interface DropShadowNode extends BaseNode {
    type: 'drop_shadow';
    data: {
        color: string;
        alpha: number;
        blur: number;
        x: number;
        y: number;
    };
}

export interface TimelineNode extends BaseNode {
    type: 'timeline';
    data: {
        fps: number;
        loop: boolean;
        isPlaying: boolean;
        currentFrame: number; // The static cursor position
        frames: number[]; // Indices referencing the Grid
        mutedIndices?: number[]; // Indices of frames that are muted
    };
}

export interface OutputNode extends BaseNode {
    type: 'output';
    data: {
        name: string;
    };
}

export interface NormalMapNode extends BaseNode {
    type: 'normal_map';
    data: {
        strength: number;
        lightIntensity: number;
        lightZ: number;
    };
}

export interface CropNode extends BaseNode {
    type: 'crop';
    data: CropConfig;
}

export interface ResizeNode extends BaseNode {
    type: 'resize';
    data: ResizeConfig;
}

export interface FrameNormalizeNode extends BaseNode {
    type: 'frame_normalize';
    data: FrameNormalizeConfig;
}

export interface OptimizeNode extends BaseNode {
    type: 'optimize';
    data: OptimizeConfig;
}

export interface SeamlessNode extends BaseNode {
    type: 'seamless';
    data: {
        overlap: number; // 0.1 to 1.0 (Gradient size)
        mode: 'patch' | 'mirror';
        chaos: number; // 0.0 to 1.0 (Amount of random splatting on seams)
    };
}

export interface FrameSkipNode extends BaseNode {
    type: 'frame_skip';
    data: {
        keepEvery: number;
        offset: number;
    };
}

export interface VectorPath {
    id: string;
    points: { x: number, y: number, cp1x?: number, cp1y?: number, cp2x?: number, cp2y?: number, broken?: boolean }[];
    closed: boolean;
    fill: string;
    stroke: string;
    strokeWidth: number;
}

export interface VectorNode extends BaseNode {
    type: 'vector';
    data: {
        paths: VectorPath[];
        width: number;
        height: number;
    };
}

export type NodeData = SourceNode | GridNode | ChromaNode | TimelineNode | OutputNode | NormalMapNode | CropNode | SeamlessNode | ColorCorrectNode | ResizeNode | FrameNormalizeNode | OptimizeNode | OutlineNode | DropShadowNode | GenerateNode | CompositeNode | FillNode | PaintNode | WarpNode | PixelizeNode | FrameSkipNode | VectorNode;

// --- Connection Types ---

export interface Connection {
    id: string;
    source: string;
    sourceHandle?: string; // ID of the output socket (usually 'output')
    target: string;
    targetHandle?: string; // ID of the input socket (e.g. 'input', 'settings')
}

export interface ViewportTransform {
    x: number;
    y: number;
    scale: number;
}

export interface NodeGraphData {
    nodes: NodeData[];
    connections: Connection[];
    viewport: ViewportTransform;
}

// --- Payload Types (Data passing between nodes) ---
// Note: image can be ImageBitmap (Runtime) or string (Legacy/Initial)

export type SocketType = 'IMAGE' | 'IMAGE_SEQUENCE' | 'TIMELINE' | 'ANY' | 'SETTINGS' | 'OPTIMIZATION';

export interface SocketDefinition {
    type: SocketType | SocketType[];
    maxConnections?: number; // Default 1. Use -1 for infinite.
}

export interface NodeIOSchema {
    inputs: Record<string, SocketType | SocketType[] | SocketDefinition>;
    outputs: Record<string, SocketType | SocketType[]>;
}

export type ImageSource = ImageBitmap | HTMLCanvasElement | HTMLImageElement | string;

// 1. Source / Chroma Output
export interface PayloadImage {
    type: 'IMAGE';
    image: ImageSource;
    width: number;
    height: number;
    src?: string; // Optional: Original source string for validation logic
}

// 2. Grid Node Output
export interface PayloadImageSequence {
    type: 'IMAGE_SEQUENCE';
    image: ImageSource; // The source image (potentially keyed)
    frameWidth: number;
    frameHeight: number;
    frames: Record<number, Frame>; // Metadata for slicing
    previewFrames?: ImageSource[]; // Pre-sliced bitmaps
}

// 3. Timeline Node Output
export interface PayloadTimeline {
    type: 'TIMELINE';
    fps: number;
    isLoop: boolean;
    isPlaying: boolean;
    currentFrameIndex: number; // The logic index
    image: ImageSource; // The current frame image to display
    frames: ImageSource[]; // Ordered list of Frame Images
    framesMetadata?: Frame[]; // Ordered list of Frame Metadata matching the frames array
    unmutedMap?: number[]; // Maps unmuted frame index back to the global frames array index
}

// 4. Optimization Settings Payload
export interface PayloadOptimization {
    type: 'OPTIMIZATION';
    config: OptimizeConfig;
}

export type NodePayload = PayloadImage | PayloadImageSequence | PayloadTimeline | PayloadOptimization;

export interface NodePreviewData {
    type: 'empty' | 'static' | 'animation';
    data: ImageSource | ImageSource[];
}

export interface AnimationEntry {
  id: string;
  name: string;
  nodeGraph: NodeGraphData;
  layout: LayoutConfig; 
  editorTransform?: ViewportTransform; // Sprite Editor Camera
  layoutCamera?: ViewportTransform; // Layout Editor Camera (Independent)
  animationCamera?: ViewportTransform; // Animation Alignment Camera (Independent)
}

export type ToolMode = 'select' | 'move_layer' | 'nodes' | 'picker' | 'draw' | 'layout' | 'animation';

// --- Processor Types ---

export interface ProcessorContext {
    loadBitmap: (src: ImageSource) => Promise<ImageBitmap>;
    isCancelled: () => boolean;
}

export type NodeProcessor = (
    node: NodeData,
    inputs: Record<string, NodePayload>, // Changed from array to map for named inputs
    context: ProcessorContext
) => Promise<NodePayload | null>;

// --- Helper Interfaces ---

export interface DetectedLayout {
    rows: number;
    cols: number;
    backgroundColor?: string;
}

export interface SourceLayer {
    id: string;
    name: string;
    imageSrc: string;
    visible: boolean;
    opacity: number;
    x: number;
    y: number;
    spriteConfig: SpriteConfig;
}

export interface ProjectUIState {
    rightSidebarWidth: number;
    timelineHeight: number;
}

// --- Actions ---

export type ProjectAction =
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { 
      type: 'LOAD_PROJECT'; 
      payload: { 
          projectName: string; 
          animations: AnimationEntry[]; 
          uiState?: ProjectUIState;
          activeAnimationId?: string;
          activeLayerId?: string | null;
          selectedFrameIndex?: number | null;
          selectedLayoutElementId?: string | null;
      } 
    }
  | { type: 'NEW_PROJECT' }
  | { type: 'ADD_ANIMATION'; payload: AnimationEntry }
  | { type: 'REMOVE_ANIMATION'; payload: string }
  | { type: 'SELECT_ANIMATION'; payload: string }
  | { type: 'UPDATE_ANIMATION'; payload: { id: string; updates: Partial<AnimationEntry> } }
  | { type: 'ADD_LAYER'; payload: { animId: string; layer: { name: string; imageSrc: string; spriteConfig: SpriteConfig; width: number; height: number; x?: number; y?: number } } }
  | { type: 'REMOVE_LAYER'; payload: { animId: string; layerId: string } }
  | { type: 'UPDATE_LAYER'; payload: { animId: string; layerId: string; updates: any; resetTimeline?: boolean } }
  | { type: 'SELECT_LAYER'; payload: string | null }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'SELECT_FRAME'; payload: number | null }
  | { type: 'SELECT_TIMELINE_FRAME'; payload: number | null }
  | { type: 'SET_TOOL_MODE'; payload: ToolMode }
  | { type: 'UPDATE_NODE_GRAPH'; payload: { animId: string; graph: NodeGraphData } }
  | { type: 'UPDATE_NODE_DATA'; payload: { animId: string; nodeId: string; data: any } } // ATOMIC UPDATE
  | { type: 'UPDATE_EDITOR_TRANSFORM'; payload: { animId: string; transform: ViewportTransform } }
  | { type: 'UPDATE_ANIMATION_TRANSFORM'; payload: { animId: string; transform: ViewportTransform } }
  | { type: 'UPDATE_LAYOUT_CAMERA'; payload: { animId: string; transform: ViewportTransform } }
  | { type: 'SET_UI_PANEL_SIZE'; payload: Partial<ProjectUIState> }
  // Layout Actions
  | { type: 'ADD_LAYOUT_ELEMENT'; payload: { animId: string; element: LayoutElement } }
  | { type: 'UPDATE_LAYOUT_ELEMENT'; payload: { animId: string; elementId: string; updates: Partial<LayoutElement> } }
  | { type: 'REMOVE_LAYOUT_ELEMENT'; payload: { animId: string; elementId: string } }
  | { type: 'SELECT_LAYOUT_ELEMENT'; payload: string | null }
  // Extraction
  | { type: 'EXTRACT_REGION'; payload: { animId: string, sourceId: string, rect: {x:number,y:number,w:number,h:number}, isCut: boolean } };

// New History Wrapper Action
export type Action = 
  | ProjectAction 
  | { type: 'UNDO' } 
  | { type: 'REDO' };

export interface ProjectState {
  projectName: string;
  animations: AnimationEntry[];
  activeAnimationId: string;
  activeLayerId: string | null;
  selectedNodeId: string | null;
  selectedFrameIndex: number | null;
  selectedTimelineIndex: number | null;
  selectedLayoutElementId: string | null; // New selection state
  toolMode: ToolMode;
  uiState: ProjectUIState;
}

export interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}
