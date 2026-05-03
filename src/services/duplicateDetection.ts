import levenshtein from 'fast-levenshtein';
import { Recipe } from '../types';

function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-zäöüß0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getIngredientTokens(ingredients: string[]) {
  const tokens = new Set<string>();
  for (const ing of ingredients) {
    const words = normalize(ing).split(' ');
    for (const w of words) {
      if (w.length > 2) tokens.add(w);
    }
  }
  return tokens;
}

export function calculateSimilarity(recipe1: Partial<Recipe>, recipe2: Partial<Recipe>): number {
  const title1 = (recipe1.title || '').trim().toLowerCase();
  const title2 = (recipe2.title || '').trim().toLowerCase();
  
  if (!title1 && !title2) return 0;
  
  const maxLength = Math.max(title1.length, title2.length);
  const titleScore = maxLength === 0 ? 0 : 1 - (levenshtein.get(title1, title2) / maxLength);

  const tokens1 = getIngredientTokens(recipe1.ingredients || []);
  const tokens2 = getIngredientTokens(recipe2.ingredients || []);
  
  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }
  
  const union = tokens1.size + tokens2.size - intersection;
  const ingredientOverlap = union === 0 ? 0 : intersection / union;
  
  return titleScore * 0.3 + ingredientOverlap * 0.7;
}

export function detectDuplicates(newRecipe: Partial<Recipe>, existingRecipes: Recipe[], threshold: number = 0.6): { recipe: Recipe, score: number }[] {
  return existingRecipes
    .filter(r => r.id !== newRecipe.id)
    .map(r => ({ recipe: r, score: calculateSimilarity(newRecipe, r) }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
