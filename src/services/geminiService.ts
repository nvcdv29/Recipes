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
          isRecipe: { type: Type.BOOLEAN, description: "Whether the content actually contains a recipe. Set to false if it's just general text, an ad, or unrelated content." },
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

export async function processImagesSequentially(
  images: { data: string, mimeType: string }[],
  onProgress?: (current: number, total: number) => void
) {
  let allRecipes: any[] = [];
  let previousRecipe: any = null;

  for (let i = 0; i < images.length; i++) {
    if (onProgress) {
      onProgress(i + 1, images.length);
    }
    
    const contextRecipe = previousRecipe ? {
      title: previousRecipe.title,
      ingredients: previousRecipe.ingredients,
      instructions: previousRecipe.instructions
    } : null;

    const prompt = `
      Analyze this image of a handwritten or printed recipe.
      Important Instructions:
      1. The image might be rotated or upside down. Please read the text accordingly.
      2. If the image contains multiple distinct recipes, extract EACH recipe as a separate object in the array.
      ${contextRecipe ? `3. We previously extracted a recipe from the preceding page. Here is its JSON context:
      ${JSON.stringify(contextRecipe)}
      If the current image is a CONTINUATION of this previous recipe (e.g., the second page of instructions), set "isContinuationOfPrevious" to true, and ONLY extract the NEW ingredients and instructions found on this page. Do not repeat ingredients or instructions already found on the previous page.
      ` : ''}
      4. Be concise. Do not repeat the same instructions or ingredients multiple times.
      
      Return a JSON array of recipe objects. Each object must have this structure:
      {
        "isContinuationOfPrevious": boolean, // true ONLY IF this recipe is a continuation of the previous page's recipe
        "isRecipe": true, // Set to false if it does not contain a recipe
        "title": "Recipe Name",
        "duration": "Prep/Cook Time",
        "servings": 4,
        "difficulty": "einfach" | "mittel" | "schwer",
        "categories": ["Category1"],
        "dietary": ["Dietary1"],
        "tags": ["Tag1"],
        "ingredients": ["Ingredient 1"],
        "instructions": ["Step 1"],
        "notes": "Any extra tips"
      }
      Return ONLY the JSON array.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: images[i].data.split(',')[1],
                  mimeType: images[i].mimeType,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                isContinuationOfPrevious: { type: Type.BOOLEAN, description: "True if this continues the previous recipe" },
                isRecipe: { type: Type.BOOLEAN, description: "True if the image contains a recipe" },
                title: { type: Type.STRING },
                duration: { type: Type.STRING },
                servings: { type: Type.NUMBER },
                difficulty: { type: Type.STRING, description: "Must be 'einfach', 'mittel', or 'schwer'" },
                categories: { type: Type.ARRAY, items: { type: Type.STRING } },
                dietary: { type: Type.ARRAY, items: { type: Type.STRING } },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                notes: { type: Type.STRING }
              },
              required: ["title", "isRecipe"]
            }
          }
        }
      });

      let text = response.text;
      if (text) {
        let extracted;
        try {
          extracted = JSON.parse(text);
        } catch (parseError) {
          console.warn(`JSON parse failed for image ${i}, attempting to repair...`, parseError);
          try {
            // Try to salvage valid objects from the truncated array
            const lastValidBracket = text.lastIndexOf('}');
            if (lastValidBracket !== -1) {
              const repairedText = text.substring(0, lastValidBracket + 1) + ']';
              extracted = JSON.parse(repairedText);
              console.log(`Successfully repaired JSON for image ${i}`);
            } else {
              throw parseError;
            }
          } catch (repairError) {
            throw parseError;
          }
        }
        
        extracted.forEach((recipe: any) => {
          if (recipe.isRecipe === false) return;
          
          if (recipe.isContinuationOfPrevious && previousRecipe && allRecipes.length > 0) {
            // Merge with the last recipe in allRecipes
            const lastIndex = allRecipes.length - 1;
            allRecipes[lastIndex] = {
              ...allRecipes[lastIndex],
              ...recipe,
              // Carefully merge arrays
              ingredients: [...new Set([...(allRecipes[lastIndex].ingredients || []), ...(recipe.ingredients || [])])],
              instructions: [...new Set([...(allRecipes[lastIndex].instructions || []), ...(recipe.instructions || [])])],
              imageIndices: [...(allRecipes[lastIndex].imageIndices || []), i]
            };
            previousRecipe = allRecipes[lastIndex];
          } else {
            // New recipe
            recipe.imageIndices = [i];
            allRecipes.push(recipe);
            previousRecipe = recipe;
          }
        });
      }
    } catch (e) {
      console.error(`Failed to process image ${i}:`, e);
      // We continue with the next image even if one fails
    }
  }

  return allRecipes;
}
