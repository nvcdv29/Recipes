import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Edit3, Trash2, AlertCircle, Layers } from 'lucide-react';
import { Button } from '../ui/Button';
import { RecipeForm } from '../recipes/RecipeForm';
import { BatchEditPanel } from './BatchEditPanel';
import { recordCorrection } from '../../services/ParallelImportProcessor';

interface BulkImportOverviewProps {
  recipes: any[];
  onCancel: () => void;
  onSaveAll: (recipes: any[]) => void;
}

export const BulkImportOverview = ({ recipes, onCancel, onSaveAll }: BulkImportOverviewProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentRecipes, setCurrentRecipes] = useState<any[]>(recipes);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleSaveEdit = async (updatedRecipe: any) => {
    const newRecipes = [...currentRecipes];
    const originalData = currentRecipes[editingIndex!].originalExtractedData;
    
    // Feedback loop: Record corrections if properties changed
    if (originalData) {
       await recordCorrection(originalData, updatedRecipe);
    }
    
    // Clear review flag once edited
    updatedRecipe.needsReview = false;
    
    newRecipes[editingIndex!] = updatedRecipe;
    setCurrentRecipes(newRecipes);
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    const newRecipes = [...currentRecipes];
    newRecipes.splice(index, 1);
    setCurrentRecipes(newRecipes);
    const newSelected = new Set(selectedIndices);
    newSelected.delete(index);
    setSelectedIndices(newSelected);
  };

  const handleApplyBatchTags = (tags: string[]) => {
    const newRecipes = [...currentRecipes];
    selectedIndices.forEach(idx => {
       const recipe = newRecipes[idx];
       recipe.tags = [...new Set([...(recipe.tags || []), ...tags])];
    });
    setCurrentRecipes(newRecipes);
    setSelectedIndices(new Set()); // Clear selection after applying
    setShowBatchEdit(false);
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  if (editingIndex !== null) {
    return (
      <RecipeForm 
        recipe={currentRecipes[editingIndex]} 
        onCancel={() => setEditingIndex(null)}
        onSave={(updatedRecipe: any) => handleSaveEdit(updatedRecipe)}
        user={{ uid: 'temp', displayName: 'temp' }} 
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
      <div className="bg-white dark:bg-surface-container-low rounded-[3rem] p-10 lg:p-16 shadow-2xl border border-outline-variant/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl font-serif font-bold text-primary">Bulk Import Übersicht</h2>
          <div className="flex gap-2 items-center">
            <Button 
              variant="secondary"
              onClick={() => setShowBatchEdit(!showBatchEdit)}
              disabled={currentRecipes.length === 0}
              className="px-4 py-2 text-sm flex items-center gap-2"
            >
              <Layers size={18} /> Stapel-Bearbeitung
            </Button>
            <button onClick={onCancel} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showBatchEdit && (
            <BatchEditPanel 
              selectedCount={selectedIndices.size} 
              onApplyTags={handleApplyBatchTags} 
              onClose={() => setShowBatchEdit(false)} 
            />
          )}
        </AnimatePresence>

        <p className="text-on-surface-variant mb-8">
          {currentRecipes.length} Rezept(e) erfolgreich erkannt. Bitte überprüfe sie vor dem Speichern.
        </p>

        <div className="space-y-4 mb-8">
          {currentRecipes.map((recipe, index) => (
            <div key={index} className={`flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border transition-colors ${selectedIndices.has(index) ? 'border-primary shadow-sm bg-primary/5' : 'border-outline-variant/10'} ${recipe.needsReview ? 'border-amber-400 bg-amber-50/30' : ''}`}>
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                {showBatchEdit && (
                  <input 
                    type="checkbox" 
                    checked={selectedIndices.has(index)} 
                    onChange={() => toggleSelection(index)}
                    className="w-5 h-5 text-primary border-outline-variant rounded focus:ring-primary"
                  />
                )}
                {recipe.images?.[0] ? (
                  <img src={recipe.images[0]} alt={recipe.title} className="dark:brightness-90 transition-all w-16 h-16 object-cover rounded-xl shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <BookOpen size={24} />
                  </div>
                )}
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg truncate">{recipe.title || 'Ohne Titel'}</h3>
                    {recipe.needsReview && (
                      <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full" title={`Konfidenz: ${Math.round(recipe.confidenceScore * 100)}%`}>
                        <AlertCircle size={12} /> KI-Werte prüfen
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant/70 truncate">
                    {recipe.sourceName || recipe.sourceUrl || 'Keine Quelle angegeben'} 
                    {recipe.tags?.length > 0 && ` • Tags: ${recipe.tags.join(', ')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
