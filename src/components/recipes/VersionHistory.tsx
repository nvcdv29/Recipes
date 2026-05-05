import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Expand, X, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { diff } from 'deep-object-diff';
import { db } from '../../firebase';
import { Recipe, RecipeVersion } from '../../types';
import { getRecipeVersions } from '../../services/recipeVersioning';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

interface VersionHistoryProps {
  recipe: Recipe;
}

export const VersionHistory = ({ recipe }: VersionHistoryProps) => {
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && recipe.id) {
      setLoading(true);
      getRecipeVersions(recipe.id).then(data => {
        // Data is sorted desc
        setVersions(data);
        setLoading(false);
      });
    }
  }, [recipe.id, isOpen]);

  const mergeDeep = (target: any, source: any) => {
    let output = Object.assign({}, target);
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object && key in target && !Array.isArray(source[key])) {
        output[key] = mergeDeep(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  };

  const getComputedVersionState = (targetVersion: number): Partial<Recipe> => {
    // Sort versions ascending to replay them
    const ascending = [...versions].sort((a,b) => a.version - b.version);
    let state: any = {};
    for (const v of ascending) {
      if (v.version > targetVersion) break;
      state = mergeDeep(state, v.changes);
    }
    return state;
  };

  const handleRollback = async (targetVersion: number) => {
    if (!recipe.id) return;
    try {
      const rollbackState = getComputedVersionState(targetVersion);
      
      const newChanges = diff(recipe, rollbackState) as Partial<Recipe>;
      if (Object.keys(newChanges).length === 0) {
        toast.info("Das Rezept ist bereits auf diesem Stand.");
        return;
      }

      await updateDoc(doc(db, 'recipes', recipe.id), rollbackState);

      const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;
      await addDoc(collection(db, 'recipes', recipe.id, 'versions'), {
        recipeId: recipe.id,
        version: nextVersion,
        changes: newChanges,
        changedBy: recipe.authorId, // Usually auth current user
        changeDate: new Date().toISOString(),
        changeDescription: `Rollback auf Version ${targetVersion}`
      });

      toast.success(`Auf Version ${targetVersion} zurückgesetzt`);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Rollback fehlgeschlagen");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant flex gap-2 items-center text-sm font-medium"
        title="Versionsaufzeichnung"
      >
        <History size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-surface-container-low rounded-[2rem] p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                  <History size={24} />
                  Versionsverlauf
                </h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-surface-container-high rounded-full">
                  <X size={20} />
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-on-surface-variant animate-pulse">Lade Versionen...</div>
              ) : versions.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant">Keine älteren Versionen gefunden.</div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {versions.map(v => (
                    <div key={v.id} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-lg block">Version {v.version}</span>
                          <span className="text-xs text-on-surface-variant block">
                            {format(new Date(v.changeDate), 'dd.MM.yyyy HH:mm')}
                          </span>
                        </div>
                        <Button variant="secondary" onClick={() => handleRollback(v.version)} className="h-8 text-xs py-0 px-3 flex gap-2">
                          <RotateCcw size={14} />
                          Rollback
                        </Button>
                      </div>
                      <p className="text-sm text-on-surface-variant mb-2 font-medium">
                        {v.changeDescription || 'Rezept aktualisiert'}
                      </p>
                      
                      {/* Simple diff view */}
                      {v.changes && Object.keys(v.changes).length > 0 && (
                        <div className="mt-4 border-t border-outline-variant/20 pt-4">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 mb-2">Änderungen (Delta)</h4>
                          <pre className="text-xs bg-black/5 p-3 rounded-xl overflow-x-auto text-on-surface-variant font-mono">
                            {JSON.stringify(v.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
