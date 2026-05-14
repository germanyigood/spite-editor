
export const hexToRgb = (hex: string) => {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  const cleanedHex = hex.trim();
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanedHex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
};

export const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + [r, g, b].map(x => {
        const safeX = isNaN(x) || x === undefined || x === null ? 0 : x;
        const hex = Math.max(0, Math.min(255, Math.round(safeX))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
};
