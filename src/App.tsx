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
  getDocs
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
import { Recipe, UserProfile, OperationType, FirestoreErrorInfo, AllowedUser, Settings } from './types';
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
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanRecipeImage } from './services/geminiService';
import html2pdf from 'html2pdf.js';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import imageCompression from 'browser-image-compression';
import FlexSearch from 'flexsearch';

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
  const [view, setView] = useState<'list' | 'detail' | 'form' | 'scan' | 'admin'>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Alle');
  const [settings, setSettings] = useState<Settings>({
    allowGoogleLogin: false,
    allowEmailLogin: true,
    restrictToWhitelist: true
  });
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  // Search Index
  const index = useMemo(() => {
    const idx = new FlexSearch.Document({
      document: {
        id: "id",
        index: ["title", "ingredients", "notes"],
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
        const docRef = doc(db, 'allowedUsers', user.email || '');
        const docSnap = await getDoc(docRef);
        setIsWhitelisted(docSnap.exists());
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
    if (!user) {
      setRecipes([]);
      return;
    }

    const q = query(
      collection(db, 'recipes'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
      setRecipes(rList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recipes');
    });

    return unsubscribe;
  }, [user]);

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
      const matchesCategory = filterCategory === 'Alle' || r.categories.includes(filterCategory);
      const isVisible = r.isPublic || r.authorId === user?.uid;
      return matchesCategory && isVisible;
    });
  }, [recipes, searchResults, filterCategory, user]);

  const categories = ['Alle', ...Array.from(new Set(recipes.flatMap(r => r.categories)))];

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
        <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
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
              {userProfile?.role === 'admin' && (
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
                <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between">
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
                currentUser={user}
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
                onCancel={() => setView('list')} 
                onScanComplete={(data) => {
                  setSelectedRecipe(data);
                  setView('form');
                }}
              />
            )}

            {view === 'admin' && userProfile?.role === 'admin' && (
              <AdminView onBack={() => setView('list')} />
            )}
          </AnimatePresence>
        </main>
        
        {/* Mobile Scan Button */}
        {view === 'list' && (
          <button 
            onClick={() => setView('scan')}
            className="fixed bottom-8 right-8 sm:hidden w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40"
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
                  <button 
                    type="button"
                    onClick={() => onMagicLink(email)}
                    className="text-sm text-primary font-medium hover:underline flex items-center justify-center gap-2"
                  >
                    <Mail size={14} /> Magic Link senden
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-on-surface-variant/60 hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-sm text-primary font-medium hover:underline mt-2"
                  >
                    {isRegister ? 'Bereits ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
                  </button>
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
      <div className="absolute top-4 right-4 flex gap-2">
        {recipe.dietary.slice(0, 2).map(d => (
          <span key={d} className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm">
            {d}
          </span>
        ))}
      </div>
    </div>
    <div className="p-6">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary/60 uppercase tracking-wider mb-2">
        <span>{recipe.categories[0]}</span>
        <span className="w-1 h-1 bg-primary/20 rounded-full" />
        <span>{recipe.difficulty}</span>
      </div>
      <h3 className="text-xl font-serif font-bold text-on-surface group-hover:text-primary transition-colors mb-4 line-clamp-1">
        {recipe.title}
      </h3>
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

const RecipeDetail = ({ recipe, onBack, onEdit, onDelete, currentUser }: any) => {
  const exportPDF = () => {
    const element = document.getElementById('recipe-content');
    const opt = {
      margin: 1,
      filename: `${recipe.title}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(element).save();
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-medium">
          <ChevronLeft size={20} />
          <span>Zurück zur Übersicht</span>
        </button>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Drucken / PDF">
            <Printer size={20} />
          </button>
          <button onClick={shareRecipe} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Teilen">
            <Share2 size={20} />
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

      <div id="recipe-content" className="bg-white rounded-[3rem] overflow-hidden shadow-xl border border-outline-variant/5">
        <div className="aspect-[21/9] w-full relative">
          <img 
            src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/1200/600`} 
            alt={recipe.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-10 left-10 right-10">
            <div className="flex gap-2 mb-4">
              {recipe.categories.map(c => (
                <span key={c} className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-widest border border-white/20">
                  {c}
                </span>
              ))}
            </div>
            <h1 className="text-5xl font-serif font-bold text-white tracking-tight">{recipe.title}</h1>
          </div>
        </div>

        <div className="p-10 lg:p-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 p-8 bg-surface-container-low rounded-[2rem]">
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
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RecipeForm = ({ recipe, onCancel, onSave, user }: any) => {
  const [formData, setFormData] = useState<Partial<Recipe>>(recipe || {
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
    images: [],
    isPublic: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Image Compression
      const compressedImages = await Promise.all(formData.images.map(async (img) => {
        if (img.startsWith('data:image')) {
          try {
            const response = await fetch(img);
            const blob = await response.blob();
            const compressedFile = await imageCompression(blob as File, {
              maxSizeMB: 0.5,
              maxWidthOrHeight: 1200,
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

      const data = {
        ...formData,
        images: compressedImages,
        authorId: user.uid,
        authorName: user.displayName,
        createdAt: recipe?.createdAt || new Date().toISOString(),
        ingredients: formData.ingredients?.filter(i => i.trim() !== ''),
        instructions: formData.instructions?.filter(i => i.trim() !== ''),
      };

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

  const addField = (field: 'ingredients' | 'instructions') => {
    setFormData({ ...formData, [field]: [...(formData[field] || []), ''] });
  };

  const updateField = (field: 'ingredients' | 'instructions', index: number, value: string) => {
    const list = [...(formData[field] || [])];
    list[index] = value;
    setFormData({ ...formData, [field]: list });
  };

  const removeField = (field: 'ingredients' | 'instructions', index: number) => {
    const list = [...(formData[field] || [])];
    list.splice(index, 1);
    setFormData({ ...formData, [field]: list });
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
          <div className="grid grid-cols-2 gap-4">
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
    restrictToWhitelist: true
  });
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as Settings);
    });

    const unsubUsers = onSnapshot(collection(db, 'allowedUsers'), (snap) => {
      setAllowedUsers(snap.docs.map(d => d.data()) as any);
      setLoading(false);
    });

    return () => { unsubSettings(); unsubUsers(); };
  }, []);

  const toggleSetting = async (key: keyof Settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
      toast.success("Einstellungen aktualisiert");
    } catch (error) {
      toast.error("Fehler beim Speichern");
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
      toast.error("Fehler beim Hinzufügen");
    }
  };

  const removeAllowedUser = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'allowedUsers', email));
      toast.success("Benutzer entfernt");
    } catch (error) {
      toast.error("Fehler beim Entfernen");
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
    </motion.div>
  );
};

const AIScanner = ({ onCancel, onScanComplete }: any) => {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      setIsScanning(true);
      try {
        const data = await scanRecipeImage(base64, file.type);
        onScanComplete(data);
        toast.success("Rezept erfolgreich gescannt!");
      } catch (error) {
        toast.error("Scan fehlgeschlagen. Bitte versuche es erneut.");
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-outline-variant/10">
        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-8">
          <Camera size={48} />
        </div>
        <h2 className="text-3xl font-serif font-bold text-primary mb-4">KI Rezept-Scanner</h2>
        <p className="text-on-surface-variant mb-10 leading-relaxed">
          Fotografiere ein altes Familienrezept oder lade ein Bild hoch. 
          Unsere KI wandelt es automatisch in ein digitales Format um.
        </p>

        {isScanning ? (
          <div className="space-y-6 py-8">
            <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden shadow-lg">
              <img src={preview!} className="w-full h-full object-cover blur-sm" />
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={48} />
              </div>
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10"
              />
            </div>
            <p className="text-primary font-medium animate-pulse">Analysiere Rezept...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="sr-only">Bild auswählen</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handleFile}
                className="block w-full text-sm text-on-surface-variant
                  file:mr-4 file:py-3 file:px-8
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-white
                  hover:file:bg-primary/90 cursor-pointer"
              />
            </label>
            <Button variant="secondary" onClick={onCancel} className="w-full">
              Abbrechen
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
