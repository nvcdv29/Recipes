import { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { useRecipeStore as useRecipes } from '../stores/recipeStore';
import { useFilterStore } from '../stores/filterStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { RecipeFilters } from '../components/recipes/RecipeFilters';
import { SmartSearchBar } from '../components/recipes/SmartSearchBar';
import { SearchBar } from '../components/recipes/SearchBar';
import { RecipeCard } from '../components/recipes/RecipeCard';
import { RecipeListItem } from '../components/recipes/RecipeListItem';
import { EmptyState } from '../components/ui/EmptyState';
import { ActivityFeed } from '../components/social/ActivityFeed';
import { Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../types';

export const HomePage = () => {
  const { 
    recipes,
    searchResults,
    categories,
    dietaryOptions,
    loading
  } = useRecipes();
  
  const user = useAuthStore(state => state.user);
  const settings = useAuthStore(state => state.settings);
  const filterCategory = useFilterStore(state => state.filterCategory);
  const filterDietary = useFilterStore(state => state.filterDietary);
  const filterDifficulty = useFilterStore(state => state.filterDifficulty);
  const filterDuration = useFilterStore(state => state.filterDuration);
  const filterServings = useFilterStore(state => state.filterServings);
  const viewMode = useUIStore(state => state.viewMode);
  const sortBy = useUIStore(state => state.sortBy);

  const navigate = useNavigate();
  
  const [smartResults, setSmartResults] = useState<{recipes: Recipe[], reasoning: string, filter?: any} | null>(null);

  const filteredRecipes = useMemo(() => {
    const baseList = searchResults || recipes;
    return baseList.filter(r => {
      const matchesCategory = filterCategory === 'Alle' || (r.categories && r.categories.includes(filterCategory));
      const matchesDietary = filterDietary === 'Alle' || (r.dietary && r.dietary.includes(filterDietary));
      const matchesDifficulty = filterDifficulty === 'Alle' || r.difficulty === filterDifficulty;
      const matchesDuration = !filterDuration || r.duration?.toLowerCase().includes(filterDuration.toLowerCase());
      const matchesServings = !filterServings || r.servings === parseInt(filterServings);
      const isVisible = r.isPublic || r.authorId === user?.uid;
      return matchesCategory && matchesDietary && matchesDifficulty && matchesDuration && matchesServings && isVisible;
    });
  }, [recipes, searchResults, filterCategory, filterDietary, filterDifficulty, filterDuration, filterServings, user]);

  const baseRecipes = smartResults ? smartResults.recipes : filteredRecipes;

  const displayRecipes = useMemo(() => {
    return [...baseRecipes].sort((a, b) => {
      switch (sortBy) {
        case 'rating': return ((b.averageRating || 0) - (a.averageRating || 0));
        case 'name': return a.title.localeCompare(b.title, 'de');
        case 'duration': {
          const parseDur = (d?: string) => {
            if (!d) return 999;
            const m = d.match(/(\d+)/);
            return m ? parseInt(m[1]) : 999;
          };
          return parseDur(a.duration) - parseDur(b.duration);
        }
        case 'date_asc': return a.createdAt.localeCompare(b.createdAt);
        default: return b.createdAt.localeCompare(a.createdAt); // date_desc
      }
    });
  }, [baseRecipes, sortBy]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn("grid gap-8", settings.enableSocialFeatures !== false ? "grid-cols-1 xl:grid-cols-4" : "grid-cols-1")}
    >
      <div className={settings.enableSocialFeatures !== false ? "xl:col-span-3" : "cols-span-1"}>
        <div className="mb-6">
          {settings.enableNaturalLanguageSearch !== false ? (
            <SmartSearchBar onResults={setSmartResults} />
          ) : (
            <SearchBar />
          )}
        </div>

        <AnimatePresence>
          {smartResults && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 p-4 bg-secondary/10 border border-secondary/20 rounded-2xl flex items-start gap-4"
            >
              <div className="p-2 bg-secondary text-on-secondary rounded-full mt-1">
                <Sparkles size={16} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-on-surface mb-1">AI Recommendation</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {smartResults.reasoning}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!smartResults && (
          <RecipeFilters 
            categories={categories}
            dietaryOptions={dietaryOptions}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        ) : displayRecipes.length === 0 ? (
          <EmptyState 
            title="Keine Rezepte gefunden"
            description="Starte deine Sammlung mit einem neuen Rezept!"
          />
        ) : viewMode === 'list' ? (
          <div className="mt-8">
            {displayRecipes.map((recipe) => (
              <RecipeListItem
                key={recipe.id}
                recipe={recipe}
                onClick={() => navigate(`/recipes/${recipe.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {displayRecipes.map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onClick={() => navigate(`/recipes/${recipe.id}`)} 
              />
            ))}
          </div>
        )}
      </div>
      
      {settings.enableSocialFeatures !== false && (
        <div className="xl:col-span-1 hidden xl:block space-y-6">
          <ActivityFeed />
        </div>
      )}
    </motion.div>
  );
};
