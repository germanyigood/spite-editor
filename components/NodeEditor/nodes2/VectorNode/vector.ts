import { NodeProcessor } from "../../../../types";

export const processVector: NodeProcessor = async (node, _inputs, { loadBitmap, isCancelled }) => {
    if (node.type !== 'vector') return null;

    const data = node.data;
    let width = data.width;
    let height = data.height;

    const inputsArr = _inputs ? Object.values(_inputs) : [];
    if (!width || !height) {
        if (inputsArr.length > 0) {
            const input = inputsArr.find(inp => inp?.type === 'IMAGE' || inp?.type === 'IMAGE_SEQUENCE');
            if (input && (input as any).width && (input as any).height) {
                width = (input as any).width;
                height = (input as any).height;
            }
        }
    }

    width = width || 512;
    height = height || 512;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // First draw any input image so the vector is overlayed on it
    if (inputsArr.length > 0) {
        const input = inputsArr.find(inp => inp?.type === 'IMAGE' || inp?.type === 'IMAGE_SEQUENCE');
        if (input && input.type === 'IMAGE' && input.image) {
            ctx.drawImage(input.image, 0, 0, width, height);
        }
    }

    for (const path of data.paths) {
        if (path.points.length === 0) continue;

        ctx.beginPath();
        const start = path.points[0];
        ctx.moveTo(start.x, start.y);

        for (let i = 1; i < path.points.length; i++) {
            const prev = path.points[i - 1];
            const pt = path.points[i];
            
            // prev.cp2 is OUT handle of prev point, pt.cp1 is IN handle of curr point
            const cp1x = prev.cp2x ?? prev.x;
            const cp1y = prev.cp2y ?? prev.y;
            const cp2x = pt.cp1x ?? pt.x;
            const cp2y = pt.cp1y ?? pt.y;

            if (cp1x !== prev.x || cp1y !== prev.y || cp2x !== pt.x || cp2y !== pt.y) {
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pt.x, pt.y);
            } else {
                ctx.lineTo(pt.x, pt.y);
            }
        }

        if (path.closed && path.points.length > 2) {
            const prev = path.points[path.points.length - 1];
            const pt = path.points[0];
            const cp1x = prev.cp2x ?? prev.x;
            const cp1y = prev.cp2y ?? prev.y;
            const cp2x = pt.cp1x ?? pt.x;
            const cp2y = pt.cp1y ?? pt.y;
            if (cp1x !== prev.x || cp1y !== prev.y || cp2x !== pt.x || cp2y !== pt.y) {
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pt.x, pt.y);
            } else {
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.closePath();
        } else if (path.closed) {
            ctx.closePath();
        }

        if (path.fill && path.fill !== 'transparent') {
            ctx.fillStyle = path.fill;
            ctx.fill();
        }

        if (path.stroke && path.stroke !== 'transparent' && path.strokeWidth > 0) {
            ctx.lineWidth = path.strokeWidth;
            ctx.strokeStyle = path.stroke;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    }

    if (isCancelled && isCancelled()) return null;

    const bitmap = await createImageBitmap(canvas);
    return { type: 'IMAGE', image: bitmap, width: bitmap.width, height: bitmap.height };
};
