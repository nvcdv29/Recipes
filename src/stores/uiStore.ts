import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface UIState {
  viewMode: 'grid' | 'list';
  showPublicOnly: boolean;
  sortBy: 'date_desc' | 'date_asc' | 'rating' | 'name' | 'duration';
  
  setViewMode: (mode: 'grid' | 'list') => void;
  setShowPublicOnly: (show: boolean) => void;
  setSortBy: (sortBy: 'date_desc' | 'date_asc' | 'rating' | 'name' | 'duration') => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        viewMode: 'grid',
        showPublicOnly: false,
        sortBy: 'date_desc',

        setViewMode: (mode) => set({ viewMode: mode }, false, 'setViewMode'),
        setShowPublicOnly: (show) => set({ showPublicOnly: show }, false, 'setShowPublicOnly'),
        setSortBy: (sortBy) => set({ sortBy: sortBy }, false, 'setSortBy'),
      }),
      { name: 'ui-storage' }
    ),
    { name: 'UIStore' }
  )
);
