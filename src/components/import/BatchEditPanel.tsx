import { useState } from 'react';
import { motion } from 'motion/react';
import { Tag, Check } from 'lucide-react';
import { Button } from '../ui/Button';

export const BatchEditPanel = ({ 
  selectedCount, 
  onApplyTags, 
  onClose 
}: { 
  selectedCount: number, 
  onApplyTags: (tags: string[]) => void, 
  onClose: () => void 
}) => {
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-primary/5 rounded-2xl p-4 mb-6 border border-primary/20"
    >
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h4 className="font-bold flex items-center gap-2">
            <Tag size={18} />
            Stapel-Bearbeitung ({selectedCount} ausgewählt)
          </h4>
          <p className="text-sm text-on-surface-variant">Füge Tags zu allen ausgewählten Rezepten hinzu</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
          {tags.map(tag => (
            <span key={tag} className="px-3 py-1 bg-white dark:bg-surface-container-low border border-primary/20 text-sm rounded-full flex items-center gap-1">
              {tag}
              <button 
                onClick={() => setTags(tags.filter(t => t !== tag))}
                className="text-on-surface-variant hover:text-red-500"
              >
                &times;
              </button>
            </span>
          ))}
          
          <div className="flex gap-2">
            <input 
              type="text" 
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tag hinzufügen..."
              className="px-3 py-1.5 rounded-lg border border-outline-variant/10 text-sm min-w-[120px]"
            />
            <Button 
               onClick={handleAddTag} 
               variant="secondary" 
               className="!py-1.5 !px-3 !text-sm"
            >
               +
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Button 
            onClick={() => onApplyTags(tags)} 
            disabled={tags.length === 0}
            className="flex-1 sm:flex-none flex items-center gap-1"
          >
            <Check size={16} /> Anwenden
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Fertig
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
