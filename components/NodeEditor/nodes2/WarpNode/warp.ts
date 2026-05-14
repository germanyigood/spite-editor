
import { NodeProcessor, ImageSource } from '../../../../types';
import { getPerspectiveTransform, transformPoint } from '../../../../utils/math';

export const processWarp: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'warp' || !input || input.type !== 'IMAGE') return input || null;

    const { pins, targetWidth, targetHeight } = node.data;
    if (!pins || pins.length !== 4) return input;

    try {
        const bmp = await loadBitmap(input.image);
        if (isCancelled()) return null;

        const tw = Math.max(1, targetWidth || bmp.width);
        const th = Math.max(1, targetHeight || bmp.height);

        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d');
        if (!ctx) return input;

        // Исходный прямоугольник
        const srcRect = [
            { x: 0, y: 0 },
            { x: bmp.width, y: 0 },
            { x: bmp.width, y: bmp.height },
            { x: 0, y: bmp.height }
        ];

        // INVERSE MAP: Идем по пикселям РЕЗУЛЬТАТА и ищем их в ИСТОЧНИКЕ
        // Матрица: Pins (экран) -> Rect (оригинал)
        const matrix = getPerspectiveTransform(pins, srcRect);

        const outData = ctx.createImageData(tw, th);
        const data = outData.data;

        // Прямой доступ к пикселям источника для скорости
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = bmp.width;
        srcCanvas.height = bmp.height;
        const sCtx = srcCanvas.getContext('2d')!;
        sCtx.drawImage(bmp, 0, 0);
        const srcData = sCtx.getImageData(0, 0, bmp.width, bmp.height).data;

        for (let y = 0; y < th; y++) {
            for (let x = 0; x < tw; x++) {
                const p = transformPoint({ x, y }, matrix);
                
                // Семплируем, если попали в границы источника
                if (p.x >= 0 && p.x < bmp.width && p.y >= 0 && p.y < bmp.height) {
                    const ix = Math.floor(p.x);
                    const iy = Math.floor(p.y);
                    const iIdx = (iy * bmp.width + ix) * 4;
                    const oIdx = (y * tw + x) * 4;
                    
                    data[oIdx] = srcData[iIdx];
                    data[oIdx + 1] = srcData[iIdx + 1];
                    data[oIdx + 2] = srcData[iIdx + 2];
                    data[oIdx + 3] = srcData[iIdx + 3];
                }
            }
        }

        ctx.putImageData(outData, 0, 0);
        const resultBmp = await createImageBitmap(canvas);

        return {
            type: 'IMAGE',
            image: resultBmp,
            width: tw,
            height: th
        };
    } catch (e) {
        console.error("Perspective Warp failed", e);
        return input;
    }
};
