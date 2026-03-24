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
  createdAt: string;
  isPublic: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'user';
}
