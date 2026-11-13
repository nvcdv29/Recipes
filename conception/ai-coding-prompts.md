# Google Coding AI Prompts - The Heirloom Editorial

Jeder Prompt ist standalone und kann direkt in Google AI Studio / Gemini Code verwendet werden.

MINE:
Überprüfe ob alle der folgenden Verbesserungen erledigt wurden, wenn ja, lass es so wie es ist, wenn nein, implementiere right away.


---

## 1. ✓ Architektur-Refactoring: Component-Splitting

```
CONTEXT:
React 19 + TypeScript app with monolithic App.tsx (2631 lines). Uses Vite, Tailwind CSS, Firebase Firestore, Lucide icons, Motion animations.

TASK:
Split App.tsx into modular architecture:
- Extract RecipeCard, RecipeDetail, RecipeForm, RecipeFilters into components/recipes/
- Extract ImageScanner, URLImport, ImportReview into components/import/
- Extract Header, Sidebar, Modal into components/layout/
- Create custom hooks: useRecipes, useAuth, useFilters in hooks/
- Create AuthContext and RecipeContext in contexts/

CONSTRAINTS:
- Maintain all existing functionality
- Preserve TypeScript types from types.ts
- Keep Firestore queries performant
- No breaking changes to data model

OUTPUT:
- New folder structure with file tree
- Component files with proper TypeScript interfaces
- Hook files with clear separation of concerns
- Context providers with memoization
```

---

## 2. ✓ Feature: Kochansicht (Cooking Mode)

```
CONTEXT:
Recipe app with Recipe type containing ingredients[], instructions[], duration, servings. Need step-by-step cooking interface.

TASK:
Implement CookingMode component with:
- Fullscreen mode toggle
- Large touch-friendly "Next Step" button
- Current step highlighted with progress bar (Step 3 of 8)
- Ingredient checklist with checkboxes
- Per-step timer integration (parse duration from instructions if format "15 Min")
- "Jump to Step" navigation
- Keep screen awake (use NoSleep.js or Wakeful API)

TECH STACK:
React 19, TypeScript, Tailwind CSS, Lucide icons, Motion for animations

OUTPUT:
- CookingMode.tsx component
- CookingModeState interface
- Integration hook useCookingMode()
- CSS for fullscreen mode
```

---

## 3. ✓ Feature: Einkaufsliste (Shopping List)

```
CONTEXT:
Recipe app with Firestore backend. Recipe type has ingredients: string[] field. Need to generate shopping lists from multiple recipes.

TASK:
Create shopping list feature:
- ShoppingList collection in Firestore with items grouped by category
- Auto-categorize ingredients (Gemüse, Fleisch, Milchprodukte) using simple keyword matching or Gemini AI
- Combine multiple recipes, scale quantities based on servings
- Checkbox state per item (checked: boolean)
- Export as PDF and plain text
- Share via Web Share API

DATA MODEL:
interface ShoppingList {
  id: string;
  name: string;
  userId: string;
  recipes: { recipeId: string; servings: number }[];
  items: { ingredient: string; quantity: string; category: string; checked: boolean }[];
  createdAt: string;
}

TECH STACK:
Firebase Firestore, React 19, TypeScript, jsPDF for export

OUTPUT:
- ShoppingListGenerator.tsx component
- Firestore CRUD operations
- Category classification logic
- PDF export function
```

---

## 4. ✓ Feature: Favoriten & Collections

```
CONTEXT:
Recipe app with userId-based auth. Need personal favorites and custom collections.

TASK:
Implement favorites and collections:
- Star button on RecipeCard (toggle favorite)
- Collection type in Firestore: { id, userId, name, description, recipeIds[], isShared, icon, color }
- CollectionManager UI with create/edit/delete
- Drag-and-drop recipe organization (React DnD or native HTML5)
- Smart Collections with auto-filters (e.g., "All vegan desserts")
- Share collection within family (isShared flag)

FIRESTORE RULES:
- Users can only edit their own collections
- Shared collections readable by all family members

TECH STACK:
React 19, TypeScript, Firestore, React Beautiful DnD (optional)

OUTPUT:
- Collection data model + Firestore rules
- FavoritesManager.tsx component
- CollectionCard.tsx component
- Drag-and-drop implementation
```

---

## 5. ✓ Feature: Duplikat-Erkennung

```
CONTEXT:
Recipe import system that accepts images and URLs. Need to detect duplicate recipes before saving to Firestore.

TASK:
Implement duplicate detection:
- Calculate similarity score between new recipe and existing recipes
- Use Levenshtein distance for title matching (threshold: 0.85)
- Use Jaccard similarity for ingredient lists (threshold: 0.7)
- Combined score: titleScore * 0.3 + ingredientScore * 0.7
- Show "Potential duplicate found" dialog if score > 0.6
- Offer "Merge", "Save as variant", or "Save anyway" options

ALGORITHM:
function calculateSimilarity(recipe1: Recipe, recipe2: Recipe): number {
  const titleScore = 1 - (levenshteinDistance(recipe1.title, recipe2.title) / Math.max(recipe1.title.length, recipe2.title.length));
  const ingredientOverlap = jaccard(recipe1.ingredients, recipe2.ingredients);
  return titleScore * 0.3 + ingredientOverlap * 0.7;
}

TECH STACK:
TypeScript, React 19, fast-levenshtein library

OUTPUT:
- DuplicateDetector.tsx component
- Similarity calculation utilities
- UI for merge/variant decision
```

---

## 6. ✓ Feature: Menüplanung (Meal Planner)

```
CONTEXT:
Recipe app needs weekly meal planning with drag-and-drop calendar interface.

TASK:
Create meal planner with:
- Week view calendar (Monday-Sunday)
- 3 meal types per day: Breakfast, Lunch, Dinner
- Drag recipes from sidebar onto calendar slots
- Auto-generate shopping list from weekly plan
- Recurring meals support ("Every Friday: Pizza")
- Export as PDF or ICS calendar
- Nutritional balance visualization (optional)

DATA MODEL:
interface MealPlan {
  id: string;
  userId: string;
  weekStart: string; // ISO date
  meals: { day: string; type: "breakfast"|"lunch"|"dinner"; recipeId?: string; servings: number; notes?: string }[];
}

UI LIBRARIES:
- React Big Calendar or custom grid with CSS Grid
- React DnD for drag-and-drop

OUTPUT:
- MealPlanner.tsx component
- Calendar grid implementation
- Firestore integration
- Shopping list generation from plan
```

---

## 7. Feature: Smart Search & Discovery

```
CONTEXT:
Recipe app with 100+ recipes. Current search uses FlexSearch (keyword-based). Need AI-powered semantic search.

TASK:
Implement smart search:
- Natural language queries: "What can I make with potatoes and cheese?"
- Ingredient-based search: "I have: tomatoes, pasta, garlic"
- Contextual suggestions: Weather-based, seasonal, time-available
- "Similar recipes" using embedding vectors
- Visual search: Upload food photo, find similar recipes

APPROACH:
1. Use Gemini Flash AI to parse natural language query into structured filter
2. Generate embeddings for recipes (title + ingredients + instructions)
3. Store embeddings in Firestore or separate vector DB
4. Use cosine similarity for semantic matching

API ENDPOINT:
POST /api/recipes/smart-search
Body: { query: string, context?: { weather, season, timeAvailable } }
Response: { recipes: Recipe[], reasoning: string }

TECH STACK:
Gemini AI (free version, be budget with requests), Firebase Functions, React 19, TypeScript

OUTPUT:
- SmartSearchBar.tsx component
- Backend API endpoint
- Embedding generation logic
- Similarity search implementation
```

---

## 8. 𐠠 Feature: Nährwertinformationen

```
CONTEXT:
Recipe app needs automatic nutritional information calculation from ingredients list.

TASK:
Calculate nutrition facts:
- Estimate calories, protein, carbs, fat per serving
- Use OpenFoodFacts API or USDA FoodData Central
- Fallback to Gemini AI estimation if ingredient not in database
- Allow manual override
- Show macros as pie chart (Recharts)
- Allergen warnings (gluten, nuts, dairy, etc.)

DATA MODEL:
interface NutritionalInfo {
  recipeId: string;
  perServing: { calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number };
  source: "estimated" | "manual" | "database";
  allergens: string[];
}

API FLOW:
1. Parse ingredients[] into structured data
2. Query nutrition databases
3. Aggregate values and divide by servings
4. Store in Firestore

TECH STACK:
OpenFoodFacts API, Gemini AI, React 19, Recharts

OUTPUT:
- NutritionCalculator.ts service
- NutritionCard.tsx component
- Firestore schema
- API integration
```

---

## 9. Feature: Rezept-Varianten & Versionierung

```
CONTEXT:
Family recipe app where recipes evolve over time. Need version history and variant tracking.

TASK:
Implement recipe variants:
- "Fork this recipe" button creates variant linked to parent
- Store differences only (delta), not full copy
- Version history with diff view
- Rollback to previous version
- Variant linking: "See 3 variants of this recipe"
- Change log auto-generated from diffs

DATA MODEL:
interface RecipeVersion {
  id: string;
  recipeId: string;
  version: number;
  changes: Partial<Recipe>;
  changedBy: string;
  changeDate: string;
  changeDescription?: string;
}

interface RecipeVariant {
  id: string;
  parentRecipeId: string;
  ownerId: string;
  variantName: string; // "Noahs glutenfreie Version"
  differences: Partial<Recipe>;
}

TECH STACK:
Firestore, React 19, TypeScript, deep-object-diff library

OUTPUT:
- VersionHistory.tsx component
- VariantManager.tsx component
- Diff calculation logic
- Firestore rules for variants
```

---

## 10. Feature: Batch-Import-Verbesserungen

```
CONTEXT:
Current import processes images sequentially (one at a time). Need parallel processing and confidence scores.

TASK:
Optimize batch import:
- Process 3-5 images in parallel (Promise.all with chunking)
- Show live progress for each image (Processing → Extracting → Done)
- Add confidence score to Gemini AI response (0.0-1.0)
- Flag low-confidence recipes (< 0.7) for manual review
- Batch-edit UI: Apply same tags to multiple recipes at once
- Learn from corrections: Store user edits to improve future imports

IMPLEMENTATION:
- Chunk images into batches of 3
- Use Promise.allSettled to handle failures gracefully
- Add confidence field to Gemini schema
- Create ReviewQueue for low-confidence items

TECH STACK:
Gemini AI, React 19, TypeScript

OUTPUT:
- ParallelImportProcessor.ts
- BatchEditPanel.tsx component
- Confidence score integration
- Learning/feedback loop logic
```

---

## 11. 𐠠 Feature: Mobile Native App (React Native)

```
CONTEXT:
Existing React web app with Firebase backend. Need iOS/Android app with offline support.

TASK:
Create React Native app with:
- Expo managed workflow for faster development
- Offline-first architecture (AsyncStorage + Firestore offline persistence)
- Camera integration for quick recipe scanning
- Push notifications for timers and meal reminders
- Widget support (Today's meal plan on home screen)
- Deep linking from web app
- Handoff between web and mobile

SETUP:
1. Initialize Expo project: `npx create-expo-app heirloom-mobile`
2. Install: @react-native-firebase/app, @react-native-firebase/firestore, expo-camera
3. Configure app.json for iOS/Android
4. Set up navigation (React Navigation)

SHARED CODE:
- Reuse types.ts, utils, Firebase config
- Create shared component library

OUTPUT:
- Expo project structure
- Navigation setup
- Offline persistence layer
- Camera scanner integration
- Push notification setup
```

---

## 12. Feature: Inventory Management

```
CONTEXT:
Recipe app needs virtual pantry to track ingredients at home.

TASK:
Create inventory system:
- Add items with quantity, unit, expiration date
- Group by location (Fridge, Pantry, Freezer)
- Barcode scanner for quick add (Expo Barcode Scanner)
- Low stock warnings (threshold-based)
- "What can I cook with my inventory?" query
- Auto-update inventory when meal is cooked
- Expiration alerts (3 days before)

DATA MODEL:
interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate?: string;
  location: string;
  lowStockThreshold?: number;
}

SEARCH LOGIC:
- Query recipes where ingredients[] overlap with inventory
- Score by completeness percentage
- Sort by "recipes I can make completely"

TECH STACK:
Firestore, React 19, Expo Barcode Scanner (mobile), date-fns

OUTPUT:
- InventoryManager.tsx component
- Barcode scanning integration
- Recipe-matching algorithm
- Expiration alert system
```

---

## 13. Feature: Familien-Social-Features

```
CONTEXT:
Family recipe app needs collaborative features for multiple users.

TASK:
Add social features:
- Comments per recipe with @mentions
- Cooking log: "I cooked this on [date]" with photos
- Activity feed: "Grandma added Apfelkuchen"
- Real-time collaborative editing (Firestore real-time listeners)
- Reaction emojis on recipes (❤️ 🔥 👍)
- Recipe recommendations between family members

DATA MODEL:
interface Comment {
  id: string;
  recipeId: string;
  userId: string;
  text: string;
  mentions: string[]; // user IDs
  createdAt: string;
  replyTo?: string;
}

interface CookingLog {
  id: string;
  recipeId: string;
  userId: string;
  cookedDate: string;
  photos: string[];
  notes?: string;
  rating?: number;
}

FEATURES:
- @-mention autocomplete
- Push notifications for mentions
- Photo gallery for cooking logs

OUTPUT:
- CommentSection.tsx component
- CookingLogCard.tsx component
- ActivityFeed.tsx component
- Notification system
```

---

## 14. Feature: Advanced Analytics Dashboard

```
CONTEXT:
Recipe app has cooking logs, ratings, meal plans. Need insights dashboard.

TASK:
Create analytics dashboard:
- Most cooked recipes (top 10)
- Cooking frequency over time (line chart)
- Dietary balance (vegan vs. meat-based, pie chart)
- Seasonal trends (more soups in winter)
- Cost per recipe estimation
- CO2 footprint estimation (based on ingredients)
- "Recipes you haven't cooked yet" list

VISUALIZATIONS:
- Recharts for charts (Bar, Line, Pie)
- Date range selector (Last 7 days, Month, Year, All time)
- Export as PDF report

DATA AGGREGATION:
- Firebase Cloud Function for weekly aggregation
- Store aggregated data in separate analytics collection
- Query on-demand for custom date ranges

OUTPUT:
- AnalyticsDashboard.tsx component
- Recharts integration
- Aggregation Cloud Function
- PDF export of report
```

---

## 15. Feature: Recipe Scaling Intelligence

```
CONTEXT:
Recipes have servings: number and ingredients with quantities. Need smart scaling.

TASK:
Intelligent recipe scaling:
- Scale ingredients for any serving size (2 → 6 people)
- Handle non-linear scaling (e.g., baking times don't double)
- Ingredient substitution suggestions ("Out of butter? Use oil")
- Unit conversion (Cups → Grams, Tbsp → ml)
- "What if I only have 2 eggs?" solver

LOGIC:
1. Parse ingredient strings into structured data: { amount: number, unit: string, ingredient: string }
2. Apply scaling factor: newAmount = amount * (newServings / originalServings)
3. Adjust special cases (salt, spices: scale by 0.8x only)
4. Round to reasonable values (2.3 eggs → 2 eggs)

USE GEMINI AI FOR:
- Parsing unstructured ingredient strings
- Suggesting substitutions
- Adjusting cooking times

OUTPUT:
- RecipeScaler.tsx component
- Ingredient parser utility
- Scaling algorithm
- Substitution suggestion logic
```

---

## 16. 𐠠 Feature: Print-on-Demand Kochbuch

```
CONTEXT:
Recipe app with 50+ recipes. Need to generate professional print-ready cookbook.

TASK:
Create print cookbook generator:
- Select recipes for inclusion
- Custom cover design with title and family photo
- Professional layout (like InDesign output)
- Table of contents with page numbers
- Recipe categories as chapters
- High-quality images (if available)
- QR codes linking to digital recipes
- Export as print-ready PDF (300 DPI, CMYK)
- Optional: Integration with print services (Blurb, Lulu APIs)

LAYOUT:
- A4 or US Letter format
- Margins: 2cm all sides
- Two-column layout for ingredients
- Large readable font (12pt body, 18pt headings)
- Page numbers and chapter headers

TECH STACK:
jsPDF with custom layout, or Puppeteer for HTML-to-PDF

OUTPUT:
- CookbookGenerator.tsx component
- PDF layout templates
- Print service API integration
- QR code generation
```

---

## 17. ‼ Router-Integration (React Router v6)

```
CONTEXT:
React app currently single-page without routing. Need URL-based navigation.

TASK:
Add React Router v6:
- Routes: /, /recipes/:id, /import, /collections, /meal-plan, /settings
- Preserve filter state in URL query params (?category=dessert&dietary=vegan)
- Lazy load pages for performance (React.lazy + Suspense)
- Protected routes (redirect to login if not authenticated)
- 404 page
- Browser back/forward support

STRUCTURE:
<BrowserRouter>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/recipes/:id" element={<RecipeDetailPage />} />
    <Route path="/import" element={<ImportPage />} />
    <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
</BrowserRouter>

OUTPUT:
- Router setup in main.tsx
- Page components in pages/
- PrivateRoute component
- URL state management utilities
```

---

## 18. ！Testing-Setup (Vitest + React Testing Library)

```
CONTEXT:
React 19 + TypeScript app with no tests. Need comprehensive test setup.

TASK:
Set up testing infrastructure:
- Vitest as test runner (Vite-native)
- React Testing Library for component tests
- MSW (Mock Service Worker) for API mocking
- Firestore emulator for database tests
- Minimum 60% code coverage

SETUP:
1. Install: vitest, @testing-library/react, @testing-library/jest-dom, msw
2. Create vitest.config.ts with coverage settings
3. Add test scripts to package.json
4. Create __tests__ folders next to components
5. Set up MSW handlers for API mocks

EXAMPLE TEST:
// RecipeCard.test.tsx
import { render, screen } from '@testing-library/react';
import { RecipeCard } from './RecipeCard';

test('displays recipe title', () => {
  render(<RecipeCard recipe={{ title: 'Apfelkuchen', ... }} />);
  expect(screen.getByText('Apfelkuchen')).toBeInTheDocument();
});

OUTPUT:
- vitest.config.ts
- Test setup files
- Example component tests
- MSW handlers for APIs
- CI integration (.github/workflows/test.yml)
```

---

## 19. State Management mit Zustand

```
CONTEXT:
React app currently uses useState + Context. Scaling complexity requires dedicated state management.

TASK:
Migrate to Zustand:
- Create stores for: recipes, auth, filters, ui
- Replace Context providers with Zustand stores
- Add persistence for filter preferences (zustand/middleware)
- Implement devtools integration
- Keep TypeScript strict typing

EXAMPLE STORE:
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface RecipeStore {
  recipes: Recipe[];
  setRecipes: (recipes: Recipe[]) => void;
  addRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set) => ({
      recipes: [],
      setRecipes: (recipes) => set({ recipes }),
      addRecipe: (recipe) => set((state) => ({ recipes: [...state.recipes, recipe] })),
      deleteRecipe: (id) => set((state) => ({ recipes: state.recipes.filter(r => r.id !== id) })),
    }),
    { name: 'recipe-storage' }
  )
);

OUTPUT:
- Store files in stores/
- Migration guide from Context to Zustand
- Persistence configuration
- TypeScript types for stores
```

---

## 20. Dark Mode Implementation

```
CONTEXT:
Tailwind CSS app without dark mode. Need system-based theme switching.

TASK:
Add dark mode:
- Detect system preference (prefers-color-scheme: dark)
- Manual toggle in settings
- Persist preference in localStorage
- Update all components with dark: variants
- Optimize images for dark mode (slight brightness adjustment)
- Smooth transition animation

TAILWIND CONFIG:
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media' for system-only
  theme: {
    extend: {
      colors: {
        background: {
          light: '#ffffff',
          dark: '#1a1a1a',
        },
        // ...
      },
    },
  },
};

IMPLEMENTATION:
- ThemeProvider context
- useDarkMode() hook
- Toggle button in header
- Apply 'dark' class to <html>

OUTPUT:
- ThemeProvider.tsx
- useDarkMode.ts hook
- Updated Tailwind config
- Dark mode color palette
```

---

## Verwendungshinweise

**Für jedes Feature:**
1. Kopiere den jeweiligen Prompt in Google AI Studio / Gemini
2. Füge aktuellen Code-Kontext hinzu (relevante Dateien)
3. Iteriere bei Bedarf mit Follow-up-Fragen
4. Teste generierten Code vor Integration

**Best Practices:**
- Ein Feature pro Session
- Code-Review nach jedem Feature
- Tests vor Merge
- Dokumentation aktualisieren

**Priorität:**
Architektur-Refactoring → Quick Wins → Medium-Term Features → Long-Term Features
