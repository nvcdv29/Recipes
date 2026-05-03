import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  or, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestore';
import { useAuth } from './AuthContext';
import { useUIStore } from '../store/uiStore';
import FlexSearch from 'flexsearch';

interface RecipeContextType {
  recipes: Recipe[];
  searchResults: Recipe[] | null;
  loading: boolean;
  categories: string[];
  dietaryOptions: string[];
  filteredRecipes: Recipe[];
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider = ({ children }: { children: ReactNode }) => {
  const { user, isWhitelisted } = useAuth();
  const { 
    searchQuery, 
    filterCategory, 
    filterDietary, 
    filterDifficulty, 
    filterDuration, 
    filterServings 
  } = useUIStore();
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || isWhitelisted === false) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'recipes'),
      or(where('isPublic', '==', true), where('authorId', '==', user.uid)),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
      setRecipes(rList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recipes');
      setLoading(false);
    });

    return unsubscribe;
  }, [user, isWhitelisted]);

  // Search Index
  const index = useMemo(() => {
    const idx = new FlexSearch.Document({
      document: {
        id: "id",
        index: ["title", "ingredients", "notes", "tags"],
        store: true
      },
      tokenize: "forward"
    });
    recipes.forEach(r => idx.add(r as any));
    return idx;
  }, [recipes]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return null;
    const results = index.search(searchQuery, { enrich: true });
    return results.flatMap(r => r.result.map(res => (res as any).doc)) as Recipe[];
  }, [searchQuery, index]);

  const categories = useMemo(() => ['Alle', ...Array.from(new Set(recipes.flatMap(r => r.categories || [])))], [recipes]);
  const dietaryOptions = useMemo(() => ['Alle', ...Array.from(new Set(recipes.flatMap(r => r.dietary || [])))], [recipes]);

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

  return (
    <RecipeContext.Provider value={{ 
      recipes, searchResults, loading, categories, dietaryOptions, filteredRecipes
    }}>
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
};
