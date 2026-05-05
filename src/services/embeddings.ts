import { Recipe } from '../types';

export const generateRecipeEmbedding = async (recipe: Partial<Recipe>): Promise<number[] | undefined> => {
  try {
    const textToEmbed = `
      Title: ${recipe.title || ''}
      Categories: ${(recipe.categories || []).join(', ')}
      Dietary: ${(recipe.dietary || []).join(', ')}
      Ingredients: ${(recipe.ingredients || []).join(', ')}
      Instructions: ${(recipe.instructions || []).join(' ')}
    `.replace(/\s+/g, ' ').trim();

    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: [textToEmbed] })
    });

    if (!response.ok) {
      throw new Error('Failed to generate embedding');
    }

    const data = await response.json();
    return data.embeddings[0];
  } catch (error) {
    console.error('generateRecipeEmbedding error', error);
    return undefined;
  }
};
