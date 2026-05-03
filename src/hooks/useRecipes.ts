import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe, OperationType, Settings, UserProfile } from '../types';
import { handleFirestoreError } from '../services/firestore';

export function useRecipes(user: any, searchQuery: string) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    // Real-time listener for recipes
    const q = query(
      collection(db, 'recipes'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recipeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Recipe[];
      setRecipes(recipeList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recipes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { recipes, loading };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    allowGoogleLogin: false,
    allowEmailLogin: true,
    restrictToWhitelist: true,
    allowRegistration: true,
    allowMagicLink: true
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({
          allowGoogleLogin: false,
          allowEmailLogin: true,
          restrictToWhitelist: true,
          allowRegistration: true,
          allowMagicLink: true,
          ...docSnap.data()
        } as Settings);
      }
    });

    return () => unsubscribe();
  }, []);

  return { settings };
}

export function useUserProfile(user: any) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setIsWhitelisted(null);
      return;
    }

    // Fetch user profile
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      }
    });

    // Check whitelist
    const unsubWhitelist = onSnapshot(doc(db, 'allowedUsers', user.email || ''), (docSnap) => {
      setIsWhitelisted(docSnap.exists());
    });

    return () => {
      unsubProfile();
      unsubWhitelist();
    };
  }, [user]);

  return { userProfile, isWhitelisted };
}
