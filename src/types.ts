export type Difficulty = 'einfach' | 'mittel' | 'schwer';

export interface Recipe {
  id?: string;
  title: string;
  authorId: string;
  authorName: string;
  images: string[];
  duration: string;
  servings: number;
  difficulty: Difficulty;
  categories: string[];
  dietary: string[];
  tags: string[];
  ingredients: string[];
  instructions: string[];
  notes?: string;
  sourceName?: string;
  sourceUrl?: string;
  createdAt: string;
  isPublic: boolean;
  averageRating?: number;
  ratingCount?: number;
  embedding?: number[];
}

export interface Rating {
  id?: string;
  recipeId: string;
  userId: string;
  score: number;
  createdAt: string;
}

export interface RecipeCollection {
  id?: string;
  userId: string;
  name: string;
  description: string;
  recipeIds: string[];
  isShared: boolean;
  icon: string;
  color: string;
  createdAt: string;
}

export interface MealSlot {
  id: string;
  day: string; // 'Montag', 'Dienstag', ...
  type: 'breakfast' | 'lunch' | 'dinner';
  recipeId?: string;
  servings: number;
  notes?: string;
}

export interface MealPlan {
  id?: string;
  userId: string;
  weekStart: string; // ISO date 'YYYY-MM-DD'
  meals: MealSlot[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'user';
  favorites?: string[];
}

export interface AllowedUser {
  email: string;
  addedAt: string;
}

export interface Settings {
  allowGoogleLogin: boolean;
  allowEmailLogin: boolean;
  restrictToWhitelist: boolean;
  allowRegistration: boolean;
  allowMagicLink: boolean;
}

export interface ShoppingListItem {
  ingredient: string;
  quantity: string;
  category: string;
  checked: boolean;
}

export interface ShoppingList {
  id?: string;
  name: string;
  userId: string;
  recipes: { recipeId: string; servings: number }[];
  items: ShoppingListItem[];
  createdAt: string;
}

export interface RecipeVersion {
  id?: string;
  recipeId: string;
  version: number;
  changes: Partial<Recipe>;
  changedBy: string;
  changeDate: string;
  changeDescription?: string;
}

export interface RecipeVariant {
  id?: string;
  parentRecipeId: string;
  ownerId: string;
  variantName: string; // "Noahs glutenfreie Version"
  differences: Partial<Recipe>;
  createdAt: string;
}

export interface Comment {
  id?: string;
  recipeId: string;
  userId: string;
  text: string;
  mentions: string[]; // user IDs
  createdAt: string;
  replyTo?: string;
}

export interface CookingLog {
  id?: string;
  recipeId: string;
  userId: string;
  cookedDate: string;
  photos: string[];
  notes?: string;
  rating?: number;
  createdAt: string;
}

export interface Activity {
  id?: string;
  userId: string;
  type: 'recipe_added' | 'cooking_log' | 'comment' | 'reaction' | 'recommendation';
  targetId: string;
  targetName?: string;
  createdAt: string;
  metadata?: any;
}

export interface Reaction {
  id?: string;
  recipeId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Recommendation {
  id?: string;
  recipeId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
