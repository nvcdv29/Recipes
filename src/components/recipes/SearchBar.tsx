import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useRecipeStore as useRecipes } from '../../stores/recipeStore';

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const { recipes, setSearchResults } = useRecipes();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (!value.trim()) {
      setSearchResults(null);
      return;
    }

    const lowerQuery = value.toLowerCase();
    const results = recipes.filter(r => 
      r.title.toLowerCase().includes(lowerQuery) || 
      r.ingredients.some(i => i.toLowerCase().includes(lowerQuery)) ||
      r.tags?.some(t => t.toLowerCase().includes(lowerQuery))
    );

    setSearchResults(results);
  };

  const reset = () => {
    setQuery('');
    setSearchResults(null);
  };

  return (
    <div className="relative group max-w-2xl w-full">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search className="text-on-surface-variant group-focus-within:text-primary transition-colors" size={20} />
      </div>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Rezepte durchsuchen..."
        className="w-full h-14 pl-12 pr-12 rounded-2xl bg-white dark:bg-surface-container-low border-2 border-transparent hover:border-outline-variant/30 focus:border-primary focus:bg-primary/5 transition-all outline-none shadow-sm text-lg"
      />
      {query && (
        <button 
          onClick={reset}
          className="absolute inset-y-0 right-4 flex items-center text-on-surface-variant hover:text-on-surface"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
};
