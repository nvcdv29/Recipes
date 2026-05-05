import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { useAuthStore } from './stores/authStore';
import { useRecipeStore } from './stores/recipeStore';
import { ThemeProvider } from './components/layout/ThemeProvider';

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const initializeAuth = useAuthStore(state => state.initializeAuth);
  const user = useAuthStore(state => state.user);
  const isWhitelisted = useAuthStore(state => state.isWhitelisted);
  const initializeRecipes = useRecipeStore(state => state.initializeRecipes);

  useEffect(() => {
    const unsubAuth = initializeAuth();
    return () => unsubAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (user !== undefined && isWhitelisted !== null) {
      const unsubRecipes = initializeRecipes(user?.uid || '', !!isWhitelisted);
      return () => unsubRecipes();
    }
  }, [user, isWhitelisted, initializeRecipes]);

  return <>{children}</>;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppInitializer>
        <App />
      </AppInitializer>
    </ThemeProvider>
  </StrictMode>,
);

