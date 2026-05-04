import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeFilters } from '../RecipeFilters';
import { BrowserRouter } from 'react-router-dom';
import { test, expect } from 'vitest';

test('renders filters and handles input', () => {
  const categories = ['Backen', 'Kochen'];
  const dietaryOptions = ['Vegan'];

  render(
    <BrowserRouter>
      <RecipeFilters categories={categories} dietaryOptions={dietaryOptions} />
    </BrowserRouter>
  );

  // Search input
  const searchInput = screen.getByPlaceholderText('Rezepte oder Zutaten suchen...');
  fireEvent.change(searchInput, { target: { value: 'Apfel' } });
  expect(searchInput).toHaveValue('Apfel');

  // Category selection
  const btn = screen.getByText('Backen');
  fireEvent.click(btn);
});
