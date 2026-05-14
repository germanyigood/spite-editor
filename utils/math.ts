
import { SpriteConfig, Frame } from "../types";

export const DEFAULT_SPRITE_CONFIG: SpriteConfig = {
  rows: 1, cols: 1, width: 0, height: 0,
  offsetX: 0, offsetY: 0, margin: 0,
  totalFrames: 1, frames: [], showCrosshair: false
};

export const generateGridFrames = (
    rows: number,
    cols: number,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
    margin: number
): Frame[] => {
    const frames: Frame[] = [];
    const total = rows * cols;
    for (let i = 0; i < total; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = offsetX + c * (width + margin);
        const y = offsetY + r * (height + margin);
        frames.push({
            id: i,
            x, y, width, height,
            name: `Frame ${i}`
        });
    }
    return frames;
};

/**
 * Solves a linear system for perspective transform (homography)
 * Maps source points (quadrilateral) to target points (rectangle)
 */
export function getPerspectiveTransform(
    src: Array<{x: number, y: number}>, 
    dst: Array<{x: number, y: number}>
): number[] {
    const a: number[][] = [];
    for (let i = 0; i < 4; i++) {
        a.push([src[i].x, src[i].y, 1, 0, 0, 0, -src[i].x * dst[i].x, -src[i].y * dst[i].x]);
        a.push([0, 0, 0, src[i].x, src[i].y, 1, -src[i].x * dst[i].y, -src[i].y * dst[i].y]);
    }

    const b = [dst[0].x, dst[0].y, dst[1].x, dst[1].y, dst[2].x, dst[2].y, dst[3].x, dst[3].y];
    
    // Gaussian elimination
    const n = 8;
    for (let i = 0; i < n; i++) {
        let max = i;
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(a[j][i]) > Math.abs(a[max][i])) max = j;
        }
        [a[i], a[max]] = [a[max], a[i]];
        [b[i], b[max]] = [b[max], b[i]];

        if (Math.abs(a[i][i]) < 1e-10) continue; 

        for (let j = i + 1; j < n; j++) {
            const f = a[j][i] / a[i][i];
            b[j] -= f * b[i];
            for (let k = i; k < n; k++) a[j][k] -= f * a[i][k];
        }
    }

    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        let s = 0;
        for (let j = i + 1; j < n; j++) s += a[i][j] * x[j];
        
        if (Math.abs(a[i][i]) < 1e-10) x[i] = 0;
        else x[i] = (b[i] - s) / a[i][i];
    }
    return [...x, 1];
}

/**
 * Converts 3x3 perspective matrix to CSS matrix3d
 */
export function matrixToCSS(m: number[]): string {
    // CSS matrix3d is column-major 4x4
    // [a, b, 0, c]
    // [d, e, 0, f]
    // [0, 0, 1, 0]
    // [g, h, 0, 1]
    return `matrix3d(${m[0]}, ${m[3]}, 0, ${m[6]}, ${m[1]}, ${m[4]}, 0, ${m[7]}, 0, 0, 1, 0, ${m[2]}, ${m[5]}, 0, ${m[8]})`;
}

/**
 * Projective transformation using matrix coefficients
 */
export function transformPoint(p: {x: number, y: number}, m: number[]) {
    const w = m[6] * p.x + m[7] * p.y + m[8];
    if (Math.abs(w) < 1e-10) return { x: 0, y: 0 };
    return {
        x: (m[0] * p.x + m[1] * p.y + m[2]) / w,
        y: (m[3] * p.x + m[4] * p.y + m[5]) / w
    };
}
