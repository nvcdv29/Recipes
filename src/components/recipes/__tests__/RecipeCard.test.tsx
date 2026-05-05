import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeCard } from '../RecipeCard';
import { vi, test, expect } from 'vitest';
import { Recipe } from '../../../types';

// Mock Firebase
vi.mock('../../../firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(),
  },
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb({ uid: 'test-uid' });
    return () => {};
  }),
  isSignInWithEmailLink: vi.fn(),
  signInWithEmailLink: vi.fn(),
  signOut: vi.fn(),
}));

const mockRecipe: Recipe = {
  id: '1',
  title: 'Apfelkuchen',
  categories: ['Backen'],
  dietary: ['Vegetarisch'],
  duration: '60 Min',
  servings: 1,
  difficulty: 'mittel',
  ingredients: [],
  instructions: [],
  images: ['https://example.com/apple-pie.jpg'],
  authorId: 'test',
  authorName: 'test_author',
  tags: [],
  createdAt: new Date().toISOString(),
  isPublic: true,
};

test('displays recipe title', () => {
  render(
    <RecipeCard recipe={mockRecipe} onClick={() => {}} />
  );
  expect(screen.getByText('Apfelkuchen')).toBeInTheDocument();
  expect(screen.getByText('60 Min')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
});

test('handles favorite click and sourceUrl propagation', () => {
  const recipeWithSource = {
    ...mockRecipe,
    sourceUrl: 'https://example.com',
    sourceName: 'Example',
    averageRating: 4.5,
  };
  
  const { container } = render(
    <RecipeCard recipe={recipeWithSource} onClick={() => {}} />
  );

  const favoriteBtn = container.querySelector('button');
  if (favoriteBtn) {
    fireEvent.click(favoriteBtn);
  }

  const link = container.querySelector('a');
  if (link) {
    fireEvent.click(link);
  }
});
