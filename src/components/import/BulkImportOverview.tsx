import { useState } from 'react';
import { motion } from 'motion/react';
import { X, BookOpen, Edit3, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { RecipeForm } from '../recipes/RecipeForm';

interface BulkImportOverviewProps {
  recipes: any[];
  onCancel: () => void;
  onSaveAll: (recipes: any[]) => void;
}

export const BulkImportOverview = ({ recipes, onCancel, onSaveAll }: BulkImportOverviewProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentRecipes, setCurrentRecipes] = useState<any[]>(recipes);

  const handleSaveEdit = (updatedRecipe: any) => {
    const newRecipes = [...currentRecipes];
    newRecipes[editingIndex!] = updatedRecipe;
    setCurrentRecipes(newRecipes);
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    const newRecipes = [...currentRecipes];
    newRecipes.splice(index, 1);
    setCurrentRecipes(newRecipes);
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
      <div className="bg-white rounded-[3rem] p-10 lg:p-16 shadow-2xl border border-outline-variant/10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-serif font-bold text-primary">Bulk Import Übersicht</h2>
          <button onClick={onCancel} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <p className="text-on-surface-variant mb-8">
          {currentRecipes.length} Rezept(e) erfolgreich erkannt. Bitte überprüfe sie vor dem Speichern.
        </p>

        <div className="space-y-4 mb-8">
          {currentRecipes.map((recipe, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
              <div className="flex items-center gap-4">
                {recipe.images?.[0] ? (
                  <img src={recipe.images[0]} alt={recipe.title} className="w-16 h-16 object-cover rounded-xl" />
                ) : (
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <BookOpen size={24} />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{recipe.title}</h3>
                  <p className="text-sm text-on-surface-variant/70">
                    {recipe.sourceName || recipe.sourceUrl || 'Keine Quelle angegeben'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
