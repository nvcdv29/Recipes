import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFilterStore } from '../../stores/filterStore';
import { useRecipeStore } from '../../stores/recipeStore';

interface RecipeFiltersProps {
  categories: string[];
  dietaryOptions: string[];
}

export const RecipeFilters = ({
  categories,
  dietaryOptions
}: RecipeFiltersProps) => {
  const searchQuery = useFilterStore(state => state.searchQuery);
  const filterCategory = useFilterStore(state => state.filterCategory);
  const filterDietary = useFilterStore(state => state.filterDietary);
  const filterDifficulty = useFilterStore(state => state.filterDifficulty);
  const setSearchQuery = useFilterStore(state => state.setSearchQuery);
  const setFilterCategory = useFilterStore(state => state.setFilterCategory);
  const setFilterDietary = useFilterStore(state => state.setFilterDietary);
  const setFilterDifficulty = useFilterStore(state => state.setFilterDifficulty);

  const performSearch = useRecipeStore(state => state.performSearch);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    performSearch(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
          <input 
            type="text" 
            placeholder="Rezepte oder Zutaten suchen..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
          {searchQuery && (
            <button 
              onClick={() => handleSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filterCategory === cat 
                  ? "bg-primary text-white shadow-md" 
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="px-4 py-2 bg-surface-container-low text-sm rounded-xl outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-on-surface-variant cursor-pointer border border-transparent hover:border-outline-variant/20 transition-all"
        >
          <option value="Alle">Alle Schwierigkeiten</option>
          <option value="einfach">Einfach</option>
          <option value="mittel">Mittel</option>
          <option value="schwer">Schwer</option>
        </select>
        <select
          value={filterDietary}
          onChange={(e) => setFilterDietary(e.target.value)}
          className="px-4 py-2 bg-surface-container-low text-sm rounded-xl outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-on-surface-variant cursor-pointer border border-transparent hover:border-outline-variant/20 transition-all"
        >
          {dietaryOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt === 'Alle' ? 'Ernährungsart (Alle)' : opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
