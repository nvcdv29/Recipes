import { useState } from 'react';
import { useCollections } from '../../hooks/useCollections';
import { Button } from '../ui/Button';
import { Bookmark, Plus, X, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';

interface CollectionSelectorModalProps {
  recipeId: string;
  onClose: () => void;
}

export const CollectionSelectorModal = ({ recipeId, onClose }: CollectionSelectorModalProps) => {
  const { collections, updateCollection, addCollection } = useCollections();
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleToggle = async (collectionId: string, currentRecipeIds: string[]) => {
    const isIncluded = currentRecipeIds.includes(recipeId);
    const newIds = isIncluded 
      ? currentRecipeIds.filter(id => id !== recipeId)
      : [...currentRecipeIds, recipeId];

    await updateCollection(collectionId, { recipeIds: newIds });
    toast.success(isIncluded ? 'Aus Sammlung entfernt' : 'Zu Sammlung hinzugefügt');
  };

  const handleCreate = async () => {
    if (!newCollectionName.trim()) return;
    await addCollection({
      name: newCollectionName.trim(),
      description: '',
      recipeIds: [recipeId],
      isShared: false,
      icon: '📂',
      color: '#4CAF50'
    });
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-serif font-bold text-on-surface flex items-center gap-2">
            <Bookmark size={24} className="text-primary" />
            Speichern in...
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto min-h-[200px]">
          {collections.length === 0 && !isCreating ? (
            <div className="text-center py-8">
              <p className="text-on-surface-variant mb-4">Du hast noch keine Sammlungen.</p>
              <Button onClick={() => setIsCreating(true)} icon={Plus}>Erste Sammlung erstellen</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map(c => {
                const isIncluded = c.recipeIds.includes(recipeId);
                return (
                  <button
                    key={c.id}
                    onClick={() => handleToggle(c.id!, c.recipeIds)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors text-left"
                  >
                    <div className="text-on-surface-variant shrink-0">
                      {isIncluded ? <CheckCircle2 className="text-primary" /> : <Circle />}
                    </div>
                    <div>
                      <div className="font-bold text-on-surface flex items-center gap-2">
                        <span style={{ color: c.color }}>{c.icon || '📂'}</span>
                        {c.name}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {c.recipeIds.length} Rezepte
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {collections.length > 0 && !isCreating && (
          <div className="p-6 border-t border-outline-variant/10 shrink-0">
            <Button variant="outline" className="w-full border-dashed border-2" onClick={() => setIsCreating(true)} icon={Plus}>
              Neue Sammlung
            </Button>
          </div>
        )}

        {isCreating && (
          <div className="p-6 border-t border-outline-variant/10 bg-surface-container-low shrink-0">
            <input 
              autoFocus
              type="text"
              placeholder="Name der Sammlung..."
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="w-full bg-white border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setIsCreating(false)}>Abbrechen</Button>
              <Button className="flex-1" disabled={!newCollectionName.trim()} onClick={handleCreate}>Erstellen</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
