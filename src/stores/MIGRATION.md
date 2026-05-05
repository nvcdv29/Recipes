# Migration Guide: React Context to Zustand

This project has migrated from using React Context + `useState` to Zustand for state management. This document outlines the rationale, restructuring, and how to use the new stores.

## Why Zustand?
- **Performance:** Zustand prevents unnecessary re-renders. We were storing large lists (e.g., `recipes`) in Context which caused components consuming *any* property from the context to re-render.
- **Simplicity:** No need to wrap components with `Provider` trees in `App.tsx` or `main.tsx`. Stores can be imported directly and used anywhere, even outside of React components.
- **Persistence:** Zustand comes with lightweight middleware (`persist`) out of the box, which we needed for `FilterStore` and `UIStore`.
- **DevTools Integration:** Redux DevTools work natively with Zustand using its `devtools` middleware, providing deep visibility into state transitions.

## 1. Directory Structure
Previously, we had `/src/contexts/` containing `AuthContext.tsx` and `RecipeContext.tsx`.  
Now we have `/src/stores/` containing:
- `authStore.ts`: Manages user sessions, profiles, whitelist checks, and user-associated actions (e.g., `toggleFavorite`).
- `recipeStore.ts`: Manages all loaded recipes, categories, dietary options, and `FlexSearch` index queries.
- `filterStore.ts`: (Persisted) Stores the filter states: search query, categories, limits.
- `uiStore.ts`: (Persisted) Manages view modes globally.

## 2. Removing Providers
You no longer need to wrap your app in `<AuthProvider>` or `<RecipeProvider>`.
Instead, we provide an `<AppInitializer>` in `main.tsx` that triggers standard data synchronizations:
```tsx
const initializeAuth = useAuthStore(state => state.initializeAuth);
const initializeRecipes = useRecipeStore(state => state.initializeRecipes);

// Start listeners:
useEffect(() => initializeAuth(), [initializeAuth]);
```

## 3. How to Consume State

**Old Context Approach:**
```tsx
import { useRecipes } from '../../contexts/RecipeContext';

const Component = () => {
  const { recipes, filteredRecipes, searchResults } = useRecipes();
  // Unnecessary re-renders on every minor store change
};
```

**New Zustand Approach:**
```tsx
import { useRecipeStore } from '../../stores/recipeStore';
import { useShallow } from 'zustand/react/shallow';

const Component = () => {
  const recipes = useRecipeStore(state => state.recipes);
  // Re-renders ONLY when `recipes` changes!
};
```

You can select multiple properties with `useShallow` natively:
```tsx
const { searchQuery, setSearchQuery } = useFilterStore(useShallow(state => ({
  searchQuery: state.searchQuery,
  setSearchQuery: state.setSearchQuery,
})));
```

## 4. Derived & Computed State (like `filteredRecipes`)
Context used to hold computed values. In Zustand, we prefer to compute complex lists *adjacent to the view*, using `useMemo` in the component (e.g., `HomePage.tsx`) or via selectors. This keeps the store lean and avoids bloated updates.

**Before (RecipeContext):**
```tsx
const filteredRecipes = useMemo(() => ...);
```

**After (HomePage):**
```tsx
const { recipes, searchResults } = useRecipeStore();
const { filterCategory, filterDietary } = useFilterStore();
const filteredRecipes = useMemo(() => extract(recipes, filterCategory), [recipes, filterCategory]);
```

## 5. Migrating your changes
A script `migrate.cjs` was provided to run regex-based string replacements across `.tsx` components, replacing the legacy `import { useAuth } from '../contexts/AuthContext'` pattern with the Zustand store standard.
