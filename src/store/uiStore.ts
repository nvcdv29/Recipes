import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  // Filters
  searchQuery: string;
  filterCategory: string;
  filterDietary: string;
  filterDifficulty: string;
  filterDuration: string;
  filterServings: string;
  
  // View Preferences
  viewMode: 'grid' | 'list';
  showPublicOnly: boolean;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setFilterCategory: (category: string) => void;
  setFilterDietary: (dietary: string) => void;
  setFilterDifficulty: (difficulty: string) => void;
  setFilterDuration: (duration: string) => void;
  setFilterServings: (servings: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setShowPublicOnly: (show: boolean) => void;
  resetFilters: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      searchQuery: '',
      filterCategory: 'Alle',
      filterDietary: 'Alle',
      filterDifficulty: 'Alle',
      filterDuration: '',
      filterServings: '',
      viewMode: 'grid',
      showPublicOnly: false,

      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterCategory: (category) => set({ filterCategory: category }),
      setFilterDietary: (dietary) => set({ filterDietary: dietary }),
      setFilterDifficulty: (difficulty) => set({ filterDifficulty: difficulty }),
      setFilterDuration: (duration) => set({ filterDuration: duration }),
      setFilterServings: (servings) => set({ filterServings: servings }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setShowPublicOnly: (show) => set({ showPublicOnly: show }),
      
      resetFilters: () => set({
        searchQuery: '',
        filterCategory: 'Alle',
        filterDietary: 'Alle',
        filterDifficulty: 'Alle',
        filterDuration: '',
        filterServings: '',
      }),
    }),
    {
      name: 'heirloom-ui-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist view preferences, not the volatile filters if desired
      // But user wanted persistent filters, so we keep them all.
    }
  )
);
