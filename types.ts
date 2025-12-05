
export interface SpriteConfig {
  rows: number;
  cols: number;
  width: number; // width of a single frame (default)
  height: number; // height of a single frame (default)
  offsetX: number;
  offsetY: number;
  margin: number; // gap between frames
  totalFrames: number;
  // Individual frame shifts and size overrides
  frameOffsets: { [key: number]: { x: number, y: number, w?: number, h?: number } }; 
  showCrosshair: boolean;
}

export interface AnimationDefinition {
  id: string;
  name: string;
  frames: number[]; // Ordered list of frame indices
}

export interface AnimationConfig {
  fps: number;
  isPlaying: boolean;
  loop: boolean;
  scale: number;
}

export interface BackgroundRemovalConfig {
  enabled: boolean;
  colors: Array<{ color: string, tolerance: number }>;
  tolerance: number; 
  edgeRadius: number; 
  edgeOpacity: number; 
  edgeTint: string; 
  edgeTintIntensity: number; 
}

export interface DetectedLayout {
  rows: number;
  cols: number;
  backgroundColor?: string;
}

export interface SourceLayer {
  id: string;
  imageSrc: string;
  x: number;
  y: number;
  opacity: number;
  visible: boolean;
  name: string;
}

export interface AnimationEntry {
  id: string;
  name: string;
  // imageSrc is deprecated in favor of layers, but kept for migration if needed
  imageSrc: string | null; 
  layers: SourceLayer[]; // Support multiple source images
  spriteConfig: SpriteConfig;
  bgConfig: BackgroundRemovalConfig;
  animConfig: AnimationConfig;
  frames: number[]; // Sequence of frame indices to play (Timeline)
}
