
import { NodeProcessor } from '../../../../types';

export const processPaint: NodeProcessor = async (node, inputs, { loadBitmap, isCancelled }) => {
    // 1. Получаем вход (Source Layer)
    const input = inputs['input'] || Object.values(inputs)[0];
    if (node.type !== 'paint') return null;

    const { paintData } = node.data;

    // Если у нас уже есть отредактированные данные (полный холст), они имеют приоритет
    if (paintData) {
        try {
            const paintBmp = await loadBitmap(paintData);
            if (isCancelled()) return null;

            return {
                type: 'IMAGE',
                image: paintBmp,
                width: paintBmp.width,
                height: paintBmp.height,
                src: paintData // Используем URL как уникальный ключ для кеша
            };
        } catch (e) {
            console.warn("Failed to load paintData, falling back to input", e);
        }
    }

    // Если данных рисования нет, просто пробрасываем вход
    return input || null;
};
