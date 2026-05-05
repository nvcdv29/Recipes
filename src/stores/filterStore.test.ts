import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';
import { useFilterStore } from './filterStore';

describe('UI & Filter Stores (Zustand)', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters();
  });

  it('updates search query', () => {
    const { setSearchQuery } = useFilterStore.getState();
    setSearchQuery('Pizza');
    expect(useFilterStore.getState().searchQuery).toBe('Pizza');
  });

  it('updates filter category', () => {
    const { setFilterCategory } = useFilterStore.getState();
    setFilterCategory('Backen');
    expect(useFilterStore.getState().filterCategory).toBe('Backen');
  });

  it('resets filters correctly', () => {
    const { setSearchQuery, setFilterCategory, resetFilters } = useFilterStore.getState();
    setSearchQuery('Pasta');
    setFilterCategory('Vegan');
    
    resetFilters();
    
    expect(useFilterStore.getState().searchQuery).toBe('');
    expect(useFilterStore.getState().filterCategory).toBe('Alle');
  });

  it('updates view mode', () => {
    const { setViewMode } = useUIStore.getState();
    setViewMode('list');
    expect(useUIStore.getState().viewMode).toBe('list');
  });

  it('should update remaining filters', () => {
    const { setFilterDietary, setFilterDifficulty, setFilterDuration, setFilterServings } = useFilterStore.getState();
    const { setShowPublicOnly } = useUIStore.getState();
    
    setFilterDietary('Vegan');
    setFilterDifficulty('Leicht');
    setFilterDuration('30 Min');
    setFilterServings('2');
    setShowPublicOnly(true);

    const filterState = useFilterStore.getState();
    const uiState = useUIStore.getState();
    
    expect(filterState.filterDietary).toBe('Vegan');
    expect(filterState.filterDifficulty).toBe('Leicht');
    expect(filterState.filterDuration).toBe('30 Min');
    expect(filterState.filterServings).toBe('2');
    expect(uiState.showPublicOnly).toBe(true);
  });
});

