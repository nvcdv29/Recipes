import { 
  deleteDoc, 
  doc, 
  collection, 
  addDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { OperationType, Recipe } from '../types';
import { handleFirestoreError } from '../services/firestore';
import { toast } from 'sonner';

export function useRecipeActions() {
  const deleteRecipe = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'recipes', id));
      toast.success('Rezept gelöscht');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `recipes/${id}`);
      return false;
    }
  };

  const saveBulkRecipes = async (recipes: any[], user: any) => {
    try {
      for (const recipe of recipes) {
        const recipeData = {
          ...recipe,
          authorId: user?.uid,
          authorName: user?.displayName || 'Family Member',
          createdAt: new Date().toISOString(),
          isPublic: true,
        };
        
        // Sanitize
        if (!recipeData.title) recipeData.title = 'Neues Rezept';
        if (!recipeData.ingredients || recipeData.ingredients.length === 0) recipeData.ingredients = ['Zutat fehlt'];
        if (!recipeData.instructions || recipeData.instructions.length === 0) recipeData.instructions = ['Schritt fehlt'];
        
        if (typeof recipeData.servings !== 'number') {
          recipeData.servings = parseInt(recipeData.servings as any) || 4;
        }
        
        if (recipeData.images && recipeData.images.length > 0) {
          recipeData.images = recipeData.images.slice(0, 3);
        }

        delete recipeData.id;
        await addDoc(collection(db, 'recipes'), recipeData);
      }
      toast.success(`${recipes.length} Rezepte erfolgreich gespeichert!`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'recipes');
      return false;
    }
  };

  return { deleteRecipe, saveBulkRecipes };
}
