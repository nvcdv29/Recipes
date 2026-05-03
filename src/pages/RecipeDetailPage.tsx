import { useParams, useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useAuth } from '../contexts/AuthContext';
import { useRecipeActions } from '../hooks/useRecipeActions';
import { RecipeDetail } from '../components/recipes/RecipeDetail';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

export const RecipeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes } = useRecipes();
  const { user } = useAuth();
  const { deleteRecipe } = useRecipeActions();
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const recipe = useMemo(() => recipes.find(r => r.id === id), [recipes, id]);

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-on-surface-variant font-medium">Rezept wird geladen...</p>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={async () => {
          if (recipe.id) {
            const success = await deleteRecipe(recipe.id);
            if (success) navigate('/');
          }
        }}
        title="Rezept löschen"
        message="Bist du sicher, dass du dieses Rezept unwiderruflich löschen möchtest?"
      />

      <RecipeDetail 
        recipe={recipe}
        onBack={() => navigate('/')}
        onEdit={() => navigate(`/edit/${recipe.id}`)}
        onDelete={() => setIsConfirmOpen(true)}
        onCook={() => navigate(`/cook/${recipe.id}`)}
        currentUser={user}
      />
    </>
  );
};
