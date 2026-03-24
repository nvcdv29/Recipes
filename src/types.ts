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

export interface AllowedUser {
  email: string;
  addedAt: string;
}

export interface Settings {
  allowGoogleLogin: boolean;
  allowEmailLogin: boolean;
  restrictToWhitelist: boolean;
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
