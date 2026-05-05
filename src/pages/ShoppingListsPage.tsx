import { useState } from 'react';
import { useShoppingList } from '../hooks/useShoppingList';
import { ShoppingListGenerator } from '../components/shopping/ShoppingListGenerator';
import { ShoppingListDetail } from '../components/shopping/ShoppingListDetail';
import { Button } from '../components/ui/Button';
import { Plus, ShoppingCart, Trash2, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingList } from '../types';

export const ShoppingListsPage = () => {
  const { shoppingLists, loading, deleteList } = useShoppingList();
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);

  if (loading) {
    return <div className="p-8 text-center text-on-surface-variant flex justify-center"><ShoppingCart className="animate-bounce" /></div>;
  }

  if (selectedList) {
    return <ShoppingListDetail list={selectedList} onBack={() => setSelectedList(null)} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-on-surface flex items-center gap-3">
            <ShoppingCart size={32} className="text-primary" />
            Einkaufslisten
          </h1>
          <p className="text-on-surface-variant mt-2">Plane deinen Einkauf entspannt und effizient.</p>
        </div>
        <Button onClick={() => setShowGenerator(true)} icon={Plus}>
          Neue Liste
        </Button>
      </div>

      {shoppingLists.length === 0 ? (
        <div className="text-center py-24 bg-surface-container-low border border-outline-variant/10 rounded-3xl">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Noch keine Einkaufsliste</h3>
          <p className="text-on-surface-variant mb-6">Wähle Rezepte aus und erstelle deine erste Einkaufsliste.</p>
          <Button onClick={() => setShowGenerator(true)}>Jetzt erstellen</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {shoppingLists.map((list) => {
              const checkedCount = list.items.filter(i => i.checked).length;
              const totalCount = list.items.length;
              const progress = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

              return (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white dark:bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group flex flex-col"
                  onClick={() => setSelectedList(list)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg text-on-surface line-clamp-1">{list.name}</h3>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (list.id && window.confirm('Liste löschen?')) {
                          deleteList(list.id);
                        }
                      }}
                      className="text-outline-variant hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
                    <CalendarDays size={16} />
                    {new Date(list.createdAt).toLocaleDateString()}
                  </div>

                  <div className="mt-auto pt-4 space-y-2">
                    <div className="flex justify-between text-xs font-medium text-on-surface-variant">
                      <span>{checkedCount} von {totalCount} abgehakt</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {showGenerator && <ShoppingListGenerator onClose={() => setShowGenerator(false)} />}
    </div>
  );
};
