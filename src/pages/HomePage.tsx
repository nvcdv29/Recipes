import { useRecipes } from '../contexts/RecipeContext';
import { RecipeFilters } from '../components/recipes/RecipeFilters';
import { RecipeCard } from '../components/recipes/RecipeCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ActivityFeed } from '../components/social/ActivityFeed';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export const HomePage = () => {
  const { 
    filteredRecipes, 
    categories,
    dietaryOptions,
    loading
  } = useRecipes();
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 xl:grid-cols-4 gap-8"
    >
      <div className="xl:col-span-3">
        <RecipeFilters 
          categories={categories}
          dietaryOptions={dietaryOptions}
        />

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        ) : filteredRecipes.length === 0 ? (
          <EmptyState 
            title="Keine Rezepte gefunden"
            description="Starte deine Sammlung mit einem neuen Rezept!"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {filteredRecipes.map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onClick={() => navigate(`/recipes/${recipe.id}`)} 
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="xl:col-span-1 hidden xl:block space-y-6">
        <ActivityFeed />
      </div>
    </motion.div>
  );
};
