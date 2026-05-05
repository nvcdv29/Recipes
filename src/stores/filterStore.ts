import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export interface FilterState {
  searchQuery: string;
  filterCategory: string;
  filterDietary: string;
  filterDifficulty: string;
  filterDuration: string;
  filterServings: string;
  
  setSearchQuery: (query: string) => void;
  setFilterCategory: (category: string) => void;
  setFilterDietary: (dietary: string) => void;
  setFilterDifficulty: (difficulty: string) => void;
  setFilterDuration: (duration: string) => void;
  setFilterServings: (servings: string) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>()(
  devtools(
    persist(
      (set) => ({
        searchQuery: '',
        filterCategory: 'Alle',
        filterDietary: 'Alle',
        filterDifficulty: 'Alle',
        filterDuration: '',
        filterServings: '',

        setSearchQuery: (query) => set({ searchQuery: query }, false, 'setSearchQuery'),
        setFilterCategory: (category) => set({ filterCategory: category }, false, 'setFilterCategory'),
        setFilterDietary: (dietary) => set({ filterDietary: dietary }, false, 'setFilterDietary'),
        setFilterDifficulty: (difficulty) => set({ filterDifficulty: difficulty }, false, 'setFilterDifficulty'),
        setFilterDuration: (duration) => set({ filterDuration: duration }, false, 'setFilterDuration'),
        setFilterServings: (servings) => set({ filterServings: servings }, false, 'setFilterServings'),
        
        resetFilters: () => set({
          searchQuery: '',
          filterCategory: 'Alle',
          filterDietary: 'Alle',
          filterDifficulty: 'Alle',
          filterDuration: '',
          filterServings: '',
        }, false, 'resetFilters'),
      }),
      {
        name: 'recipe-filters-storage',
        // Optional: you can choose which fields to persist
        // partialize: (state) => ({ filterCategory: state.filterCategory, filterDietary: state.filterDietary }),
      }
    ),
    { name: 'FilterStore' }
  )
);
