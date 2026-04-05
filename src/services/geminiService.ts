import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function importRecipeFromUrl(url: string) {
  let prompt = `
    Extract the recipe from the following URL: ${url}
    
    Return the extracted information as a JSON object.
    If you can't find a field, leave it empty or use a sensible default.
    For difficulty, MUST be one of: "einfach", "mittel", "schwer".
    Estimate duration and difficulty if not explicitly stated.
  `;

  let scrapedContext = "";

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        const { description, transcript } = await res.json();
        scrapedContext = `YouTube Video Description:\n${description}\n\nTranscript:\n${transcript}`;
      }
    } catch (e) {
      console.error("Failed to fetch YouTube data from backend", e);
    }
  } else if (url.includes('instagram.com') || url.includes('instagr.am')) {
    try {
      const res = await fetch('/api/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        const { caption } = await res.json();
        scrapedContext = `Instagram Post Caption:\n${caption}`;
      }
    } catch (e) {
      console.error("Failed to fetch Instagram data from backend", e);
    }
  } else {
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        const { text } = await res.json();
        scrapedContext = `Website Content:\n${text}`;
      }
    } catch (e) {
      console.error("Failed to scrape URL from backend", e);
    }
  }

  if (scrapedContext) {
    prompt = `
      Analyze the following extracted text from a recipe source (${url}).
      
      Extracted Content:
      ${scrapedContext}
      
      If the extracted content contains a link to a recipe website, you can use the urlContext tool to read that website and extract the recipe from there. 
      Otherwise, extract the recipe directly from the text provided above.
      
      Return the extracted information as a JSON object.
      If you can't find a field, leave it empty or use a sensible default.
      For difficulty, MUST be one of: "einfach", "mittel", "schwer".
      Estimate duration and difficulty if not explicitly stated.
    `;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The name of the recipe" },
          duration: { type: Type.STRING, description: "Prep/Cook Time (e.g., '45 Min.')" },
          servings: { type: Type.NUMBER, description: "Number of servings" },
          difficulty: { type: Type.STRING, description: "Must be 'einfach', 'mittel', or 'schwer'" },
          categories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Categories like 'Hauptgericht', 'Dessert'" },
          dietary: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dietary tags like 'Vegetarisch', 'Vegan'" },
          tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Additional tags" },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of ingredients with amounts" },
          instructions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Step by step instructions" },
          notes: { type: Type.STRING, description: "Any extra tips or notes" }
        },
        required: ["title", "ingredients", "instructions"]
      }
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI");
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Could not parse recipe data from URL.");
  }
}

export async function scanRecipeImage(base64Image: string, mimeType: string) {
  const prompt = `
    Analyze this image of a handwritten or printed recipe. 
    Extract the following information and return it as a JSON object:
    {
      "title": "Recipe Name",
      "duration": "Prep/Cook Time (estimate if not explicitly stated, e.g., '45 Min.')",
      "servings": 4,
      "difficulty": "einfach" | "mittel" | "schwer" (estimate based on steps and ingredients if not explicitly stated),
      "categories": ["Category1", "Category2"],
      "dietary": ["Dietary1"],
      "tags": ["Tag1", "Tag2"],
      "ingredients": ["Ingredient 1", "Ingredient 2"],
      "instructions": ["Step 1", "Step 2"],
      "notes": "Any extra tips"
    }
    If you can't find a field, leave it empty or use a sensible default.
    For difficulty, MUST be one of: "einfach", "mittel", "schwer".
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
