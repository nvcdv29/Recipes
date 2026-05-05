export interface ParsedIngredient {
  original: string;
  amount: number | null;
  unit: string | null;
  name: string;
  isSpiceOrCondiment: boolean;
}

export const parseIngredients = async (ingredients: string[]): Promise<ParsedIngredient[]> => {
  const response = await fetch('/api/recipes/scale/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients })
  });
  if (!response.ok) throw new Error("Failed to parse ingredients");
  const data = await response.json();
  return data.parsed;
};

export const suggestSubstitutions = async (ingredientName: string): Promise<string> => {
  const response = await fetch('/api/recipes/scale/substitute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredientName })
  });
  if (!response.ok) throw new Error("Failed to suggest substitutes");
  const data = await response.json();
  return data.suggestions;
};

export const adjustCookingTips = async (
  originalServings: number, 
  newServings: number, 
  recipeTitle: string, 
  instructions: string[]
): Promise<{ newDuration: string, tips: string[] }> => {
  const response = await fetch('/api/recipes/scale/tips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalServings, newServings, recipeTitle, instructions })
  });
  if (!response.ok) throw new Error("Failed to adjust tips");
  return response.json();
};

export const solveForInventory = async (
  availableItem: string, 
  originalIngredients: string[],
  originalServings: number
): Promise<{ newServings: number, explanation: string }> => {
  const response = await fetch('/api/recipes/scale/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availableItem, originalIngredients, originalServings })
  });
  if (!response.ok) throw new Error("Failed to solve inventory");
  return response.json();
};

