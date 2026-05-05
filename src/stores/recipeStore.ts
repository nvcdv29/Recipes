import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { collection, query, onSnapshot, orderBy, or, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestore';
import FlexSearch from 'flexsearch';

interface RecipeState {
  recipes: Recipe[];
  searchResults: Recipe[] | null;
  loading: boolean;
  categories: string[];
  dietaryOptions: string[];
  
  // Internal state
  searchIndex: any | null;
  
  // Actions
  setRecipes: (recipes: Recipe[]) => void;
  setSearchResults: (results: Recipe[] | null) => void;
  setLoading: (loading: boolean) => void;
  
  initializeRecipes: (userUid: string, isWhitelisted: boolean) => () => void;
  performSearch: (searchQuery: string) => void;
}

export const useRecipeStore = create<RecipeState>()(
  devtools(
    (set, get) => ({
      recipes: [],
      searchResults: null,
      loading: true,
      categories: ['Alle'],
      dietaryOptions: ['Alle'],
      searchIndex: null,

      setRecipes: (recipes) => set({ recipes }, false, 'setRecipes'),
      setSearchResults: (results) => set({ searchResults: results }, false, 'setSearchResults'),
      setLoading: (loading) => set({ loading }, false, 'setLoading'),

      initializeRecipes: (userUid: string, isWhitelisted: boolean) => {
        if (!userUid || !isWhitelisted) {
          set({ recipes: [], loading: false, categories: ['Alle'], dietaryOptions: ['Alle'], searchIndex: null });
          return () => {};
        }

        const q = query(
          collection(db, 'recipes'),
          or(where('isPublic', '==', true), where('authorId', '==', userUid)),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const rList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
          
          // Compute Derived state
          const index = new FlexSearch.Document({
            document: {
              id: "id",
              index: ["title", "ingredients", "notes", "tags"],
              store: true
            },
            tokenize: "forward"
          });
          rList.forEach(r => index.add(r as any));

          const categories = ['Alle', ...Array.from(new Set(rList.flatMap(r => r.categories || [])))];
          const dietaryOptions = ['Alle', ...Array.from(new Set(rList.flatMap(r => r.dietary || [])))];

          set({ 
            recipes: rList, 
            loading: false, 
            searchIndex: index, 
            categories, 
            dietaryOptions,
            searchResults: null // reset search results on update or re-run query if tracking
          }, false, 'recipesOnSnapshot');
          
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'recipes');
          set({ loading: false });
        });

        return unsubscribe;
      },

      performSearch: (searchQuery: string) => {
        const { searchIndex } = get();
        if (!searchQuery || !searchIndex) {
          set({ searchResults: null }, false, 'performSearch_clear');
          return;
        }
        const results = searchIndex.search(searchQuery, { enrich: true });
        const finalResults = results.flatMap((r: any) => r.result.map((res: any) => res.doc)) as Recipe[];
        set({ searchResults: finalResults }, false, 'performSearch_complete');
      }
    }),
    { name: 'RecipeStore' }
  )
);
