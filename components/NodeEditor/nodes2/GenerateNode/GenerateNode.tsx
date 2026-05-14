
import React, { useState } from 'react';
import { GenerateNode as GenerateNodeType } from '../../../../types';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2, ImagePlus } from 'lucide-react';
import { Section } from '../../../common/DesignSystem';
import { BitmapView } from '../../../common/BitmapView';

interface GenerateNodeProps {
    node: GenerateNodeType;
    onUpdate: (id: string, updates: any) => void;
}

export const GenerateNode = React.memo(({ node, onUpdate }: GenerateNodeProps) => {
    const { prompt = '', generatedImage } = node.data;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate(node.id, { data: { ...node.data, prompt: e.target.value } });
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] }
            });

            let foundImage = false;
            // Iterate parts to find the image
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const base64 = `data:image/png;base64,${part.inlineData.data}`;
                    onUpdate(node.id, { data: { ...node.data, generatedImage: base64 } });
                    foundImage = true;
                    break;
                }
            }
            
            if (!foundImage) {
                throw new Error("No image generated.");
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Generation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white/50 dark:bg-gray-900/50">
            {/* Preview */}
            <div className="flex-1 bg-black relative overflow-hidden min-h-0 flex items-center justify-center checkerboard">
                {generatedImage ? (
                    <BitmapView image={generatedImage} className="max-w-full max-h-full object-contain" />
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2 opacity-70">
                        <ImagePlus size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">AI Generated</span>
                    </div>
                )}
                {loading && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-purple-600 dark:text-purple-400 gap-2 z-10">
                        <Loader2 size={24} className="animate-spin" />
                        <span className="text-xs font-bold animate-pulse">Dreaming...</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-3 border-t border-border-base/10 space-y-3 shrink-0 bg-surface/30">
                <Section title="AI Prompt" defaultOpen={true}>
                    <textarea 
                        value={prompt}
                        onChange={handlePromptChange}
                        placeholder="Describe a pixel art sprite..."
                        className="w-full bg-surface/50 border border-border-base/10 rounded-lg p-2 text-xs text-txt-primary outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 resize-none h-16 placeholder-txt-muted"
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                    
                    {error && (
                        <div className="text-[10px] text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-2 rounded border border-red-500/20 leading-tight">
                            {error}
                        </div>
                    )}

                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim()}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2 group"
                    >
                        <Sparkles size={14} className={loading ? "animate-pulse" : "group-hover:rotate-12 transition-transform"} />
                        {loading ? 'Generating...' : 'Generate Sprite'}
                    </button>
                </Section>
            </div>
        </div>
    );
});
