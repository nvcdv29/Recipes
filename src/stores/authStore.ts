import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { User, onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Settings, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestore';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  settings: Settings;
  isWhitelisted: boolean | null;
  loading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setSettings: (settings: Settings) => void;
  setIsWhitelisted: (isWhitelisted: boolean | null) => void;
  setLoading: (loading: boolean) => void;
  
  initializeAuth: () => () => void;
  logout: () => void;
  toggleFavorite: (recipeId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      userProfile: null,
      isWhitelisted: null,
      loading: true,
      settings: {
        allowGoogleLogin: false,
        allowEmailLogin: true,
        restrictToWhitelist: true,
        allowRegistration: true,
        allowMagicLink: true
      },

      setUser: (user) => set({ user }, false, 'setUser'),
      setUserProfile: (userProfile) => set({ userProfile }, false, 'setUserProfile'),
      setSettings: (settings) => set({ settings }, false, 'setSettings'),
      setIsWhitelisted: (isWhitelisted) => set({ isWhitelisted }, false, 'setIsWhitelisted'),
      setLoading: (loading) => set({ loading }, false, 'setLoading'),

      initializeAuth: () => {
        // Settings listener
        const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
          if (docSnap.exists()) {
            get().setSettings(docSnap.data() as Settings);
          }
        });

        // Magic Link handling
        if (isSignInWithEmailLink(auth, window.location.href)) {
          let email = window.localStorage.getItem('emailForSignIn');
          if (!email) {
            email = window.prompt('Bitte gib deine E-Mail zur Bestätigung ein');
          }
          if (email) {
            signInWithEmailLink(auth, email, window.location.href)
              .then(() => {
                window.localStorage.removeItem('emailForSignIn');
                toast.success("Erfolgreich mit Magic Link angemeldet!");
              })
              .catch((error) => {
                toast.error("Fehler beim Magic Link Login: " + error.message);
              });
          }
        }

        const unsubAuth = onAuthStateChanged(auth, async (u) => {
          get().setUser(u);
          if (u) {
            try {
              const userDocRef = doc(db, 'users', u.uid);
              
              // Subscribe to profile changes instantly
              onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                  get().setUserProfile(docSnap.data() as UserProfile);
                }
              });

              const userDoc = await getDoc(userDocRef);
              if (!userDoc.exists()) {
                const newProfile: UserProfile = {
                  uid: u.uid,
                  displayName: u.displayName || 'Family Member',
                  email: u.email || '',
                  photoURL: u.photoURL || '',
                  role: 'user',
                  favorites: []
                };
                await setDoc(userDocRef, newProfile);
                get().setUserProfile(newProfile);
              }

              // Whitelist check
              const adminEmails = ["nl.leitschuh@gmail.com", "noah@leitschuh.de"];
              if (adminEmails.includes(u.email || '')) {
                get().setIsWhitelisted(true);
              } else {
                const docAllowed = doc(db, 'allowedUsers', u.email || '');
                const docSnap = await getDoc(docAllowed);
                get().setIsWhitelisted(docSnap.exists());
              }
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
            }
          } else {
            get().setUserProfile(null);
            get().setIsWhitelisted(null);
          }
          get().setLoading(false);
        });

        return () => {
          unsubSettings();
          unsubAuth();
        };
      },

      logout: () => {
        signOut(auth);
      },

      toggleFavorite: async (recipeId: string) => {
        const { user, userProfile } = get();
        if (!user || !userProfile) return;
        const currentFavorites = userProfile.favorites || [];
        const isFavorite = currentFavorites.includes(recipeId);
        
        const newFavorites = isFavorite 
          ? currentFavorites.filter(id => id !== recipeId)
          : [...currentFavorites, recipeId];

        try {
          await updateDoc(doc(db, 'users', user.uid), {
            favorites: newFavorites
          });
          toast.success(isFavorite ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    }),
    { name: 'AuthStore' }
  )
);
