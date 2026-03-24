import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function scanRecipeImage(base64Image: string, mimeType: string) {
  const prompt = `
    Analyze this image of a handwritten or printed recipe. 
    Extract the following information and return it as a JSON object:
    {
      "title": "Recipe Name",
      "duration": "Prep/Cook Time",
      "servings": 4,
      "difficulty": "einfach" | "mittel" | "schwer",
      "categories": ["Category1", "Category2"],
      "dietary": ["Dietary1"],
      "tags": ["Tag1"],
      "ingredients": ["Ingredient 1", "Ingredient 2"],
      "instructions": ["Step 1", "Step 2"],
      "notes": "Any extra tips"
    }
    If you can't find a field, leave it empty or use a sensible default.
    Return ONLY the JSON object.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
  });

  const text = response.text;
  
  if (!text) {
    throw new Error("No response from AI");
  }

  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Could not parse recipe data. Please try again or enter manually.");
  }
}
