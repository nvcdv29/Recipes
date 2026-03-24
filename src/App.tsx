import { useState, useEffect } from 'react';
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
  setDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Recipe, UserProfile } from './types';
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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanRecipeImage } from './services/geminiService';
import html2pdf from 'html2pdf.js';
import ReactMarkdown from 'react-markdown';

// --- Components ---

const Button = ({ children, onClick, className, variant = 'primary', disabled, icon: Icon }: any) => {
  const variants: any = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
    secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
    outline: 'border border-outline-variant text-primary hover:bg-primary/5',
    ghost: 'text-primary hover:bg-primary/5',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100'
  };

  return (
    <button 
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

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'form' | 'scan'>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Alle');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
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
      console.error("Firestore Error:", error);
      toast.error("Fehler beim Laden der Rezepte");
    });

    return unsubscribe;
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Willkommen zurück!");
    } catch (error) {
      toast.error("Login fehlgeschlagen");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setView('list');
  };

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         r.ingredients.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'Alle' || r.categories.includes(filterCategory);
    const isVisible = r.isPublic || r.authorId === user?.uid;
    return matchesSearch && matchesCategory && isVisible;
  });

  const categories = ['Alle', ...Array.from(new Set(recipes.flatMap(r => r.categories)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary/20">
      <Toaster position="top-center" richColors />
      
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
              onDelete={async () => {
                if (confirm('Rezept wirklich löschen?')) {
                  await deleteDoc(doc(db, 'recipes', selectedRecipe.id!));
                  toast.success('Rezept gelöscht');
                  setView('list');
                }
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
  );
}

// --- Sub-Components ---

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => (
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
        Deine private Familiensammlung für Rezepte, Erinnerungen und kulinarische Schätze.
      </p>
      <Button onClick={onLogin} className="w-full py-4 text-lg" icon={UserIcon}>
        Mit Google anmelden
      </Button>
      <p className="mt-8 text-xs text-on-surface-variant/40 uppercase tracking-widest font-semibold">
        Nur für Familienmitglieder
      </p>
    </motion.div>
  </div>
);

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
      const data = {
        ...formData,
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
      toast.error("Fehler beim Speichern");
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
