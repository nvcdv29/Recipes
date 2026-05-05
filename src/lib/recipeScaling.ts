
export interface StructuredIngredient {
  amount: number | null;
  unit: string | null;
  name: string;
  original: string;
}

export interface ScalingResult {
  ingredients: StructuredIngredient[];
  servings: number;
}

/**
 * Scales ingredients based on servings factor.
 * Spices and salt are scaled non-linearly (by a factor of ~0.8 of the linear scaling).
 */
export function scaleIngredients(
  ingredients: StructuredIngredient[],
  originalServings: number,
  newServings: number
): StructuredIngredient[] {
  const factor = newServings / originalServings;
  
  const smallAmountKeywords = ['salz', 'pfeffer', 'zimt', 'knoblauch', 'gewürz', 'kräuter'];

  return ingredients.map(ing => {
    if (ing.amount === null) return ing;

    let scalingFactor = factor;
    const isSmallAmount = smallAmountKeywords.some(k => ing.name.toLowerCase().includes(k));
    
    if (isSmallAmount && factor > 1) {
      // Non-linear scaling for spices (diminishing returns)
      scalingFactor = 1 + (factor - 1) * 0.7;
    } else if (isSmallAmount && factor < 1) {
       scalingFactor = 1 - (1 - factor) * 0.8;
    }

    const newAmount = ing.amount * scalingFactor;
    
    return {
      ...ing,
      amount: roundReasonably(newAmount, ing.name)
    };
  });
}

function roundReasonably(amount: number, name: string): number {
  // If it's something like eggs, round to nearest 0.5 or integer
  if (name.toLowerCase().includes('ei') && !name.toLowerCase().includes('weiß') && !name.toLowerCase().includes('gelb')) {
    return Math.max(0.5, Math.round(amount * 2) / 2);
  }
  
  // For most things, round to 1 decimal place or 2 if small
  if (amount < 1) return Math.round(amount * 100) / 100;
  if (amount < 10) return Math.round(amount * 10) / 10;
  return Math.round(amount);
}

export async function parseIngredients(rawIngredients: string[]): Promise<StructuredIngredient[]> {
  try {
    const response = await fetch('/api/recipes/parse-ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: rawIngredients })
    });
    if (!response.ok) throw new Error('Failed to parse ingredients');
    return await response.json();
  } catch (error) {
    console.error(error);
    // Fallback: simple manual parse attempt?
    return rawIngredients.map(raw => ({
      amount: null,
      unit: null,
      name: raw,
      original: raw
    }));
  }
}

export async function getSubstitutions(ingredient: string, recipeContext: string) {
  const response = await fetch('/api/recipes/substitutions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient, recipeContext })
  });
  if (!response.ok) throw new Error('Failed to get substitutions');
  return await response.json();
}

export async function getAdjustedTime(originalServings: number, newServings: number, originalTime: string, recipeTitle: string) {
  const response = await fetch('/api/recipes/adjust-cooking-time', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalServings, newServings, originalTime, recipeTitle })
  });
  if (!response.ok) throw new Error('Failed to adjust time');
  return await response.json();
}
