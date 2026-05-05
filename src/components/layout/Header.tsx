import { ChefHat, Settings as SettingsIcon, Camera, Plus, LogOut, ShoppingCart, Bookmark, Calendar, Sun, Moon, Laptop, BarChart2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../stores/themeStore';

interface HeaderProps {
  view: string;
  setView: (view: any) => void;
  user: any;
  userProfile: any;
  onLogout: () => void;
  onNewRecipe: () => void;
}

export const Header = ({ 
  view, 
  setView, 
  user, 
  userProfile, 
  onLogout, 
  onNewRecipe 
}: HeaderProps) => {
  const isAdmin = userProfile?.role === 'admin' || 
                  user?.email === 'nl.leitschuh@gmail.com' || 
                  user?.email === 'noah@leitschuh.de';
  const location = useLocation();

  const { theme, setTheme } = useThemeStore();

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const renderThemeIcon = () => {
    if (theme === 'light') return <Sun size={20} />;
    if (theme === 'dark') return <Moon size={20} />;
    return <Laptop size={20} />;
  };

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView('list')}
        >
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white group-hover:rotate-12 transition-transform">
            <ChefHat size={24} />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-primary">Heirloom</h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={cycleTheme}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant flex items-center justify-center"
            title={`Thema: ${theme}`}
          >
            {renderThemeIcon()}
          </button>
          
          <button 
            onClick={() => setView('shopping-lists')}
            className={cn(
              "p-2 rounded-full transition-colors",
              location.pathname === '/shopping-lists' ? "bg-primary/10 text-primary" : "hover:bg-surface-container-high text-on-surface-variant"
            )}
            title="Einkaufslisten"
          >
            <ShoppingCart size={20} />
          </button>
          
          <button 
            onClick={() => setView('favorites')}
            className={cn(
              "p-2 rounded-full transition-colors",
              location.pathname === '/favorites' ? "bg-primary/10 text-primary" : "hover:bg-surface-container-high text-on-surface-variant"
            )}
            title="Favoriten & Sammlungen"
          >
            <Bookmark size={20} />
          </button>

          <button 
            onClick={() => setView('meal-planner')}
            className={cn(
              "p-2 rounded-full transition-colors",
              location.pathname === '/meal-planner' ? "bg-primary/10 text-primary" : "hover:bg-surface-container-high text-on-surface-variant"
            )}
            title="Menüplaner"
          >
            <Calendar size={20} />
          </button>

          <button 
            onClick={() => setView('analytics')}
            className={cn(
              "p-2 rounded-full transition-colors",
              location.pathname === '/analytics' ? "bg-primary/10 text-primary" : "hover:bg-surface-container-high text-on-surface-variant"
            )}
            title="Analytics Dashboard"
          >
            <BarChart2 size={20} />
          </button>

          {isAdmin && (
            <button 
              onClick={() => setView('admin')}
              className={cn(
                "p-2 rounded-full transition-colors",
                location.pathname === '/settings' ? "bg-primary/10 text-primary" : "hover:bg-surface-container-high text-on-surface-variant"
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
            onClick={onNewRecipe}
            icon={Plus}
          >
            Neu
          </Button>
          <div className="h-8 w-px bg-outline-variant/20 mx-2 hidden sm:block" />
          <button 
            onClick={onLogout}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
            title="Abmelden"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};
