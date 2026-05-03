import { Recipe, ShoppingListItem } from '../types';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Obst & Gemüse': ['apfel', 'banane', 'zwiebel', 'knoblauch', 'tomate', 'kartoffel', 'salat', 'zitrone', 'gurke', 'karotte', 'möhre', 'paprika', 'pilz', 'beere'],
  'Fleisch & Fisch': ['fleisch', 'hähnchen', 'rind', 'schwein', 'lachs', 'fisch', 'speck', 'wurst', 'hackfleisch'],
  'Milchprodukte & Eier': ['milch', 'käse', 'butter', 'joghurt', 'sahne', 'quark', 'ei', 'eier', 'parmesan', 'mozzarella', 'fetakäse'],
  'Brot & Backwaren': ['brot', 'brötchen', 'toast', 'baguette', 'mehl', 'hefe', 'backpulver', 'zucker'],
  'Konserven & Vorrat': ['passierte tomaten', 'stückige tomaten', 'reis', 'nudeln', 'pasta', 'spaghetti', 'linsen', 'bohnen', 'kichererbsen', 'brühe'],
  'Gewürze & Saucen': ['salz', 'pfeffer', 'öl', 'olivenöl', 'essig', 'sojasauce', 'senf', 'ketchup', 'mayonnaise', 'curry', 'paprikapulver', 'zimt', 'kräuter', 'basilikum', 'oregano'],
  'Snacks & Süßigkeiten': ['schokolade', 'nüsse', 'chips', 'kekse', 'honig', 'marmelade']
};

export function determineCategory(ingredientName: string): string {
  const lowerName = ingredientName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }
  return 'Sonstiges';
}

export function parseIngredient(ingredient: string) {
  // Try to match quantity + unit + name
  // e.g., "200 g Mehl", "1 kg Äpfel", "2 EL Öl", "1/2 TL Salz", "1.5 l Wasser"
  const match = ingredient.trim().match(/^([\d.,\s\/]+)\s*(g|kg|ml|l|tl|el|prise|stk|stück|pck|bund)?\s+(.*)/i);
  
  if (match) {
    let quantityStr = match[1].replace(/\s/g, '').replace(',', '.');
    let quantity = 0;
    
    // Evaluate simple fractions like 1/2
    if (quantityStr.includes('/')) {
      const [num, den] = quantityStr.split('/');
      if (num && den) quantity = parseFloat(num) / parseFloat(den);
    } else {
      quantity = parseFloat(quantityStr);
    }
    
    return {
      quantity,
      unit: match[2]?.toLowerCase() || '',
      name: match[3]?.trim() || ingredient,
      originalQuantityStr: match[1].trim()
    };
  }
  
  return null;
}

export function generateShoppingListItems(
  recipesWithServings: { recipe: Recipe; targetServings: number }[]
): ShoppingListItem[] {
  const combinedItems = new Map<string, { quantity: number; unit: string; category: string }>();
  const unparsedItems: ShoppingListItem[] = [];

  for (const { recipe, targetServings } of recipesWithServings) {
    const scaleFactor = recipe.servings > 0 ? targetServings / recipe.servings : 1;

    for (const ingredient of recipe.ingredients) {
      const parsed = parseIngredient(ingredient);
      
      if (parsed && !Number.isNaN(parsed.quantity)) {
        // Normalize name for grouping
        const normalizedName = parsed.name.toLowerCase();
        // Create a unique key combining name and unit to avoid adding mismatched units (like g and EL)
        const key = `${normalizedName}|${parsed.unit}`;
        
        const scaledQty = parsed.quantity * scaleFactor;
        
        if (combinedItems.has(key)) {
          const existing = combinedItems.get(key)!;
          combinedItems.set(key, { ...existing, quantity: existing.quantity + scaledQty });
        } else {
          combinedItems.set(key, { 
            quantity: scaledQty, 
            unit: parsed.unit, 
            category: determineCategory(parsed.name) 
          });
        }
      } else {
        // Could not parse reasonably, add as is
        unparsedItems.push({
          ingredient: ingredient,
          quantity: '',
          category: determineCategory(ingredient),
          checked: false
        });
      }
    }
  }

  const result: ShoppingListItem[] = [];
  
  for (const [key, data] of combinedItems.entries()) {
    const [name] = key.split('|');
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    
    // Format quantity: remove trailing decimals if not needed
    const qtyStr = Number.isInteger(data.quantity) ? data.quantity.toString() : data.quantity.toFixed(1);
    
    const qtyStrWithUnit = data.unit ? `${qtyStr} ${data.unit}` : qtyStr;
    
    result.push({
      ingredient: formattedName,
      quantity: qtyStrWithUnit,
      category: data.category,
      checked: false
    });
  }
  
  return [...result, ...unparsedItems];
}
