import { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore as useAuth } from './stores/authStore';
import { useRecipeStore as useRecipes } from './stores/recipeStore';
import { useAuthActions } from './hooks/useAuthActions';
import { useRecipeActions } from './hooks/useRecipeActions';

// Layout & UI Components
import { Header } from './components/layout/Header';
import { LoginScreen } from './components/layout/LoginScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { PrivateRoute } from './components/layout/PrivateRoute';
import { useNotifications } from './hooks/useNotifications';

// Lazy Loaded Pages
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage').then(m => ({ default: m.RecipeDetailPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ShoppingListsPage = lazy(() => import('./pages/ShoppingListsPage').then(m => ({ default: m.ShoppingListsPage })));
const FavoritesManager = lazy(() => import('./pages/FavoritesManager').then(m => ({ default: m.FavoritesManager })));
const MealPlanner = lazy(() => import('./pages/MealPlanner').then(m => ({ default: m.MealPlanner })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Lazy Loaded Components
const RecipeForm = lazy(() => import('./components/recipes/RecipeForm').then(m => ({ default: m.RecipeForm })));
const CookingMode = lazy(() => import('./components/recipes/CookingMode').then(m => ({ default: m.CookingMode })));
const AIScanner = lazy(() => import('./components/import/AIScanner').then(m => ({ default: m.AIScanner })));

const SuspenseFallback = () => (
  <div className="flex justify-center items-center py-24">
    <Loader2 className="animate-spin text-primary" size={48} />
  </div>
);

const AppContent = () => {
  const { user, userProfile, settings, isWhitelisted, loading, logout } = useAuth();
  const { recipes } = useRecipes();
  const { handleLogin, handleForgotPassword, handleMagicLink } = useAuthActions(settings);
  const { saveBulkRecipes } = useRecipeActions();
  const navigate = useNavigate();

  useNotifications();

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
      navigate('/import');
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
          else if (v === 'scan') navigate('/import');
          else if (v === 'shopping-lists') navigate('/shopping-lists');
          else if (v === 'favorites') navigate('/collections');
          else if (v === 'meal-planner') navigate('/meal-plan');
        }}
        user={user}
        userProfile={userProfile}
        onLogout={logout}
        onNewRecipe={() => navigate('/new')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shopping-lists" element={<PrivateRoute><ShoppingListsPage /></PrivateRoute>} />
              <Route path="/collections" element={<PrivateRoute><FavoritesManager /></PrivateRoute>} />
              {/* Backwards compatibility for favorites route */}
              <Route path="/favorites" element={<Navigate to="/collections" replace />} />
              
              <Route path="/meal-plan" element={<PrivateRoute><MealPlanner /></PrivateRoute>} />
              {/* Backwards compatibility for meal-planner route */}
              <Route path="/meal-planner" element={<Navigate to="/meal-plan" replace />} />
              
              <Route path="/recipes/:id" element={<RecipeDetailPage />} />
              {/* Backwards compatibility for recipe route */}
              <Route path="/recipe/:id" element={<Navigate to={`/recipes/${window.location.pathname.split('/').pop()}`} replace />} />
              
              <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
              <Route path="/new" element={
                <PrivateRoute>
                  <RecipeForm 
                    onCancel={() => navigate('/')} 
                    onSave={() => navigate('/')}
                    user={user}
                  />
                </PrivateRoute>
              } />
              
              <Route path="/edit/:id" element={<PrivateRoute><EditRecipeRoute user={user} recipes={recipes} /></PrivateRoute>} />
              <Route path="/cook/:id" element={<CookRecipeRoute recipes={recipes} />} />
              <Route path="/import" element={
                <PrivateRoute>
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
                        navigate('/new', { state: { recipeData: data } });
                      }
                      setSharedUrl(null);
                    }}
                  />
                </PrivateRoute>
              } />
              {/* Backwards compatibility for scan route */}
              <Route path="/scan" element={<Navigate to="/import" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
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
      onCancel={() => navigate(`/recipes/${id}`)} 
      onSave={() => navigate(`/recipes/${id}`)}
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
      onClose={() => navigate(`/recipes/${id}`)}
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
