import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Settings, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestore';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  settings: Settings;
  isWhitelisted: boolean | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    allowGoogleLogin: false,
    allowEmailLogin: true,
    restrictToWhitelist: true,
    allowRegistration: true,
    allowMagicLink: true
  });

  useEffect(() => {
    // Settings listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as Settings);
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
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Family Member',
              email: u.email || '',
              photoURL: u.photoURL || '',
              role: 'user'
            };
            await setDoc(doc(db, 'users', u.uid), newProfile);
            setUserProfile(newProfile);
          }

          // Whitelist check
          const adminEmails = ["nl.leitschuh@gmail.com", "noah@leitschuh.de"];
          if (adminEmails.includes(u.email || '')) {
            setIsWhitelisted(true);
          } else {
            const docRef = doc(db, 'allowedUsers', u.email || '');
            const docSnap = await getDoc(docRef);
            setIsWhitelisted(docSnap.exists());
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setUserProfile(null);
        setIsWhitelisted(null);
      }
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubAuth();
    };
  }, []);

  const logout = () => {
    signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, settings, isWhitelisted, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
