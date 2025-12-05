
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
  colors: Array<{ color: string, tolerance: number }>; // Updated for per-color tolerance
  tolerance: number; // Deprecated, kept for type compatibility during migration if needed, but logic moves to colors array
  // Advanced Edge Settings
  edgeRadius: number; // 0-10px (Spatial distance)
  edgeOpacity: number; // 0-100% (How transparent the edge becomes)
  edgeTint: string; // Hex color to blend edges into (e.g. #000000 to darken halos)
  edgeTintIntensity: number; // 0-100%
}

export interface DetectedLayout {
  rows: number;
  cols: number;
  backgroundColor?: string;
}

export interface AnimationEntry {
  id: string;
  name: string;
  imageSrc: string | null;
  spriteConfig: SpriteConfig;
  bgConfig: BackgroundRemovalConfig;
  animConfig: AnimationConfig;
  frames: number[]; // Sequence of frame indices to play
}
