import { useState } from 'react';
import { Recipe } from '../../types';
import { Button } from '../ui/Button';
import { AlertTriangle, Merge, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface DuplicateDetectorProps {
  duplicates: { recipe: Recipe, score: number }[];
  onMerge: (existingRecipe: Recipe) => void;
  onSaveAsVariant: () => void;
  onSaveAnyway: () => void;
  onCancel: () => void;
}

export const DuplicateDetector = ({ duplicates, onMerge, onSaveAsVariant, onSaveAnyway, onCancel }: DuplicateDetectorProps) => {
  const [selectedDuplicate, setSelectedDuplicate] = useState<Recipe | null>(duplicates[0]?.recipe || null);

  if (duplicates.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#FFF8E1] p-6 border-b border-[#FFE082] flex items-start gap-4">
          <div className="bg-[#FFE082] p-3 rounded-full shrink-0">
            <AlertTriangle className="text-[#FF8F00]" size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#FF8F00]">Mögliches Duplikat gefunden</h2>
            <p className="text-[#FF8F00]/80 mt-1">Dieses Rezept ähnelt bereits {duplicates.length === 1 ? 'einem' : 'mehreren'} gespeicherten Rezepten in deiner Sammlung.</p>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="mb-4">
            <h3 className="font-bold text-on-surface mb-3">Ähnliche Rezepte:</h3>
            <div className="space-y-3">
              {duplicates.map((d, i) => (
                <div 
                  key={d.recipe.id || i}
                  onClick={() => setSelectedDuplicate(d.recipe)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-4
                    ${selectedDuplicate?.id === d.recipe.id 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-outline-variant/30 hover:border-primary/50'
                    }`}
                >
                  <img src={d.recipe.images?.[0] || `https://picsum.photos/seed/${d.recipe.title}/100/100`} className="w-16 h-16 rounded-xl object-cover shrink-0" alt="" />
                  <div className="flex-1">
                    <h4 className="font-bold text-on-surface line-clamp-1">{d.recipe.title}</h4>
                    <p className="text-sm text-on-surface-variant flex items-center gap-2">
                      <span>Übereinstimmung: {Math.round(d.score * 100)}%</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1" 
              variant="primary"
              icon={Merge}
              onClick={() => selectedDuplicate && onMerge(selectedDuplicate)}
              disabled={!selectedDuplicate}
            >
              Überschreiben
            </Button>
            <Button 
              className="flex-1" 
              variant="outline"
              icon={Copy}
              onClick={onSaveAsVariant}
            >
              Als Variante
            </Button>
          </div>
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={onCancel}
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1"
            >
              Abbrechen
            </button>
            <button 
              onClick={onSaveAnyway}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 flex items-center gap-1"
            >
              <Check size={16} /> Trotzdem speichern
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
