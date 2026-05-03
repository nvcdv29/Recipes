import { useState, useEffect, Component, ErrorInfo, ReactNode, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc,
  setDoc,
  getDocFromServer,
  getDocs,
  or
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Recipe, UserProfile, OperationType, FirestoreErrorInfo, AllowedUser, Settings, Rating, Difficulty } from './types';
import { Toaster, toast } from 'sonner';
import { 
  ChefHat, 
  Plus, 
  Search, 
  Filter, 
  LogOut, 
  User as UserIcon, 
  BookOpen, 
  Camera, 
  Printer, 
  Share2, 
  ChevronLeft,
  Clock,
  Users,
  BarChart,
  Trash2,
  Edit3,
  X,
  Check,
  Loader2,
  FileText,
  AlertTriangle,
  Settings as SettingsIcon,
  ShieldCheck,
  Mail,
  Lock,
  UserPlus,
  ShieldAlert,
  Star,
  Image as ImageIcon,
  Play,
  ChevronRight,
  CheckCircle2,
  Circle,
  Pause,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processImagesSequentially, importRecipeFromUrl } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import imageCompression from 'browser-image-compression';
import FlexSearch from 'flexsearch';
import { jsPDF } from 'jspdf';

// --- Error Handling ---

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Fehler bei ${operationType}: ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface">
          <AlertTriangle size={64} className="text-red-500 mb-6" />
          <h1 className="text-3xl font-serif font-bold mb-4">Etwas ist schiefgelaufen.</h1>
          <p className="text-on-surface-variant mb-8 max-w-md">
            Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.
          </p>
          <Button onClick={() => window.location.reload()}>Seite neu laden</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Components ---

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-outline-variant/10"
        >
          <h3 className="text-2xl font-serif font-bold mb-4">{title}</h3>
          <p className="text-on-surface-variant mb-8 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={onConfirm} className="flex-1">Löschen</Button>
            <Button variant="secondary" onClick={onClose} className="flex-1">Abbrechen</Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const Button = ({ children, onClick, className, variant = 'primary', disabled, icon: Icon, type = 'button' }: any) => {
  const variants: any = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
    secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
    outline: 'border border-outline-variant text-primary hover:bg-primary/5',
    ghost: 'text-primary hover:bg-primary/5',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100'
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'form' | 'scan' | 'admin' | 'cooking'>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Alle');
  const [filterDietary, setFilterDietary] = useState('Alle');
  const [filterDifficulty, setFilterDifficulty] = useState('Alle');
  const [filterDuration, setFilterDuration] = useState('');
  const [filterServings, setFilterServings] = useState('');
  const [settings, setSettings] = useState<Settings>({
    allowGoogleLogin: false,
    allowEmailLogin: true,
    restrictToWhitelist: true,
    allowRegistration: true,
    allowMagicLink: true
  });
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  // Handle PWA Share Target
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    const text = params.get('text');
    const url = params.get('url');
    
    const combined = `${title || ''} ${text || ''} ${url || ''}`;
    const urlMatch = combined.match(/https?:\/\/[^\s]+/);
    
    if (urlMatch) {
      setSharedUrl(urlMatch[0]);
      setView('scan');
      // Clean up URL to prevent re-triggering on refresh
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  // Search Index
  const index = useMemo(() => {
    const idx = new FlexSearch.Document({
      document: {
        id: "id",
        index: ["title", "ingredients", "notes", "tags"],
        store: true
      },
      tokenize: "forward"
    });
    recipes.forEach(r => idx.add(r as any));
    return idx;
  }, [recipes]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return null;
    const results = index.search(searchQuery, { enrich: true });
    return results.flatMap(r => r.result.map(res => (res as any).doc)) as Recipe[];
  }, [searchQuery, index]);

  // Settings & Whitelist Listener
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as Settings);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (user && settings.restrictToWhitelist) {
      const checkWhitelist = async () => {
        const adminEmails = ["nl.leitschuh@gmail.com", "noah@leitschuh.de"];
        if (adminEmails.includes(user.email || '')) {
          setIsWhitelisted(true);
          return;
        }
        try {
          const docRef = doc(db, 'allowedUsers', user.email || '');
          const docSnap = await getDoc(docRef);
          setIsWhitelisted(docSnap.exists());
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `allowedUsers/${user.email}`);
        }
      };
      checkWhitelist();
    } else if (user) {
      setIsWhitelisted(true);
    } else {
      setIsWhitelisted(null);
    }
  }, [user, settings.restrictToWhitelist]);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          toast.error("Verbindung zu Firestore fehlgeschlagen.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    // Handle Magic Link Sign-in
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

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
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
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Recipes Listener
  useEffect(() => {
    if (!user || isWhitelisted === false) {
      setRecipes([]);
      return;
    }

    const q = query(
      collection(db, 'recipes'),
      or(where('isPublic', '==', true), where('authorId', '==', user.uid)),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
      setRecipes(rList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recipes');
    });

    return unsubscribe;
  }, [user, isWhitelisted]);

  const handleLogin = async (email?: string, password?: string) => {
    try {
      if (email && password) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Willkommen zurück!");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Login fehlgeschlagen: " + (error.code === 'auth/user-not-found' ? 'Benutzer nicht gefunden' : error.message));
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("E-Mail zum Zurücksetzen des Passworts wurde gesendet!");
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    }
  };

  const handleMagicLink = async (email: string) => {
    if (!settings.allowMagicLink) {
      toast.error("Magic Link ist derzeit deaktiviert.");
      return;
    }
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      toast.success("Magic Link wurde an deine E-Mail gesendet!");
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    }
  };

  const handleRegister = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success("Konto erstellt! Wenn Whitelisting aktiv ist, wirst du blockiert, bis Noah dich freischaltet.");
    } catch (error: any) {
      toast.error("Registrierung fehlgeschlagen: " + error.message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setView('list');
  };

  const handleDeleteRecipe = async () => {
    if (!recipeToDelete) return;
    try {
      await deleteDoc(doc(db, 'recipes', recipeToDelete));
      toast.success('Rezept gelöscht');
      setView('list');
      setSelectedRecipe(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `recipes/${recipeToDelete}`);
    } finally {
      setIsConfirmOpen(false);
      setRecipeToDelete(null);
    }
  };

  const filteredRecipes = useMemo(() => {
    const baseList = searchResults || recipes;
    return baseList.filter(r => {
      const matchesCategory = filterCategory === 'Alle' || (r.categories && r.categories.includes(filterCategory));
      const matchesDietary = filterDietary === 'Alle' || (r.dietary && r.dietary.includes(filterDietary));
      const matchesDifficulty = filterDifficulty === 'Alle' || r.difficulty === filterDifficulty;
      const matchesDuration = !filterDuration || r.duration?.toLowerCase().includes(filterDuration.toLowerCase());
      const matchesServings = !filterServings || r.servings === parseInt(filterServings);
      const isVisible = r.isPublic || r.authorId === user?.uid;
      return matchesCategory && matchesDietary && matchesDifficulty && matchesDuration && matchesServings && isVisible;
    });
  }, [recipes, searchResults, filterCategory, filterDietary, filterDifficulty, filterDuration, filterServings, user]);

  const categories = ['Alle', ...Array.from(new Set(recipes.flatMap(r => r.categories || [])))];
  const dietaryOptions = ['Alle', ...Array.from(new Set(recipes.flatMap(r => r.dietary || [])))];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!user || (settings.restrictToWhitelist && isWhitelisted === false)) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onForgotPassword={handleForgotPassword}
        onMagicLink={handleMagicLink}
        settings={settings} 
        isBlocked={isWhitelisted === false}
        onReset={() => {
          signOut(auth);
          setIsWhitelisted(null);
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary/20">
        <Toaster position="top-center" richColors />
        
        <ConfirmModal 
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleDeleteRecipe}
          title="Rezept löschen"
          message="Bist du sicher, dass du dieses Rezept unwiderruflich löschen möchtest?"
        />

        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => { setView('list'); setSelectedRecipe(null); }}
            >
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white group-hover:rotate-12 transition-transform">
                <ChefHat size={24} />
              </div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-primary">Heirloom</h1>
            </div>

            <div className="flex items-center gap-4">
              {(userProfile?.role === 'admin' || user?.email === 'nl.leitschuh@gmail.com' || user?.email === 'noah@leitschuh.de') && (
                <button 
                  onClick={() => setView('admin')}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    view === 'admin' ? "bg-primary/10 text-primary" : "hover:bg-surface-container-high text-on-surface-variant"
                  )}
                >
                  <SettingsIcon size={20} />
                </button>
              )}
              <Button 
                variant="secondary" 
                className="hidden sm:flex"
                onClick={() => setView('scan')}
                icon={Camera}
              >
                Scan
              </Button>
              <Button 
                onClick={() => { setSelectedRecipe(null); setView('form'); }}
                icon={Plus}
              >
                Neu
              </Button>
              <div className="h-8 w-px bg-outline-variant/20 mx-2 hidden sm:block" />
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
                title="Abmelden"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            {view === 'list' && (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex flex-col md:flex-row gap-6 mb-6 items-center justify-between">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                    <input 
                      type="text" 
                      placeholder="Rezepte oder Zutaten suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={cn(
                          "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                          filterCategory === cat 
                            ? "bg-primary text-white shadow-md" 
                            : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4 mb-12">
                  <div className="flex flex-wrap gap-4">
                    <select
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      className="px-4 py-2 bg-surface-container-low text-sm rounded-xl outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-on-surface-variant cursor-pointer"
                    >
                      <option value="Alle">Alle Schwierigkeiten</option>
                      <option value="einfach">Einfach</option>
                      <option value="mittel">Mittel</option>
                      <option value="schwer">Schwer</option>
                    </select>
                    <select
                      value={filterDietary}
                      onChange={(e) => setFilterDietary(e.target.value)}
                      className="px-4 py-2 bg-surface-container-low text-sm rounded-xl outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-on-surface-variant cursor-pointer"
                    >
                      <option value="Alle">Alle Ernährungsarten</option>
                      {dietaryOptions.filter(d => d !== 'Alle').map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Dauer (z.B. 30 Min)"
                      value={filterDuration}
                      onChange={(e) => setFilterDuration(e.target.value)}
                      className="px-4 py-2 bg-surface-container-low text-sm rounded-xl outline-none focus:ring-2 focus:ring-primary/20 w-40 text-on-surface-variant"
                    />
                    <input
                      type="number"
                      placeholder="Portionen"
                      value={filterServings}
                      onChange={(e) => setFilterServings(e.target.value)}
                      className="px-4 py-2 bg-surface-container-low text-sm rounded-xl outline-none focus:ring-2 focus:ring-primary/20 w-32 text-on-surface-variant"
                    />
                  </div>
                </div>

                {filteredRecipes.length === 0 ? (
                  <div className="text-center py-24">
                    <BookOpen size={64} className="mx-auto text-outline-variant mb-4 opacity-20" />
                    <h3 className="text-xl font-medium text-on-surface-variant">Keine Rezepte gefunden</h3>
                    <p className="text-on-surface-variant/60 mt-2">Starte deine Sammlung mit einem neuen Rezept!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredRecipes.map((recipe) => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        onClick={() => { setSelectedRecipe(recipe); setView('detail'); }} 
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {view === 'detail' && selectedRecipe && (
              <RecipeDetail 
                recipe={selectedRecipe} 
                onBack={() => setView('list')} 
                onEdit={() => setView('form')}
                onDelete={() => {
                  setRecipeToDelete(selectedRecipe.id!);
                  setIsConfirmOpen(true);
                }}
                onCook={() => setView('cooking')}
                currentUser={user}
              />
            )}

            {view === 'cooking' && selectedRecipe && (
              <CookingMode 
                recipe={selectedRecipe}
                onClose={() => setView('detail')}
              />
            )}

            {view === 'form' && (
              <RecipeForm 
                recipe={selectedRecipe} 
                onCancel={() => setView(selectedRecipe ? 'detail' : 'list')} 
                onSave={() => setView('list')}
                user={user}
              />
            )}

            {view === 'scan' && (
              <AIScanner 
                initialUrl={sharedUrl}
                onCancel={() => {
                  setView('list');
                  setSharedUrl(null);
                }} 
                onScanComplete={async (data: any, isBulk: boolean = false) => {
                  if (isBulk) {
                    try {
                      for (const recipe of data) {
                        const recipeData = {
                          ...recipe,
                          authorId: user?.uid,
                          authorName: user?.displayName || 'Family Member',
                          createdAt: new Date().toISOString(),
                          isPublic: true,
                        };
                        
                        // Sanitize for Firestore Rules
                        if (!recipeData.title) recipeData.title = 'Neues Rezept';
                        if (!recipeData.ingredients || recipeData.ingredients.length === 0) recipeData.ingredients = ['Zutat fehlt'];
                        if (!recipeData.instructions || recipeData.instructions.length === 0) recipeData.instructions = ['Schritt fehlt'];
                        
                        if (typeof recipeData.servings !== 'number') {
                          recipeData.servings = parseInt(recipeData.servings as any) || 4;
                        }
                        
                        const validDifficulties = ['einfach', 'mittel', 'schwer'];
                        if (!validDifficulties.includes(recipeData.difficulty as string)) {
                          recipeData.difficulty = 'mittel';
                        }

                        // Remove null/undefined fields
                        Object.keys(recipeData).forEach(key => {
                          if (recipeData[key as keyof typeof recipeData] == null) {
                            delete recipeData[key as keyof typeof recipeData];
                          }
                        });

                        // Ensure strings
                        if (recipeData.duration != null) recipeData.duration = String(recipeData.duration).substring(0, 49);
                        if (recipeData.notes != null) recipeData.notes = String(recipeData.notes).substring(0, 9999);
                        if (recipeData.authorName != null) recipeData.authorName = String(recipeData.authorName).substring(0, 99);
                        
                        // Ensure arrays
                        if (!Array.isArray(recipeData.categories)) recipeData.categories = [];
                        if (!Array.isArray(recipeData.dietary)) recipeData.dietary = [];
                        if (!Array.isArray(recipeData.tags)) recipeData.tags = [];
                        
                        // Limit to max 3 images to prevent Firestore 1MB limit
                        if (recipeData.images && recipeData.images.length > 0) {
                          recipeData.images = recipeData.images.slice(0, 3);
                        }

                        delete recipeData.id;

                        await addDoc(collection(db, 'recipes'), recipeData);
                      }
                      toast.success(`${data.length} Rezepte erfolgreich gespeichert!`);
                      setView('list');
                    } catch (error) {
                      handleFirestoreError(error, OperationType.CREATE, 'recipes');
                    }
                  } else {
                    setSelectedRecipe(data);
                    setView('form');
                  }
                  setSharedUrl(null);
                }}
              />
            )}

            {view === 'admin' && (userProfile?.role === 'admin' || user?.email === 'nl.leitschuh@gmail.com' || user?.email === 'noah@leitschuh.de') && (
              <AdminView onBack={() => setView('list')} />
            )}
          </AnimatePresence>
        </main>
        
        {/* Mobile Scan Button */}
        {view === 'list' && (
          <button 
            onClick={() => setView('scan')}
            className="fixed bottom-8 right-8 sm:hidden w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40 print:hidden"
          >
            <Camera size={24} />
          </button>
        )}
      </div>
    </ErrorBoundary>
  );
}

// --- Sub-Components ---

const LoginScreen = ({ onLogin, onForgotPassword, onMagicLink, settings, isBlocked, onReset }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (showForgotPassword) {
        await onForgotPassword(email);
        setShowForgotPassword(false);
      } else if (isRegister) {
        if (!settings.allowRegistration) {
          toast.error("Registrierung ist derzeit deaktiviert.");
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Konto erstellt!");
      } else {
        await onLogin(email, password);
      }
    } catch (error: any) {
      toast.error(error.message || "Aktion fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-[2.5rem] shadow-2xl border border-red-100"
        >
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-8">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-3xl font-serif font-bold text-red-600 mb-4">Zugriff verweigert</h1>
          <p className="text-on-surface-variant mb-10 leading-relaxed">
            Deine E-Mail-Adresse ist nicht auf der Whitelist. Bitte kontaktiere den Administrator (Noah), um Zugriff zu erhalten.
          </p>
          <Button onClick={onReset} variant="secondary" className="w-full">Zurück zum Login</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-outline-variant/10"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-8">
          <ChefHat size={40} />
        </div>
        <h1 className="text-4xl font-serif font-bold text-primary mb-4">Heirloom</h1>
        <p className="text-on-surface-variant mb-10 leading-relaxed">
          {showForgotPassword ? 'Passwort zurücksetzen' : 'Deine private Familiensammlung für Rezepte und Erinnerungen.'}
        </p>

        <div className="space-y-4">
          {settings.allowGoogleLogin && !showForgotPassword && (
            <Button onClick={onLogin} className="w-full py-4 text-lg" icon={UserIcon}>
              Mit Google anmelden
            </Button>
          )}

          {settings.allowGoogleLogin && settings.allowEmailLogin && !showForgotPassword && (
            <div className="flex items-center gap-4 my-6">
              <div className="h-px flex-1 bg-outline-variant/20" />
              <span className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">Oder</span>
              <div className="h-px flex-1 bg-outline-variant/20" />
            </div>
          )}

          {settings.allowEmailLogin && (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">E-Mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="deine@email.de"
                  />
                </div>
              </div>
              
              {!showForgotPassword && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Passwort</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full py-4 text-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : (showForgotPassword ? <Mail /> : (isRegister ? <UserPlus /> : <Lock />))}
                {showForgotPassword ? 'Link senden' : (isRegister ? 'Konto erstellen' : 'Anmelden')}
              </Button>

              {!showForgotPassword && (
                <div className="flex flex-col gap-2 mt-4">
                  {settings.allowMagicLink && (
                    <button 
                      type="button"
                      onClick={() => onMagicLink(email)}
                      className="text-sm text-primary font-medium hover:underline flex items-center justify-center gap-2"
                    >
                      <Mail size={14} /> Magic Link senden
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-on-surface-variant/60 hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                  {settings.allowRegistration && (
                    <button 
                      type="button"
                      onClick={() => setIsRegister(!isRegister)}
                      className="text-sm text-primary font-medium hover:underline mt-2"
                    >
                      {isRegister ? 'Bereits ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
                    </button>
                  )}
                </div>
              )}

              {showForgotPassword && (
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-sm text-primary font-medium hover:underline mt-4"
                >
                  Zurück zum Login
                </button>
              )}
            </form>
          )}
        </div>

        <p className="mt-8 text-xs text-on-surface-variant/40 uppercase tracking-widest font-semibold">
          {settings.restrictToWhitelist ? 'Nur für autorisierte Mitglieder' : 'Willkommen in der Familie'}
        </p>
      </motion.div>
    </div>
  );
};

const RatingStars = ({ rating, count, size = 16, interactive = false, onRate }: any) => {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHover(star)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onRate && onRate(star)}
            className={cn(
              "transition-all",
              interactive ? "hover:scale-125 cursor-pointer" : "cursor-default"
            )}
          >
            <Star
              size={size}
              className={cn(
                "transition-colors",
                (hover || rating) >= star
                  ? "fill-amber-400 text-amber-400"
                  : "text-outline-variant/40"
              )}
            />
          </button>
        ))}
      </div>
      {count !== undefined && (
        <span className="text-xs font-bold text-on-surface-variant/40">
          ({count})
        </span>
      )}
    </div>
  );
};

const RecipeCard = ({ recipe, onClick }: { recipe: Recipe, onClick: () => void }) => (
  <motion.div 
    layout
    whileHover={{ y: -8 }}
    onClick={onClick}
    className="bg-white rounded-[2rem] overflow-hidden cursor-pointer group border border-outline-variant/5 hover:shadow-2xl hover:shadow-primary/5 transition-all"
  >
    <div className="aspect-[4/3] relative overflow-hidden">
      <img 
        src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/800/600`} 
        alt={recipe.title}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
        <div className="flex flex-wrap justify-end gap-2">
          {recipe.dietary?.slice(0, 2).map(d => (
            <span key={d} className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm">
              {d}
            </span>
          ))}
        </div>
        {recipe.averageRating && (
          <div className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full flex items-center gap-1.5 shadow-sm">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold text-primary">{recipe.averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary/60 uppercase tracking-wider">
          {recipe.categories && recipe.categories.length > 0 && (
            <>
              <span>{recipe.categories[0]}</span>
              <span className="w-1 h-1 bg-primary/20 rounded-full" />
            </>
          )}
          <span>{recipe.difficulty}</span>
        </div>
        {recipe.averageRating && (
          <RatingStars rating={recipe.averageRating} count={recipe.ratingCount} size={12} />
        )}
      </div>
      <h3 className="text-xl font-serif font-bold text-on-surface group-hover:text-primary transition-colors mb-2 line-clamp-1">
        {recipe.title}
      </h3>
      {(recipe.sourceName || recipe.sourceUrl) && (
        <div className="mb-4 text-xs text-on-surface-variant/70 flex items-center gap-1.5">
          <BookOpen size={12} />
          {recipe.sourceUrl ? (
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline" onClick={e => e.stopPropagation()}>
              {recipe.sourceName || recipe.sourceUrl}
            </a>
          ) : (
            <span>{recipe.sourceName}</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between text-on-surface-variant/60 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock size={16} />
            <span>{recipe.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={16} />
            <span>{recipe.servings}</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
          <ChevronLeft size={16} className="rotate-180" />
        </div>
      </div>
    </div>
  </motion.div>
);

const RecipeDetail = ({ recipe, onBack, onEdit, onDelete, onCook, currentUser }: any) => {
  const [userRating, setUserRating] = useState<number | null>(null);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfIncludeImage, setPdfIncludeImage] = useState(false);
  const [pdfIncludeRating, setPdfIncludeRating] = useState(false);

  useEffect(() => {
    if (currentUser && recipe.id) {
      const q = query(
        collection(db, 'ratings'),
        where('recipeId', '==', recipe.id),
        where('userId', '==', currentUser.uid)
      );
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setUserRating(snap.docs[0].data().score);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'ratings');
      });
      return unsub;
    }
  }, [currentUser, recipe.id]);

  const handleRate = async (score: number) => {
    if (!currentUser || !recipe.id) return;

    try {
      const q = query(
        collection(db, 'ratings'),
        where('recipeId', '==', recipe.id),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        await updateDoc(doc(db, 'ratings', snap.docs[0].id), { score, createdAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'ratings'), {
          recipeId: recipe.id,
          userId: currentUser.uid,
          score,
          createdAt: new Date().toISOString()
        });
      }

      // Recalculate average
      const allRatingsSnap = await getDocs(query(collection(db, 'ratings'), where('recipeId', '==', recipe.id)));
      const allRatings = allRatingsSnap.docs.map(d => d.data() as Rating);
      const count = allRatings.length;
      const average = allRatings.reduce((acc, curr) => acc + curr.score, 0) / count;

      await updateDoc(doc(db, 'recipes', recipe.id), {
        averageRating: average,
        ratingCount: count
      });

      toast.success("Bewertung gespeichert!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ratings');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    
    // Title
    doc.setFontSize(24);
    doc.text(recipe.title, 20, y);
    y += 10;
    
    // Meta
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Von ${recipe.authorName} • ${recipe.duration} • ${recipe.difficulty} • ${recipe.servings} Portionen`, 20, y);
    y += 15;

    // Image (Optional)
    if (pdfIncludeImage && recipe.images?.[0]) {
      try {
        const imgData = recipe.images[0];
        if (imgData.startsWith('data:image')) {
          // Extract format from data URI (e.g., data:image/png;base64,...)
          const formatMatch = imgData.match(/data:image\/([a-zA-Z0-9]+);base64,/);
          const format = formatMatch ? formatMatch[1].toUpperCase() : 'JPEG';
          doc.addImage(imgData, format, 20, y, 170, 100);
          y += 110;
        }
      } catch (e) {
        console.error("Could not add image to PDF", e);
      }
    }

    // Rating (Optional)
    if (pdfIncludeRating && recipe.averageRating) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Bewertung: ${recipe.averageRating.toFixed(1)} / 5 (${recipe.ratingCount} Stimmen)`, 20, y);
      y += 10;
    }

    // Ingredients
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Zutaten", 20, y);
    y += 10;
    doc.setFontSize(12);
    recipe.ingredients.forEach((ing: string) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`• ${ing}`, 25, y);
      y += 7;
    });
    y += 5;

    // Instructions
    doc.setFontSize(16);
    doc.text("Zubereitung", 20, y);
    y += 10;
    doc.setFontSize(12);
    
    recipe.instructions.forEach((inst: string, i: number) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${inst}`, 170);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 25, y);
        y += 7;
      });
      y += 3;
    });

    if (recipe.notes) {
      y += 5;
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(16);
      doc.text("Notizen", 20, y);
      y += 10;
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(recipe.notes, 170);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 25, y);
        y += 7;
      });
    }

    doc.save(`${recipe.title}.pdf`);
    setShowPdfOptions(false);
  };

  const shareRecipe = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe.title,
        text: `Schau dir dieses Rezept an: ${recipe.title}`,
        url: window.location.href
      });
    } else {
      toast.info("Link kopiert!");
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Rezept: ${recipe.title}`);
    const body = encodeURIComponent(
      `Schau dir dieses Rezept an: ${recipe.title}\n\n` +
      `Dauer: ${recipe.duration}\n` +
      `Schwierigkeit: ${recipe.difficulty}\n` +
      `Portionen: ${recipe.servings}\n\n` +
      `Zutaten:\n${recipe.ingredients.map((ing: string) => `• ${ing}`).join('\n')}\n\n` +
      `Zubereitung:\n${recipe.instructions.map((inst: string, i: number) => `${i + 1}. ${inst}`).join('\n')}\n\n` +
      (recipe.notes ? `Notizen:\n${recipe.notes}\n\n` : '') +
      `Link: ${window.location.href}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-medium">
          <ChevronLeft size={20} />
          <span>Zurück zur Übersicht</span>
        </button>
        <div className="flex gap-2 relative">
          <button onClick={onCook} className="p-3 bg-primary text-white hover:bg-primary/90 rounded-full transition-colors flex items-center gap-2 px-5 font-medium mr-2" title="Kochen starten">
            <Play size={20} className="fill-white" />
            <span className="hidden sm:inline">Kochen</span>
          </button>
          <button onClick={() => setShowPdfOptions(!showPdfOptions)} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Drucken / PDF">
            <Printer size={20} />
          </button>
          
          {showPdfOptions && (
            <div className="absolute top-14 right-12 w-64 bg-white rounded-2xl shadow-xl border border-outline-variant/10 p-4 z-50">
              <h4 className="font-bold mb-4">PDF Export</h4>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pdfIncludeImage} 
                  onChange={e => setPdfIncludeImage(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Mit Bild exportieren</span>
              </label>
              <label className="flex items-center gap-3 mb-6 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pdfIncludeRating} 
                  onChange={e => setPdfIncludeRating(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Mit Bewertung exportieren</span>
              </label>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowPdfOptions(false)} className="flex-1 py-2 text-sm">Abbrechen</Button>
                <Button onClick={exportPDF} className="flex-1 py-2 text-sm">Exportieren</Button>
              </div>
            </div>
          )}

          <button onClick={shareRecipe} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Teilen">
            <Share2 size={20} />
          </button>
          <button onClick={shareViaEmail} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Per E-Mail teilen">
            <Mail size={20} />
          </button>
          {(currentUser?.uid === recipe.authorId) && (
            <>
              <button onClick={onEdit} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Bearbeiten">
                <Edit3 size={20} />
              </button>
              <button onClick={onDelete} className="p-3 hover:bg-red-50 rounded-full transition-colors text-red-500" title="Löschen">
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <div id="recipe-content" className="bg-white rounded-[3rem] overflow-hidden shadow-xl border border-outline-variant/5 print:shadow-none print:border-none print:rounded-none">
        <div className="aspect-[21/9] w-full relative">
          <img 
            src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/1200/600`} 
            alt={recipe.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-10 left-10 right-10">
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.categories.map(c => (
                <span key={c} className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-widest border border-white/20">
                  {c}
                </span>
              ))}
              {recipe.dietary?.map(d => (
                <span key={d} className="px-4 py-1.5 bg-primary/80 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-widest border border-primary/20">
                  {d}
                </span>
              ))}
            </div>
            <h1 className="text-5xl font-serif font-bold text-white tracking-tight mb-2">{recipe.title}</h1>
            {(recipe.sourceName || recipe.sourceUrl) && (
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <BookOpen size={16} />
                {recipe.sourceUrl ? (
                  <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition-colors">
                    {recipe.sourceName || recipe.sourceUrl}
                  </a>
                ) : (
                  <span>{recipe.sourceName}</span>
                )}
              </div>
            )}
            {recipe.averageRating && (
              <div className="mt-4">
                <RatingStars rating={recipe.averageRating} count={recipe.ratingCount} size={20} />
              </div>
            )}
          </div>
        </div>

        <div className="p-10 lg:p-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 p-8 bg-surface-container-low rounded-[2rem]">
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/40">Deine Bewertung</h4>
              <RatingStars 
                rating={userRating || 0} 
                interactive={true} 
                onRate={handleRate} 
                size={24} 
              />
            </div>
            <div className="h-px md:w-px md:h-12 bg-outline-variant/20" />
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col items-center text-center gap-2">
                <Clock className="text-primary" size={24} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40">Dauer</span>
                <span className="font-serif font-bold text-lg">{recipe.duration}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Users className="text-primary" size={24} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40">Portionen</span>
                <span className="font-serif font-bold text-lg">{recipe.servings}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <BarChart className="text-primary" size={24} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40">Schwierigkeit</span>
                <span className="font-serif font-bold text-lg capitalize">{recipe.difficulty}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <UserIcon className="text-primary" size={24} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40">Von</span>
                <span className="font-serif font-bold text-lg">{recipe.authorName}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4">
              <h2 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3">
                Zutaten
                <div className="h-px flex-1 bg-outline-variant/20" />
              </h2>
              <ul className="space-y-4">
                {recipe.ingredients.map((ing: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 group cursor-pointer">
                    <div className="mt-1.5 w-4 h-4 rounded-full border-2 border-primary/20 group-hover:border-primary transition-colors flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-on-surface-variant leading-relaxed">{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-8">
              <h2 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3">
                Zubereitung
                <div className="h-px flex-1 bg-outline-variant/20" />
              </h2>
              <div className="space-y-10">
                {recipe.instructions.map((step: string, i: number) => (
                  <div key={i} className="flex gap-6">
                    <span className="text-4xl font-serif font-bold text-primary/10 select-none">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <p className="text-lg text-on-surface-variant leading-relaxed pt-1">
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              {recipe.notes && (
                <div className="mt-16 p-8 bg-primary/5 rounded-[2rem] border border-primary/10">
                  <h3 className="text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2">
                    <BookOpen size={20} />
                    Notizen & Tipps
                  </h3>
                  <div className="prose prose-primary max-w-none text-on-surface-variant">
                    <ReactMarkdown>{recipe.notes}</ReactMarkdown>
                  </div>
                </div>
              )}

              {recipe.tags && recipe.tags.length > 0 && (
                <div className="mt-12 flex flex-wrap gap-2">
                  {recipe.tags.map((tag: string) => (
                    <span key={tag} className="px-4 py-2 bg-surface-container-low rounded-full text-sm font-medium text-on-surface-variant border border-outline-variant/10">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CookingMode = ({ recipe, onClose }: any) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(console.warn);
      }
    };
  }, []);

  const totalSteps = recipe.instructions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentText = recipe.instructions[currentStep];

  // Extraction of timer
  const extractTime = (text: string) => {
    const match = text.match(/(\d+)\s*(minuten|minute|min|m|stunden|stunde|h)\b/i);
    if (match) {
      const val = parseInt(match[1]);
      if (match[2].toLowerCase().startsWith('h') || match[2].toLowerCase().startsWith('stunde')) {
        return val * 60; // to minutes
      }
      return val;
    }
    return null;
  };

  const detectedMinutes = extractTime(currentText);

  // Timer State
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    setTimerLeft(null);
    setTimerRunning(false);
  }, [currentStep]);

  useEffect(() => {
    let interval: any;
    if (timerRunning && timerLeft !== null && timerLeft > 0) {
      interval = setInterval(() => {
        setTimerLeft(t => (t !== null ? t - 1 : null));
      }, 1000);
    } else if (timerLeft === 0) {
      setTimerRunning(false);
      // Try to play a sound or use vibrate
      try {
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
      } catch (e) {}
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerLeft]);

  const toggleIngredient = (index: number) => {
    const newSet = new Set(checkedIngredients);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setCheckedIngredients(newSet);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[100] bg-surface flex flex-col overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-outline-variant/10 shadow-sm z-10 shrink-0">
        <h2 className="text-xl font-serif font-bold text-on-surface line-clamp-1 flex-1">
          {recipe.title}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-on-surface-variant">
            Schritt {currentStep + 1} von {totalSteps}
          </span>
          <button 
            onClick={onClose}
            className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      <div className="w-full h-1.5 bg-surface-container-low shrink-0 relative">
        <motion.div 
          className="absolute inset-y-0 left-0 bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeInOut" }}
        />
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Ingredients Panel */}
        <div className="w-full md:w-80 lg:w-96 bg-surface-container-low border-r border-outline-variant/10 flex flex-col shrink-0">
          <div className="p-6 overflow-y-auto flex-1">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-on-surface">
              <CheckCircle2 size={20} className="text-primary" />
              Zutaten
            </h3>
            <ul className="space-y-4 text-left">
              {recipe.ingredients.map((ing: string, i: number) => {
                const checked = checkedIngredients.has(i);
                return (
                  <li 
                    key={i} 
                    className={cn(
                      "flex items-start gap-3 cursor-pointer p-3 rounded-xl transition-all",
                      checked ? "bg-surface text-on-surface-variant/50 line-through" : "hover:bg-surface"
                    )}
                    onClick={() => toggleIngredient(i)}
                  >
                    <div className="mt-1 shrink-0">
                      {checked ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-outline-variant" />}
                    </div>
                    <span className="text-base leading-snug">{ing}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Instruction Panel */}
        <div className="flex-1 bg-white p-8 md:p-16 flex flex-col relative overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-center">
            
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-12"
            >
              <div className="flex items-start gap-4 md:gap-8 mb-8">
                <span className="text-6xl md:text-8xl font-serif font-bold text-primary/10 select-none leading-none">
                  {(currentStep + 1).toString().padStart(2, '0')}
                </span>
                <p className="text-2xl md:text-4xl text-on-surface font-serif font-bold leading-relaxed pt-2 md:pt-4 text-left">
                  {currentText}
                </p>
              </div>

              {/* Timer UI */}
              {(detectedMinutes !== null || timerLeft !== null) && (
                <div className="mt-8 flex flex-col items-start gap-4 p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                      <Timer size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">
                        {timerLeft !== null 
                          ? `${Math.floor(timerLeft / 60)}:${(timerLeft % 60).toString().padStart(2, '0')}` 
                          : `${detectedMinutes} Minuten`}
                      </h4>
                      <p className="text-sm text-on-surface-variant font-medium">Timer für diesen Schritt</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    {timerLeft === null ? (
                      <button 
                        onClick={() => {
                          setTimerLeft(detectedMinutes! * 60);
                          setTimerRunning(true);
                        }}
                        className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
                      >
                        <Play size={20} className="fill-white" />
                        Starten
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => setTimerRunning(!timerRunning)}
                          className={cn(
                            "px-6 py-3 text-white rounded-xl font-bold flex items-center gap-2 transition-colors",
                            timerRunning ? "bg-[#FF3B30] hover:bg-[#FF3B30]/90" : "bg-primary hover:bg-primary/90"
                          )}
                        >
                          {timerRunning ? (
                            <><Pause size={20} className="fill-white" /> Pause</>
                          ) : (
                            <><Play size={20} className="fill-white" /> Fortsetzen</>
                          )}
                        </button>
                        <button 
                          onClick={() => {
                            setTimerLeft(null);
                            setTimerRunning(false);
                          }}
                          className="px-6 py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-xl font-bold flex items-center gap-2 transition-colors"
                        >
                          <X size={20} />
                          Zurücksetzen
                        </button>
                      </>
                    )}
                  </div>
                  {timerLeft === 0 && (
                    <div className="text-[#4CAF50] font-bold text-lg mt-2 flex items-center gap-2 animate-pulse">
                      <CheckCircle2 size={24} />
                      Zeit abgelaufen!
                    </div>
                  )}
                </div>
              )}
            </motion.div>

          </div>

          {/* Navigation Controls */}
          <div className="shrink-0 max-w-3xl w-full mx-auto flex items-center justify-between mt-auto pt-8 border-t border-outline-variant/10 bg-white">
            <button 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="p-5 flex items-center gap-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={28} />
              <span className="text-lg font-bold hidden sm:block">Zurück</span>
            </button>
            
            {currentStep < totalSteps - 1 ? (
              <button 
                onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
                className="p-5 px-10 flex items-center gap-3 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <span className="text-xl font-bold">Nächster Schritt</span>
                <ChevronRight size={28} />
              </button>
            ) : (
              <button 
                onClick={onClose}
                className="p-5 px-10 flex items-center gap-3 rounded-2xl bg-[#4CAF50] text-white hover:bg-[#43A047] transition-all shadow-lg shadow-[#4CAF50]/20"
              >
                <span className="text-xl font-bold">Fertig!</span>
                <Check size={28} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RecipeForm = ({ recipe, onCancel, onSave, user, isBulkEdit }: any) => {
  const [formData, setFormData] = useState<Partial<Recipe>>({
    title: '',
    duration: '',
    servings: 4,
    difficulty: 'mittel',
    categories: [],
    dietary: [],
    tags: [],
    ingredients: [''],
    instructions: [''],
    notes: '',
    sourceName: '',
    sourceUrl: '',
    images: [],
    isPublic: true,
    ...recipe
  });
  const [isSaving, setIsSaving] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), imageUrlInput.trim()]
      }));
      setImageUrlInput('');
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Image Compression
      const imagesToCompress = (formData.images || []).slice(0, 3); // Limit to 3 images
      const compressedImages = await Promise.all(imagesToCompress.map(async (img) => {
        if (img && img.startsWith('data:image')) {
          try {
            const response = await fetch(img);
            const blob = await response.blob();
            const compressedFile = await imageCompression(blob as File, {
              maxSizeMB: 0.3,
              maxWidthOrHeight: 1600,
              useWebWorker: true
            });
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(compressedFile);
            });
          } catch (err) {
            console.error("Compression failed:", err);
            return img;
          }
        }
        return img;
      }));

      const data: any = {
        ...formData,
        images: compressedImages,
        authorId: user.uid,
        authorName: user.displayName || 'Family Member',
        createdAt: recipe?.createdAt || new Date().toISOString(),
        ingredients: (formData.ingredients || []).filter((i: string) => i && i.trim() !== ''),
        instructions: (formData.instructions || []).filter((i: string) => i && i.trim() !== ''),
      };

      // Sanitize for Firestore Rules
      if (!data.title) data.title = 'Neues Rezept';
      if (data.ingredients.length === 0) data.ingredients = ['Zutat fehlt'];
      if (data.instructions.length === 0) data.instructions = ['Schritt fehlt'];
      
      if (typeof data.servings !== 'number') {
        data.servings = parseInt(data.servings as any) || 4;
      }
      
      const validDifficulties = ['einfach', 'mittel', 'schwer'];
      if (!validDifficulties.includes(data.difficulty as string)) {
        data.difficulty = 'mittel';
      }

      // Remove null/undefined fields
      Object.keys(data).forEach(key => {
        if (data[key as keyof typeof data] == null) {
          delete data[key as keyof typeof data];
        }
      });

      // Ensure strings
      if (data.duration != null) data.duration = String(data.duration).substring(0, 49);
      if (data.notes != null) data.notes = String(data.notes).substring(0, 9999);
      if (data.authorName != null) data.authorName = String(data.authorName).substring(0, 99);
      
      // Ensure arrays
      if (!Array.isArray(data.categories)) data.categories = [];
      if (!Array.isArray(data.dietary)) data.dietary = [];
      if (!Array.isArray(data.tags)) data.tags = [];
      
      delete data.id;

      if (isBulkEdit) {
        onSave(data);
        return;
      }

      if (recipe?.id) {
        await updateDoc(doc(db, 'recipes', recipe.id), data);
        toast.success("Rezept aktualisiert!");
      } else {
        await addDoc(collection(db, 'recipes'), data);
        toast.success("Rezept gespeichert!");
      }
      onSave();
    } catch (error) {
      handleFirestoreError(error, recipe?.id ? OperationType.UPDATE : OperationType.CREATE, recipe?.id ? `recipes/${recipe.id}` : 'recipes');
    } finally {
      setIsSaving(false);
    }
  };

  const addField = (field: 'ingredients' | 'instructions' | 'tags' | 'categories' | 'dietary') => {
    setFormData({ ...formData, [field]: [...(formData[field] || []), ''] });
  };

  const updateField = (field: 'ingredients' | 'instructions' | 'tags' | 'categories' | 'dietary', index: number, value: string) => {
    const list = [...(formData[field] || [])];
    list[index] = value;
    setFormData({ ...formData, [field]: list });
  };

  const removeField = (field: 'ingredients' | 'instructions' | 'tags' | 'categories' | 'dietary', index: number) => {
    const list = [...(formData[field] || [])];
    list.splice(index, 1);
    setFormData({ ...formData, [field]: list });
  };

  const handleImageUpload = (e: any) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file as Blob);
      });
    })).then(base64Images => {
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...base64Images]
      }));
    }).catch(err => {
      console.error("Image read failed", err);
      toast.error("Fehler beim Lesen der Bilder.");
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto bg-white rounded-[3rem] p-10 lg:p-16 shadow-2xl border border-outline-variant/10"
    >
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-4xl font-serif font-bold text-primary">
          {recipe ? 'Rezept bearbeiten' : 'Neues Rezept'}
        </h2>
        <button onClick={onCancel} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Titel</label>
            <input 
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="z.B. Omas Apfelkuchen"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Dauer</label>
              <input 
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="30 Min"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Portionen</label>
              <input 
                type="number"
                value={formData.servings}
                onChange={e => setFormData({ ...formData, servings: parseInt(e.target.value) })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Schwierigkeit</label>
              <select
                value={formData.difficulty}
                onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
              >
                <option value="einfach">Einfach</option>
                <option value="mittel">Mittel</option>
                <option value="schwer">Schwer</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Quelle (Name)</label>
              <input 
                value={formData.sourceName || ''}
                onChange={e => setFormData({ ...formData, sourceName: e.target.value })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="z.B. Omas Kochbuch, Chefkoch"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Quelle (URL)</label>
              <input 
                type="url"
                value={formData.sourceUrl || ''}
                onChange={e => setFormData({ ...formData, sourceUrl: e.target.value })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Bilder
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              {formData.images?.map((img, i) => (
                <div key={i} className="relative w-32 h-32 rounded-2xl overflow-hidden group border border-outline-variant/10">
                  <img src={img} alt={`Bild ${i + 1}`} className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              ))}
              <label className="w-32 h-32 rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-on-surface-variant/50 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <ImageIcon size={32} className="mb-2" />
                <span className="text-xs font-medium text-center px-2">Vom Computer<br/>wählen</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            </div>
            
            <div className="flex items-center gap-3 max-w-md">
              <input 
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Oder Bild-URL einfügen..."
                className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImageUrl();
                  }
                }}
              />
              <button 
                type="button"
                onClick={handleAddImageUrl}
                className="px-4 py-2 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors text-sm whitespace-nowrap"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Kategorien (z.B. Hauptspeise, Snack)
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="flex flex-wrap gap-3">
            {formData.categories?.map((cat, i) => (
              <div key={i} className="flex items-center bg-surface-container-low rounded-full pl-4 pr-1 py-1 border border-outline-variant/10">
                <input 
                  value={cat}
                  onChange={e => updateField('categories', i, e.target.value)}
                  className="bg-transparent outline-none w-28 text-sm font-medium"
                  placeholder="Kategorie..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('categories', i)}
                  className="p-1.5 text-on-surface-variant/40 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('categories')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-full transition-colors border border-primary/20"
            >
              <Plus size={16} /> Kategorie hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Ernährungsart (z.B. Vegan, Glutenfrei)
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="flex flex-wrap gap-3">
            {formData.dietary?.map((diet, i) => (
              <div key={i} className="flex items-center bg-surface-container-low rounded-full pl-4 pr-1 py-1 border border-outline-variant/10">
                <input 
                  value={diet}
                  onChange={e => updateField('dietary', i, e.target.value)}
                  className="bg-transparent outline-none w-28 text-sm font-medium"
                  placeholder="Ernährungsart..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('dietary', i)}
                  className="p-1.5 text-on-surface-variant/40 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('dietary')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-full transition-colors border border-primary/20"
            >
              <Plus size={16} /> Ernährungsart hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Weitere Tags
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="flex flex-wrap gap-3">
            {formData.tags?.map((tag, i) => (
              <div key={i} className="flex items-center bg-surface-container-low rounded-full pl-4 pr-1 py-1 border border-outline-variant/10">
                <input 
                  value={tag}
                  onChange={e => updateField('tags', i, e.target.value)}
                  className="bg-transparent outline-none w-24 text-sm font-medium"
                  placeholder="Tag..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('tags', i)}
                  className="p-1.5 text-on-surface-variant/40 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('tags')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-full transition-colors border border-primary/20"
            >
              <Plus size={16} /> Tag hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Zutaten
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="space-y-3">
            {formData.ingredients?.map((ing, i) => (
              <div key={i} className="flex gap-3">
                <input 
                  value={ing}
                  onChange={e => updateField('ingredients', i, e.target.value)}
                  className="flex-1 px-6 py-3 bg-surface-container-low rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Zutat hinzufügen..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('ingredients', i)}
                  className="p-3 text-on-surface-variant/40 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('ingredients')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-lg transition-colors"
            >
              <Plus size={18} /> Zutat hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Zubereitung
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="space-y-4">
            {formData.instructions?.map((step, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-2xl font-serif font-bold text-primary/10 pt-2">{i+1}</span>
                <textarea 
                  value={step}
                  onChange={e => updateField('instructions', i, e.target.value)}
                  className="flex-1 px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
                  placeholder="Schritt beschreiben..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('instructions', i)}
                  className="p-3 text-on-surface-variant/40 hover:text-red-500 transition-colors h-fit"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('instructions')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-lg transition-colors"
            >
              <Plus size={18} /> Schritt hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Notizen (Markdown unterstützt)</label>
          <textarea 
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[150px]"
            placeholder="Tipps, Variationen oder die Geschichte dahinter..."
          />
        </div>

        <div className="flex items-center gap-6 p-6 bg-surface-container-low rounded-3xl">
          <div className="flex-1">
            <h4 className="font-bold text-on-surface">Öffentlich teilen</h4>
            <p className="text-sm text-on-surface-variant">Für alle Familienmitglieder sichtbar machen.</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
            className={cn(
              "w-14 h-8 rounded-full transition-all relative",
              formData.isPublic ? "bg-primary" : "bg-outline-variant"
            )}
          >
            <div className={cn(
              "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
              formData.isPublic ? "left-7" : "left-1"
            )} />
          </button>
        </div>

        <div className="flex gap-4 pt-8">
          <Button type="submit" className="flex-1 py-4 text-lg" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
            Rezept speichern
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} className="px-10">
            Abbrechen
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

const AdminView = ({ onBack }: { onBack: () => void }) => {
  const [settings, setSettings] = useState<Settings>({
    allowGoogleLogin: false,
    allowEmailLogin: true,
    restrictToWhitelist: true,
    allowRegistration: true,
    allowMagicLink: true
  });
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings({
        allowGoogleLogin: false,
        allowEmailLogin: true,
        restrictToWhitelist: true,
        allowRegistration: true,
        allowMagicLink: true,
        ...doc.data()
      } as Settings);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    const unsubAllowedUsers = onSnapshot(collection(db, 'allowedUsers'), (snap) => {
      setAllowedUsers(snap.docs.map(d => d.data()) as any);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'allowedUsers');
    });

    const unsubAllUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => { unsubSettings(); unsubAllowedUsers(); unsubAllUsers(); };
  }, []);

  const toggleSetting = async (key: keyof Settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
      toast.success("Einstellungen aktualisiert");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  };

  const addAllowedUser = async (e: any) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      await setDoc(doc(db, 'allowedUsers', newEmail), {
        email: newEmail,
        addedAt: new Date().toISOString()
      });
      setNewEmail('');
      toast.success("Benutzer hinzugefügt");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `allowedUsers/${newEmail}`);
    }
  };

  const removeAllowedUser = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'allowedUsers', email));
      toast.success("Benutzer entfernt");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `allowedUsers/${email}`);
    }
  };

  const toggleUserRole = async (user: UserProfile) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      toast.success(`Rolle für ${user.displayName || user.email} geändert`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteUser = async (user: UserProfile) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      toast.success("Benutzerprofil gelöscht");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12 pb-24"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-4xl font-serif font-bold text-primary">Admin-Bereich</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Settings */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-serif font-bold">Login-Einstellungen</h3>
          </div>
          
          <div className="space-y-6">
            {[
              { key: 'allowGoogleLogin', label: 'Google Login erlauben', desc: 'Nutzer können sich mit Google anmelden.' },
              { key: 'allowEmailLogin', label: 'E-Mail Login erlauben', desc: 'Nutzer können E-Mail & Passwort nutzen.' },
              { key: 'allowRegistration', label: 'Registrierung erlauben', desc: 'Neue Nutzer können Konten erstellen.' },
              { key: 'allowMagicLink', label: 'Magic Link erlauben', desc: 'Nutzer können sich per E-Mail-Link anmelden.' },
              { key: 'restrictToWhitelist', label: 'Whitelist erzwingen', desc: 'Nur Nutzer auf der Liste haben Zugriff.' }
            ].map((s: any) => (
              <div key={s.key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-on-surface-variant/60">{s.desc}</p>
                </div>
                <button
                  onClick={() => toggleSetting(s.key)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    settings[s.key as keyof Settings] ? "bg-primary" : "bg-outline-variant"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                    settings[s.key as keyof Settings] ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Whitelist */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-serif font-bold">Whitelist</h3>
          </div>

          <form onSubmit={addAllowedUser} className="flex gap-2 mb-6">
            <input 
              type="email" 
              placeholder="E-Mail hinzufügen..."
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
            />
            <Button type="submit" className="px-4 py-2" icon={Plus}>Hinzufügen</Button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
            {allowedUsers.map(u => (
              <div key={u.email} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl group">
                <span className="text-sm font-medium">{u.email}</span>
                <button 
                  onClick={() => removeAllowedUser(u.email)}
                  className="p-1.5 text-on-surface-variant/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {allowedUsers.length === 0 && !loading && (
              <p className="text-center py-8 text-sm text-on-surface-variant/40 italic">Keine Nutzer auf der Whitelist</p>
            )}
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10 mt-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <UserPlus size={24} />
          </div>
          <h3 className="text-xl font-serif font-bold">Nutzerverwaltung</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 text-sm text-on-surface-variant/60">
                <th className="pb-4 font-medium">Name</th>
                <th className="pb-4 font-medium">E-Mail</th>
                <th className="pb-4 font-medium">Rolle</th>
                <th className="pb-4 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.uid} className="border-b border-outline-variant/10 last:border-0">
                  <td className="py-4 font-medium">{u.displayName || '-'}</td>
                  <td className="py-4 text-on-surface-variant">{u.email}</td>
                  <td className="py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      u.role === 'admin' ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => toggleUserRole(u)}
                        className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title={u.role === 'admin' ? "Zum Nutzer machen" : "Zum Admin machen"}
                      >
                        <ShieldCheck size={18} />
                      </button>
                      <button 
                        onClick={() => deleteUser(u)}
                        className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Benutzer löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {allUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-sm text-on-surface-variant/40 italic">
                    Keine registrierten Nutzer
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const BulkImportOverview = ({ recipes, onCancel, onSaveAll }: any) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentRecipes, setCurrentRecipes] = useState<any[]>(recipes);

  const handleSaveEdit = (updatedRecipe: any) => {
    const newRecipes = [...currentRecipes];
    newRecipes[editingIndex!] = updatedRecipe;
    setCurrentRecipes(newRecipes);
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    const newRecipes = [...currentRecipes];
    newRecipes.splice(index, 1);
    setCurrentRecipes(newRecipes);
  };

  if (editingIndex !== null) {
    return (
      <RecipeForm 
        recipe={currentRecipes[editingIndex]} 
        onCancel={() => setEditingIndex(null)}
        onSave={(updatedRecipe: any) => handleSaveEdit(updatedRecipe)}
        user={{ uid: 'temp', displayName: 'temp' }} // We just need it to return the data, not actually save to DB yet. Wait, RecipeForm saves directly to DB!
        isBulkEdit={true}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-[3rem] p-10 lg:p-16 shadow-2xl border border-outline-variant/10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-serif font-bold text-primary">Bulk Import Übersicht</h2>
          <button onClick={onCancel} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <p className="text-on-surface-variant mb-8">
          {currentRecipes.length} Rezept(e) erfolgreich erkannt. Bitte überprüfe sie vor dem Speichern.
        </p>

        <div className="space-y-4 mb-8">
          {currentRecipes.map((recipe, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
              <div className="flex items-center gap-4">
                {recipe.images?.[0] ? (
                  <img src={recipe.images[0]} alt={recipe.title} className="w-16 h-16 object-cover rounded-xl" />
                ) : (
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <BookOpen size={24} />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{recipe.title}</h3>
                  <p className="text-sm text-on-surface-variant/70">
                    {recipe.sourceName || recipe.sourceUrl || 'Keine Quelle angegeben'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditingIndex(index)}
                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Bearbeiten"
                >
                  <Edit3 size={20} />
                </button>
                <button 
                  onClick={() => handleRemove(index)}
                  className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Entfernen"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Abbrechen
          </Button>
          <Button 
            onClick={() => onSaveAll(currentRecipes)} 
            className="flex-1"
            disabled={currentRecipes.length === 0}
          >
            Alle Speichern ({currentRecipes.length})
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const AIScanner = ({ onCancel, onScanComplete, initialUrl }: any) => {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(initialUrl || '');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRecipes, setBulkRecipes] = useState<any[]>([]);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (initialUrl) {
      handleUrlImport(initialUrl);
    }
  }, [initialUrl]);

  const generateSourceName = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      const parts = hostname.replace('www.', '').split('.');
      if (parts.length > 0) {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    } catch (e) {
      // Ignore invalid URL
    }
    return url;
  };

  const handleFiles = async (e: any) => {
    const files = Array.from(e.target.files) as File[];
    if (files.length === 0) return;

    setIsScanning(true);
    setPreview(null);
    setScanProgress({ current: 0, total: files.length });
    
    try {
      const base64Images = await Promise.all(files.map(async (file) => {
        try {
          // Strict compression for AI scanning to reduce payload
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.15,
            maxWidthOrHeight: 800,
            useWebWorker: true
          });
          return new Promise<{data: string, mimeType: string}>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({ data: event.target?.result as string, mimeType: compressedFile.type });
            };
            reader.readAsDataURL(compressedFile);
          });
        } catch (err) {
          console.error("Scanner compression failed:", err);
          // Fallback to original file
          return new Promise<{data: string, mimeType: string}>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({ data: event.target?.result as string, mimeType: file.type });
            };
            reader.readAsDataURL(file);
          });
        }
      }));

      if (base64Images.length === 1) {
        setPreview(base64Images[0].data);
      }

      const recipes = await processImagesSequentially(base64Images, (current, total) => {
        setScanProgress({ current, total });
      });

      const processedRecipes = recipes.map((r: any) => ({
        ...r,
        images: r.imageIndices ? r.imageIndices.map((i: number) => base64Images[i]?.data).filter(Boolean) : (base64Images.length === 1 ? [base64Images[0].data] : []),
        sourceName: sourceName || (sourceUrl ? generateSourceName(sourceUrl) : ''),
        sourceUrl: sourceUrl
      }));

      if (processedRecipes.length === 1) {
        const data = processedRecipes[0];
        if (data.isRecipe === false) {
          setPendingData(data);
          setShowWarning(true);
          setIsScanning(false);
        } else {
          onScanComplete(data);
          toast.success("Rezept erfolgreich gescannt!");
        }
      } else if (processedRecipes.length > 1) {
        setBulkRecipes(processedRecipes);
        setBulkMode(true);
        setIsScanning(false);
      } else {
        toast.error("Keine Rezepte in den Bildern gefunden.");
        setIsScanning(false);
      }
    } catch (error) {
      toast.error("Scan fehlgeschlagen. Bitte versuche es erneut.");
      setIsScanning(false);
    }
  };

  const handleUrlImport = async (urlToImport = urlInput) => {
    if (!urlToImport.trim()) return;
    
    setIsScanning(true);
    setPreview(null);
    
    const urls = urlToImport.split('\n').map(u => u.trim()).filter(u => u);
    
    try {
      if (urls.length === 1) {
        const data = await importRecipeFromUrl(urls[0]);
        const recipeData = {
          ...data,
          sourceName: sourceName || generateSourceName(urls[0]),
          sourceUrl: sourceUrl || urls[0]
        };
        
        if (data.isRecipe === false) {
          setPendingData(recipeData);
          setShowWarning(true);
          setIsScanning(false);
        } else {
          onScanComplete(recipeData);
          toast.success("Rezept erfolgreich importiert!");
        }
      } else {
        // Bulk import URLs
        const results = await Promise.allSettled(urls.map(u => importRecipeFromUrl(u)));
        const successfulRecipes = results
          .filter(r => r.status === 'fulfilled' && r.value.isRecipe !== false)
          .map((r: any, i) => ({
            ...r.value,
            sourceName: sourceName || generateSourceName(urls[i]),
            sourceUrl: sourceUrl || urls[i]
          }));

        if (successfulRecipes.length > 0) {
          setBulkRecipes(successfulRecipes);
          setBulkMode(true);
        } else {
          toast.error("Keine gültigen Rezepte in den URLs gefunden.");
        }
        setIsScanning(false);
      }
    } catch (error) {
      toast.error("Import fehlgeschlagen. Bitte überprüfe die URL(s).");
      setIsScanning(false);
    }
  };

  if (bulkMode) {
    return (
      <BulkImportOverview 
        recipes={bulkRecipes} 
        onCancel={() => setBulkMode(false)}
        onSaveAll={(recipesToSave: any[]) => {
          // We need a way to save multiple recipes. 
          // For now, we can just pass them back to App.tsx to handle, or save them here.
          onScanComplete(recipesToSave, true); // true indicates bulk
        }}
      />
    );
  }


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-outline-variant/10"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-4">Kein Rezept erkannt</h3>
              <p className="text-on-surface-variant mb-8 leading-relaxed">
                Es scheint, als ob der Inhalt kein Rezept enthält. Ein automatischer Import wurde daher nicht empfohlen. 
                Möchtest du trotzdem fortfahren und die Daten manuell bearbeiten? Es könnte ein Erkennungsfehler der KI sein.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => onScanComplete(pendingData)} className="w-full">
                  Bist du dir sicher? Fortfahren
                </Button>
                <Button variant="secondary" onClick={() => { setShowWarning(false); setPendingData(null); }} className="w-full">
                  Abbrechen
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-outline-variant/10">
        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-8">
          <Camera size={48} />
        </div>
        <h2 className="text-3xl font-serif font-bold text-primary mb-4">KI Rezept-Scanner</h2>
        <p className="text-on-surface-variant mb-10 leading-relaxed">
          Fotografiere ein Rezept, lade Bilder hoch oder füge Links von Rezept-Websites (z.B. Chefkoch) oder YouTube-Videos ein. Bulk-Import wird unterstützt!
        </p>

        {isScanning ? (
          <div className="space-y-6 py-8">
            {preview ? (
              <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden shadow-lg">
                <img src={preview} className="w-full h-full object-cover blur-sm" />
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={48} />
                </div>
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10"
                />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
              </div>
            )}
            <div className="text-center">
              <p className="text-primary font-medium animate-pulse mb-2">Analysiere Rezept(e)...</p>
              {scanProgress.total > 0 && (
                <p className="text-sm text-on-surface-variant">
                  Verarbeite Bild {scanProgress.current} von {scanProgress.total}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 text-left">
            <div className="p-6 bg-surface-container-low rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/50">Quelle (Optional)</h3>
              <p className="text-xs text-on-surface-variant/70">Wird für alle importierten Rezepte übernommen.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="Name (z.B. Omas Kochbuch, Chefkoch)"
                  className="w-full px-4 py-3 bg-white rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all border border-outline-variant/10"
                />
                <input 
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="URL (z.B. https://chefkoch.de)"
                  className="w-full px-4 py-3 bg-white rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all border border-outline-variant/10"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/50">Aus Bild(ern) / Foto(s)</h3>
              <label className="block">
                <span className="sr-only">Bilder auswählen</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  multiple
                  onChange={handleFiles}
                  className="block w-full text-sm text-on-surface-variant
                    file:mr-4 file:py-3 file:px-8
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary/90 cursor-pointer"
                />
              </label>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-on-surface-variant/50 font-medium">ODER</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/50">Aus Web-Link(s)</h3>
              <div className="flex flex-col gap-2">
                <textarea 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.chefkoch.de/...&#10;Ein Link pro Zeile für Bulk-Import"
                  className="w-full px-4 py-3 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[100px] resize-y"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      handleUrlImport();
                    }
                  }}
                />
                <Button onClick={() => handleUrlImport()} disabled={!urlInput.trim()}>
                  Importieren
                </Button>
              </div>
            </div>

            <Button variant="secondary" onClick={onCancel} className="w-full mt-8">
              Abbrechen
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
