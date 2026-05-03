import { useState } from 'react';
import { RecipeCollection, Recipe } from '../../types';
import { useRecipes } from '../../contexts/RecipeContext';
import { useCollections } from '../../hooks/useCollections';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { ChevronLeft, Info, Settings, Trash2, Users, Search, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CollectionDetailProps {
  collection: RecipeCollection;
  onBack: () => void;
}

export const CollectionDetail = ({ collection, onBack }: CollectionDetailProps) => {
  const { user } = useAuth();
  const { recipes } = useRecipes();
  const { updateCollection, deleteCollection } = useCollections();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description || '');
  const [isShared, setIsShared] = useState(collection.isShared);
  const [searchQuery, setSearchQuery] = useState('');

  const isOwner = user?.uid === collection.userId;

  const collectionRecipes = collection.recipeIds
    .map(id => recipes.find(r => r.id === id))
    .filter(r => !!r) as Recipe[];

  const filteredRecipes = collectionRecipes.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.categories?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !isOwner) return;

    const items = Array.from(collection.recipeIds);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Optimistic UI update could be added here
    await updateCollection(collection.id!, { recipeIds: items });
  };

  const handleSaveSettings = async () => {
    if (!collection.id) return;
    await updateCollection(collection.id, { name, description, isShared });
    setIsEditing(false);
    toast.success('Sammlung aktualisiert');
  };

  const handleDelete = async () => {
    if (!collection.id) return;
    if (window.confirm('Möchtest du diese Sammlung wirklich löschen?')) {
      await deleteCollection(collection.id);
      onBack();
    }
  };

  const handleRemoveRecipe = async (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!collection.id || !isOwner) return;
    const newIds = collection.recipeIds.filter(id => id !== recipeId);
    await updateCollection(collection.id, { recipeIds: newIds });
    toast.success('Rezept entfernt');
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant -ml-2"
        >
          <ChevronLeft size={28} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-on-surface flex items-center gap-3">
            <span style={{ color: collection.color }}>{collection.icon || '📂'}</span>
            {collection.name}
          </h1>
          {collection.isShared && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-2">
              <Users size={12} /> Geteilt mit Familie
            </span>
          )}
        </div>
        {isOwner && (
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)} icon={Settings}>
            Einstellungen
          </Button>
        )}
      </div>

      {isEditing && isOwner && (
        <div className="bg-surface-container-low p-6 rounded-3xl mb-8 space-y-4 border border-outline-variant/20">
          <div>
            <label className="block text-sm justify-between font-bold text-on-surface mb-2">Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-white border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm justify-between font-bold text-on-surface mb-2">Beschreibung (optional)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-white border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="isShared" 
              checked={isShared} 
              onChange={e => setIsShared(e.target.checked)} 
              className="w-5 h-5 rounded text-primary focus:ring-primary/50"
            />
            <label htmlFor="isShared" className="text-on-surface font-medium">Mit Familie teilen</label>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" className="text-red-500 hover:bg-red-50 hover:border-red-200" onClick={handleDelete} icon={Trash2}>
              Löschen
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Abbrechen</Button>
              <Button onClick={handleSaveSettings}>Speichern</Button>
            </div>
          </div>
        </div>
      )}

      {collection.description && !isEditing && (
        <p className="text-on-surface-variant text-lg mb-8 bg-white/50 p-6 rounded-2xl border border-outline-variant/10">
          {collection.description}
        </p>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
          <input
            type="text"
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant/20 rounded-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
          />
        </div>
        <div className="text-sm text-on-surface-variant">
          {filteredRecipes.length} Rezepte
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="collection-recipes">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-4"
            >
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-12 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                  <Info size={48} className="mx-auto text-primary/40 mb-4" />
                  <p className="text-on-surface-variant">Keine Rezepte in dieser Sammlung.</p>
                </div>
              ) : (
                filteredRecipes.map((recipe, index) => (
                  <Draggable 
                    key={recipe.id} 
                    draggableId={recipe.id!} 
                    index={index}
                    isDragDisabled={!isOwner || searchQuery.length > 0}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-white border rounded-2xl flex overflow-hidden transition-all group cursor-pointer
                          ${snapshot.isDragging ? 'shadow-xl border-primary scale-[1.02]' : 'border-outline-variant/20 hover:shadow-md hover:border-primary/30'}
                        `}
                        onClick={() => navigate(`/recipe/${recipe.id}`)}
                      >
                        {isOwner && searchQuery.length === 0 && (
                          <div 
                            {...provided.dragHandleProps}
                            className="bg-surface-container-low p-3 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-grab active:cursor-grabbing border-r border-outline-variant/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical size={20} />
                          </div>
                        )}
                        
                        <div className="w-24 sm:w-32 h-24 sm:h-32 shrink-0">
                          <img 
                            src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/200/200`}
                            className="w-full h-full object-cover"
                            alt={recipe.title}
                          />
                        </div>
                        
                        <div className="p-4 flex-1 flex flex-col justify-center">
                          <h3 className="font-bold text-on-surface text-lg line-clamp-1">{recipe.title}</h3>
                          <div className="text-xs text-on-surface-variant mt-1 mb-2">
                            {recipe.categories?.join(', ')}
                          </div>
                          <div className="flex items-center gap-4 text-xs font-medium text-primary">
                            <span>{recipe.difficulty}</span>
                            <span>{recipe.duration}</span>
                          </div>
                        </div>

                        {isOwner && (
                          <div className="p-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => handleRemoveRecipe(recipe.id!, e)}
                              className="p-2 text-outline-variant hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              title="Aus Sammlung entfernen"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
