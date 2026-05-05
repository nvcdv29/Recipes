import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface UIState {
  viewMode: 'grid' | 'list';
  showPublicOnly: boolean;
  
  setViewMode: (mode: 'grid' | 'list') => void;
  setShowPublicOnly: (show: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        viewMode: 'grid',
        showPublicOnly: false,

        setViewMode: (mode) => set({ viewMode: mode }, false, 'setViewMode'),
        setShowPublicOnly: (show) => set({ showPublicOnly: show }, false, 'setShowPublicOnly'),
      }),
      { name: 'ui-storage' }
    ),
    { name: 'UIStore' }
  )
);
