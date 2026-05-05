import { useState } from 'react';
import { useRecipeStore as useRecipes } from '../../stores/recipeStore';
import { useAuthStore as useAuth } from '../../stores/authStore';
import { useShoppingList } from '../../hooks/useShoppingList';
import { generateShoppingListItems } from '../../services/shoppingListService';
import { Recipe } from '../../types';
import { Button } from '../ui/Button';
import { X, Search, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export const ShoppingListGenerator = ({ onClose }: { onClose: () => void }) => {
  const { recipes } = useRecipes();
  const { user } = useAuth();
  const { createList } = useShoppingList();
  const navigate = useNavigate();
  
  const [selectedRecipes, setSelectedRecipes] = useState<Record<string, number>>({});
  const [listName, setListName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSelect = (recipe: Recipe) => {
    if (recipe.id) {
      if (selectedRecipes[recipe.id]) {
        const copy = { ...selectedRecipes };
        delete copy[recipe.id];
        setSelectedRecipes(copy);
      } else {
        setSelectedRecipes({ ...selectedRecipes, [recipe.id]: recipe.servings || 2 });
      }
    }
  };

  const handleServingChange = (recipeId: string, delta: number) => {
    setSelectedRecipes(prev => ({
      ...prev,
      [recipeId]: Math.max(1, (prev[recipeId] || 2) + delta)
    }));
  };

  const handleGenerate = async () => {
    if (!user) return;
    
    const selectedIds = Object.keys(selectedRecipes);
    if (selectedIds.length === 0) return;
    
    // Build array of recipes with servings
    const toGenerate = selectedIds.map(id => {
      return {
        recipe: recipes.find(r => r.id === id)!,
        targetServings: selectedRecipes[id]
      };
    }).filter(x => x.recipe);
    
    const items = generateShoppingListItems(toGenerate);
    
    const name = listName.trim() || `Einkaufsliste (${new Date().toLocaleDateString()})`;
    
    await createList({
      name,
      userId: user.uid,
      recipes: selectedIds.map(id => ({ recipeId: id, servings: selectedRecipes[id] })),
      items
    });
    
    onClose();
  };

  const searchResults = recipes.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-surface-container-low rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low shrink-0">
          <h2 className="text-2xl font-serif font-bold text-on-surface">Neue Einkaufsliste</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">Listenname (optional)</label>
            <input 
              type="text" 
              value={listName}
              onChange={e => setListName(e.target.value)}
              placeholder="z.B. Wochenendeinkauf"
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-bold text-on-surface flex-1">Rezepte auswählen</label>
              <div className="relative flex-1 max-w-xs">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  type="text"
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant/20 rounded-lg text-sm outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              {searchResults.slice(0, 10).map(recipe => {
                const isSelected = !!recipe.id && !!selectedRecipes[recipe.id];
                return (
                  <div 
                    key={recipe.id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-2xl transition-all",
                      isSelected ? "border-primary bg-primary/5" : "border-outline-variant/20 hover:border-outline-variant/50"
                    )}
                  >
                    <div 
                      className="flex-1 flex items-center gap-3 cursor-pointer"
                      onClick={() => handleSelect(recipe)}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="text-primary" size={24} />
                      ) : (
                        <Circle className="text-outline-variant/40" size={24} />
                      )}
                      <div>
                        <h4 className="font-bold text-on-surface">{recipe.title}</h4>
                        <p className="text-xs text-on-surface-variant flex items-center gap-2 mt-1">
                          Standard: {recipe.servings} Portionen
                        </p>
                      </div>
                    </div>
                    
                    {isSelected && recipe.id && (
                      <div className="flex items-center gap-3 bg-white dark:bg-surface-container-low border border-outline-variant/20 rounded-xl p-1 shrink-0">
                        <button 
                          onClick={() => handleServingChange(recipe.id!, -1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-surface-container rounded-lg font-bold"
                        >-</button>
                        <span className="w-8 text-center font-bold text-primary">{selectedRecipes[recipe.id]}</span>
                        <button 
                          onClick={() => handleServingChange(recipe.id!, 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-surface-container rounded-lg font-bold"
                        >+</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {searchResults.length === 0 && (
                <p className="text-center text-on-surface-variant py-4">Keine Rezepte gefunden.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-outline-variant/10 bg-surface-container-low shrink-0 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button 
            onClick={handleGenerate} 
            disabled={Object.keys(selectedRecipes).length === 0}
          >
            Liste erstellen
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
