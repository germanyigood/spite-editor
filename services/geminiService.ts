import { GoogleGenAI, Type } from "@google/genai";
import { DetectedLayout } from "../types";

export const analyzeSpriteSheet = async (base64Image: string): Promise<DetectedLayout | null> => {
  if (!process.env.API_KEY) {
    console.warn("API Key missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this sprite sheet image. 
              1. Count the number of rows and columns of the character/object sprites.
              2. Estimate the background color that should be removed (in Hex format).
              
              If the image doesn't look like a sprite sheet, return 1 row and 1 column.`
            },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Image.split(',')[1] // remove data:image/png;base64, prefix
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rows: { type: Type.INTEGER },
            cols: { type: Type.INTEGER },
            backgroundColor: { type: Type.STRING, description: "Hex color code estimate (e.g. #00FF00)" }
          },
          required: ["rows", "cols"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;
    
    return JSON.parse(jsonText) as DetectedLayout;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null;
  }
};
