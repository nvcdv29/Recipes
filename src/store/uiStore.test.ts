import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('UI Store (Zustand)', () => {
  beforeEach(() => {
    // Reset store before each test
    useUIStore.getState().resetFilters();
  });

  it('updates search query', () => {
    const { setSearchQuery } = useUIStore.getState();
    setSearchQuery('Pizza');
    expect(useUIStore.getState().searchQuery).toBe('Pizza');
  });

  it('updates filter category', () => {
    const { setFilterCategory } = useUIStore.getState();
    setFilterCategory('Backen');
    expect(useUIStore.getState().filterCategory).toBe('Backen');
  });

  it('resets filters correctly', () => {
    const { setSearchQuery, setFilterCategory, resetFilters } = useUIStore.getState();
    setSearchQuery('Pasta');
    setFilterCategory('Vegan');
    
    resetFilters();
    
    expect(useUIStore.getState().searchQuery).toBe('');
    expect(useUIStore.getState().filterCategory).toBe('Alle');
  });

  it('updates view mode', () => {
    const { setViewMode } = useUIStore.getState();
    setViewMode('list');
    expect(useUIStore.getState().viewMode).toBe('list');
  });

  it('should update remaining filters', () => {
    const { setFilterDietary, setFilterDifficulty, setFilterDuration, setFilterServings, setShowPublicOnly } = useUIStore.getState();
    setFilterDietary('Vegan');
    setFilterDifficulty('Leicht');
    setFilterDuration('30 Min');
    setFilterServings('2');
    setShowPublicOnly(true);

    const state = useUIStore.getState();
    expect(state.filterDietary).toBe('Vegan');
    expect(state.filterDifficulty).toBe('Leicht');
    expect(state.filterDuration).toBe('30 Min');
    expect(state.filterServings).toBe('2');
    expect(state.showPublicOnly).toBe(true);
  });
});
