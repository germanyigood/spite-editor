
import { NodeProcessor, ImageSource } from '../../../../types';

// Simple Euclidean distance
const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

export const processPixelize: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'pixelize' || !input) return null;

    // sampling: 'dominant' mapped to 'crisp' logic now for backward compat, or explicit 'average'
    const { pixelSize = 4, mergeThreshold = 0, cleanup = 0, sampling = 'dominant' } = node.data;
    const blockSize = Math.max(1, Math.floor(pixelSize));
    
    // Determine Algo: 'average' = Mean Color, 'dominant'/'crisp' = Center Pixel (Nearest Neighbor)
    // Nearest Neighbor is best for pixel art as it preserves original palette and details.
    const isCrisp = sampling !== 'average';

    const processSingle = async (src: ImageSource) => {
        if (!src) return null;
        const bmp = await loadBitmap(src);
        if (isCancelled()) return null;

        const w = bmp.width;
        const h = bmp.height;
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        
        ctx.drawImage(bmp, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const cols = Math.ceil(w / blockSize);
        const rows = Math.ceil(h / blockSize);
        
        // Buffer for grid colors: [R, G, B, A]
        const grid = new Uint8Array(cols * rows * 4);

        // --- PHASE 1: DOWNSAMPLING ---
        for (let ry = 0; ry < rows; ry++) {
            for (let rx = 0; rx < cols; rx++) {
                const startX = rx * blockSize;
                const startY = ry * blockSize;
                const idx = (ry * cols + rx) * 4;

                if (isCrisp) {
                    // CENTER SAMPLING (Crisp / Nearest Neighbor)
                    // Picks the pixel in the middle of the block. Preserves hard edges and details like eyes.
                    const centerX = Math.min(startX + Math.floor(blockSize / 2), w - 1);
                    const centerY = Math.min(startY + Math.floor(blockSize / 2), h - 1);
                    const srcIdx = (centerY * w + centerX) * 4;
                    
                    grid[idx] = data[srcIdx];
                    grid[idx+1] = data[srcIdx+1];
                    grid[idx+2] = data[srcIdx+2];
                    grid[idx+3] = data[srcIdx+3];
                } else {
                    // AVERAGE SAMPLING (Smooth)
                    // Good for photos, bad for pixel art (muddy)
                    const endX = Math.min(startX + blockSize, w);
                    const endY = Math.min(startY + blockSize, h);
                    let sumR=0, sumG=0, sumB=0, sumA=0, count=0;

                    for (let y = startY; y < endY; y++) {
                        for (let x = startX; x < endX; x++) {
                            const srcIdx = (y * w + x) * 4;
                            if (data[srcIdx+3] > 10) {
                                sumR += data[srcIdx];
                                sumG += data[srcIdx+1];
                                sumB += data[srcIdx+2];
                                sumA += data[srcIdx+3];
                                count++;
                            }
                        }
                    }

                    if (count > 0) {
                        grid[idx] = sumR / count;
                        grid[idx+1] = sumG / count;
                        grid[idx+2] = sumB / count;
                        grid[idx+3] = sumA / count;
                    } else {
                        grid[idx+3] = 0;
                    }
                }
            }
        }

        // --- PHASE 2: MERGE (Spatial Flattening) ---
        // If mergeThreshold > 0, we propagate colors to neighbors to create flat areas.
        if (mergeThreshold > 0) {
            // Using a threshold in 0-255 scale directly (mapped from UI 0-100)
            const thresh = mergeThreshold * 2.55; 

            // Pass 1: Horizontal (Left -> Right)
            for (let ry = 0; ry < rows; ry++) {
                for (let rx = 1; rx < cols; rx++) { // Start from 2nd pixel
                    const curr = (ry * cols + rx) * 4;
                    const prev = (ry * cols + (rx - 1)) * 4;
                    
                    if (grid[curr+3] < 10 || grid[prev+3] < 10) continue;

                    const dist = colorDistance(
                        grid[curr], grid[curr+1], grid[curr+2],
                        grid[prev], grid[prev+1], grid[prev+2]
                    );

                    if (dist < thresh) {
                        // Snap current to previous
                        grid[curr] = grid[prev];
                        grid[curr+1] = grid[prev+1];
                        grid[curr+2] = grid[prev+2];
                        // Keep Alpha logic simple
                    }
                }
            }

            // Pass 2: Vertical (Top -> Bottom)
            for (let rx = 0; rx < cols; rx++) {
                for (let ry = 1; ry < rows; ry++) {
                    const curr = (ry * cols + rx) * 4;
                    const prev = ((ry - 1) * cols + rx) * 4;

                    if (grid[curr+3] < 10 || grid[prev+3] < 10) continue;

                    const dist = colorDistance(
                        grid[curr], grid[curr+1], grid[curr+2],
                        grid[prev], grid[prev+1], grid[prev+2]
                    );

                    if (dist < thresh) {
                        grid[curr] = grid[prev];
                        grid[curr+1] = grid[prev+1];
                        grid[curr+2] = grid[prev+2];
                    }
                }
            }
        }

        // --- PHASE 3: DENOISE (Voting) ---
        // Replace orphan pixels with the most common neighbor color
        if (cleanup > 0) {
            const copy = new Uint8Array(grid);
            const passes = Math.ceil(cleanup / 2); // 1-5 passes

            for (let p = 0; p < passes; p++) {
                for (let ry = 1; ry < rows - 1; ry++) {
                    for (let rx = 1; rx < cols - 1; rx++) {
                        const i = (ry * cols + rx) * 4;
                        if (copy[i+3] < 10) continue;

                        // Gather 8 neighbors
                        const neighbors: string[] = [];
                        for (let ny = -1; ny <= 1; ny++) {
                            for (let nx = -1; nx <= 1; nx++) {
                                if (nx === 0 && ny === 0) continue;
                                const ni = ((ry + ny) * cols + (rx + nx)) * 4;
                                if (copy[ni+3] > 10) {
                                    // Use Hex string as key
                                    neighbors.push(`${copy[ni]},${copy[ni+1]},${copy[ni+2]}`);
                                }
                            }
                        }

                        if (neighbors.length === 0) continue;

                        // Find most frequent neighbor
                        const counts = new Map<string, number>();
                        let maxCount = 0;
                        let winner = "";

                        neighbors.forEach(n => {
                            const c = (counts.get(n) || 0) + 1;
                            counts.set(n, c);
                            if (c > maxCount) {
                                maxCount = c;
                                winner = n;
                            }
                        });

                        // Current color
                        const currentKey = `${copy[i]},${copy[i+1]},${copy[i+2]}`;
                        
                        // If current color is NOT the winner, and winner has strong support (>2 neighbors)
                        // Or if current color is completely unique (count 0 in neighborhood)
                        if (winner !== currentKey && (counts.get(currentKey) || 0) < 2) {
                            const [r, g, b] = winner.split(',').map(Number);
                            grid[i] = r;
                            grid[i+1] = g;
                            grid[i+2] = b;
                        }
                    }
                }
                // Update copy for next pass if needed
                if (p < passes - 1) copy.set(grid);
            }
        }

        // --- PHASE 4: RENDER ---
        const output = ctx.createImageData(w, h);
        const outD = output.data;

        for (let ry = 0; ry < rows; ry++) {
            for (let rx = 0; rx < cols; rx++) {
                const blockIdx = (ry * cols + rx) * 4;
                const a = grid[blockIdx + 3];
                
                if (a < 10) continue;

                const r = grid[blockIdx];
                const g = grid[blockIdx + 1];
                const b = grid[blockIdx + 2];

                const startX = rx * blockSize;
                const startY = ry * blockSize;
                const endX = Math.min(startX + blockSize, w);
                const endY = Math.min(startY + blockSize, h);

                for (let y = startY; y < endY; y++) {
                    for (let x = startX; x < endX; x++) {
                        const idx = (y * w + x) * 4;
                        outD[idx] = r;
                        outD[idx+1] = g;
                        outD[idx+2] = b;
                        outD[idx+3] = 255; // Force solid alpha for pixel art style
                    }
                }
            }
        }

        ctx.putImageData(output, 0, 0);
        return await createImageBitmap(canvas);
    };

    // Standard Processing Routing
    if (input.type === 'IMAGE') {
        const result = await processSingle(input.image);
        if (result) return { type: 'IMAGE', image: result, width: result.width, height: result.height };
    } 
    else if (input.type === 'TIMELINE') {
        const results = await Promise.all(input.frames.map(processSingle));
        const validFrames = results.filter(Boolean) as ImageBitmap[];
        const currentIndex = input.currentFrameIndex ?? 0;
        const currentImage = validFrames[currentIndex] || validFrames[0];
        if (validFrames.length > 0) return { ...input, frames: validFrames, image: currentImage };
    } 
    else if (input.type === 'IMAGE_SEQUENCE') {
        if (input.previewFrames) {
             const results = await Promise.all(input.previewFrames.map(processSingle));
             const validResults = results.filter(Boolean) as ImageBitmap[];
             if(validResults.length > 0) return { ...input, previewFrames: validResults, image: validResults[0] };
        } else if (input.image) {
            const result = await processSingle(input.image);
            if (result) return { ...input, image: result };
        }
    }

    return null;
};
