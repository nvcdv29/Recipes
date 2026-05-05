import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from '../types';

export interface ExtractedRecipe extends Partial<Recipe> {
  isRecipe?: boolean;
  confidenceScore?: number;
  imageIndices?: number[];
  needsReview?: boolean;
  originalImage?: string;
  originalExtractedData?: any; // To store before corrections
}

export async function recordCorrection(originalData: any, correctedData: any) {
  // Logic to track corrections - could post to an analytics endpoint or Firestore
  try {
    await fetch('/api/recipes/learning-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalData, correctedData })
    });
    console.log("Feedback recorded to improve AI imports.");
  } catch (error) {
    console.error("Failed to record feedback", error);
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function processImagesBatch(
  images: { data: string, mimeType: string }[],
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedRecipe[]> {
  const CHUNK_SIZE = 3;
  let allRecipes: ExtractedRecipe[] = [];
  let processedCount = 0;

  for (let i = 0; i < images.length; i += CHUNK_SIZE) {
    const chunk = images.slice(i, i + CHUNK_SIZE);
    
    // We can process these images in parallel. But note the context continuation is harder in parallel unless we treat each chunk independently. 
    // The prompt says "Process 3-5 images in parallel (Promise.all with chunking)" so we will do that.
    
    const chunkPromises = chunk.map(async (image, indexInChunk) => {
      const globalIndex = i + indexInChunk;
      
      const prompt = `
        Analyze this image of a handwritten or printed recipe.
        1. The image might be rotated or upside down.
        2. If the image contains multiple recipes, extract EACH recipe.
        3. Assign a confidence score between 0.0 and 1.0 reflecting how sure you are about the transcription accuracy and whether all fields were clearly legible.
        
        Return a JSON array of recipe objects. Structure:
        {
          "isRecipe": boolean,
          "confidenceScore": number,
          "title": "Story/Name",
          "duration": "...",
          "servings": 4,
          "difficulty": "einfach" | "mittel" | "schwer",
          "categories": ["category"],
          "dietary": [],
          "tags": [],
          "ingredients": [],
          "instructions": [],
          "notes": ""
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: image.data.split(',')[1],
                  mimeType: image.mimeType,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                isRecipe: { type: Type.BOOLEAN },
                confidenceScore: { type: Type.NUMBER },
                title: { type: Type.STRING },
                duration: { type: Type.STRING },
                servings: { type: Type.NUMBER },
                difficulty: { type: Type.STRING },
                categories: { type: Type.ARRAY, items: { type: Type.STRING } },
                dietary: { type: Type.ARRAY, items: { type: Type.STRING } },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                notes: { type: Type.STRING }
              },
              required: ["title", "isRecipe", "confidenceScore"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response");
      }
      
      let parsed = JSON.parse(text);
      return { parsed, globalIndex };
    });

    const results = await Promise.allSettled(chunkPromises);
    
    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        const extracted = res.value.parsed;
        extracted.forEach((recipe: any) => {
          if (recipe.isRecipe !== false) {
            allRecipes.push({
              ...recipe,
              imageIndices: [res.value.globalIndex],
              needsReview: recipe.confidenceScore < 0.7,
              originalExtractedData: { ...recipe }
            });
          }
        });
      } else {
        console.error("Failed to parse image chunk:", res.reason);
      }
      processedCount++;
      if (onProgress) {
        onProgress(processedCount, images.length);
      }
    });
  }

  return allRecipes;
}
