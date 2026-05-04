import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitFork, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Recipe, RecipeVariant } from '../../types';
import { getRecipeVariants, createRecipeVariant, computeVariant } from '../../services/recipeVersioning';
import { Button } from '../ui/Button';

interface VariantManagerProps {
  recipe: Recipe;
  currentUser: any;
  onVariantSelected?: (computedRecipe: Recipe) => void;
}

export const VariantManager = ({ recipe, currentUser, onVariantSelected }: VariantManagerProps) => {
  const [variants, setVariants] = useState<RecipeVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [variantName, setVariantName] = useState('');

  useEffect(() => {
    if (recipe.id) {
      getRecipeVariants(recipe.id).then(data => {
        setVariants(data);
        setLoading(false);
      });
    }
  }, [recipe.id]);

  const handleFork = async () => {
    if (!variantName.trim() || !recipe.id || !currentUser) return;
    
    // In a real app we might open a "RecipeForm" with initial values here.
    // For this demonstration, we just create a variant exactly like the parent except for the title change.
    // In practice, the user edits and THEN saves as variant. This creates an empty diff variant.
    try {
      const differences = { title: variantName };
      await createRecipeVariant(recipe, variantName, currentUser.uid, { ...recipe, title: variantName });
      toast.success("Variante erstellt");
      setVariantName('');
      setCreatingVariant(false);
      
      const updated = await getRecipeVariants(recipe.id);
      setVariants(updated);
    } catch (e) {
      // error handled in service
    }
  };

  const handleSelectVariant = (variant: RecipeVariant) => {
    const computed = computeVariant(recipe, variant);
    if (onVariantSelected) onVariantSelected(computed);
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-full transition-colors text-primary flex gap-2 items-center font-medium border border-primary/10"
        title="Varianten anzeigen"
      >
        <GitFork size={20} />
        {variants.length > 0 && <span className="text-sm">{variants.length} Varianten</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                  <GitFork size={24} />
                  Rezept-Varianten
                </h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-surface-container-high rounded-full">
                  <X size={20} />
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-on-surface-variant animate-pulse">Lade Varianten...</div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {variants.length === 0 ? (
                    <div className="py-4 text-center text-on-surface-variant mb-4">
                      Noch keine Varianten vorhanden.
                    </div>
                  ) : (
                    variants.map(v => (
                      <div key={v.id} className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between group">
                        <div>
                          <span className="font-bold text-lg block">{v.variantName}</span>
                          <span className="text-xs text-on-surface-variant">Erstellt am {new Date(v.createdAt).toLocaleDateString()}</span>
                        </div>
                        <Button variant="secondary" onClick={() => handleSelectVariant(v)}>Ansehen</Button>
                      </div>
                    ))
                  )}

                  {!creatingVariant ? (
                    <Button onClick={() => setCreatingVariant(true)} className="w-full flex items-center justify-center gap-2 mt-4">
                      <Plus size={20} />
                      Neue Variante anlegen
                    </Button>
                  ) : (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-4">
                      <h4 className="font-bold">Variante benennen</h4>
                      <input 
                        value={variantName}
                        onChange={e => setVariantName(e.target.value)}
                        placeholder="z.B. Vegan, Glutenfrei..."
                        className="w-full px-4 py-2 bg-white rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleFork} className="flex-1">Speichern</Button>
                        <Button variant="secondary" onClick={() => setCreatingVariant(false)} className="px-4">Abbrechen</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
