import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useRecipes } from './contexts/RecipeContext';
import { useAuthActions } from './hooks/useAuthActions';
import { useRecipeActions } from './hooks/useRecipeActions';

// Layout & UI Components
import { Header } from './components/layout/Header';
import { LoginScreen } from './components/layout/LoginScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Pages
import { HomePage } from './pages/HomePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShoppingListsPage } from './pages/ShoppingListsPage';

// Recipe Components
import { RecipeForm } from './components/recipes/RecipeForm';
import { CookingMode } from './components/recipes/CookingMode';

// Import Components
import { AIScanner } from './components/import/AIScanner';

const AppContent = () => {
  const { user, userProfile, settings, isWhitelisted, loading, logout } = useAuth();
  const { recipes, loading: recipesLoading } = useRecipes();
  const { handleLogin, handleForgotPassword, handleMagicLink } = useAuthActions(settings);
  const { saveBulkRecipes } = useRecipeActions();
  const navigate = useNavigate();

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
      navigate('/scan');
      window.history.replaceState({}, document.title, '/');
    }
  }, [navigate]);

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
          logout();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary/20">
      <Toaster position="top-center" richColors />
      
      <Header 
        view="none" // Controlled by route now
        setView={(v) => {
          if (v === 'list') navigate('/');
          else if (v === 'admin') navigate('/settings');
          else if (v === 'scan') navigate('/scan');
          else if (v === 'shopping-lists') navigate('/shopping-lists');
        }}
        user={user}
        userProfile={userProfile}
        onLogout={logout}
        onNewRecipe={() => navigate('/new')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shopping-lists" element={<ShoppingListsPage />} />
            <Route path="/recipe/:id" element={<RecipeDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/new" element={
              <RecipeForm 
                onCancel={() => navigate('/')} 
                onSave={() => navigate('/')}
                user={user}
              />
            } />
            <Route path="/edit/:id" element={<EditRecipeRoute user={user} recipes={recipes} />} />
            <Route path="/cook/:id" element={<CookRecipeRoute recipes={recipes} />} />
            <Route path="/scan" element={
              <AIScanner 
                initialUrl={sharedUrl}
                onCancel={() => {
                  navigate('/');
                  setSharedUrl(null);
                }} 
                onScanComplete={async (data: any, isBulk: boolean = false) => {
                  if (isBulk) {
                    const success = await saveBulkRecipes(data, user);
                    if (success) navigate('/');
                  } else {
                    // Navigate to form with state or store data temporarily
                    navigate('/new', { state: { recipeData: data } });
                  }
                  setSharedUrl(null);
                }}
              />
            } />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
};

const EditRecipeRoute = ({ user, recipes }: any) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const recipe = recipes.find((r: any) => r.id === id);
  
  if (!recipe) return <Loader2 className="animate-spin text-primary" size={48} />;
  
  return (
    <RecipeForm 
      recipe={recipe} 
      onCancel={() => navigate(`/recipe/${id}`)} 
      onSave={() => navigate(`/recipe/${id}`)}
      user={user}
    />
  );
};

const CookRecipeRoute = ({ recipes }: any) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const recipe = recipes.find((r: any) => r.id === id);
  
  if (!recipe) return <Loader2 className="animate-spin text-primary" size={48} />;
  
  return (
    <CookingMode 
      recipe={recipe}
      onClose={() => navigate(`/recipe/${id}`)}
    />
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
