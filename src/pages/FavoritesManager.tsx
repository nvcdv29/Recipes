import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRecipes } from '../contexts/RecipeContext';
import { useCollections } from '../hooks/useCollections';
import { RecipeCard } from '../components/recipes/RecipeCard';
import { CollectionCard } from '../components/collections/CollectionCard';
import { CollectionDetail } from '../components/collections/CollectionDetail';
import { Button } from '../components/ui/Button';
import { Bookmark, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecipeCollection } from '../types';

export const FavoritesManager = () => {
  const { userProfile } = useAuth();
  const { recipes } = useRecipes();
  const { collections, sharedCollections, addCollection } = useCollections();
  const navigate = useNavigate();

  const [selectedCollection, setSelectedCollection] = useState<RecipeCollection | null>(null);

  if (selectedCollection) {
    return <CollectionDetail collection={selectedCollection} onBack={() => setSelectedCollection(null)} />;
  }

  const favoriteRecipes = recipes.filter(r => userProfile?.favorites?.includes(r.id || ''));

  const handleCreateCollection = async () => {
    const name = window.prompt("Name der neuen Sammlung:");
    if (!name) return;
    await addCollection({
      name,
      description: '',
      recipeIds: [],
      isShared: false,
      icon: '📂',
      color: '#4CAF50'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-12">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="text-primary" size={32} />
          <h1 className="text-3xl font-serif font-bold text-on-surface">Favoriten</h1>
        </div>
        {favoriteRecipes.length === 0 ? (
          <p className="text-on-surface-variant bg-surface-container-low p-6 rounded-2xl">
            Du hast noch keine Rezepte als Favoriten markiert. Klicke auf das Herz-Symbol bei einem Rezept, um es hier zu speichern.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favoriteRecipes.map(r => (
              <RecipeCard key={r.id} recipe={r} onClick={() => navigate(`/recipe/${r.id}`)} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-outline-variant/20 pt-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-3xl font-serif font-bold text-on-surface">Meine Sammlungen</h2>
          <Button onClick={handleCreateCollection} icon={Plus}>Neue Sammlung</Button>
        </div>
        {collections.length === 0 ? (
          <p className="text-on-surface-variant bg-surface-container-low p-6 rounded-2xl">
            Du hast noch keine Sammlungen erstellt.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map(c => (
              <CollectionCard key={c.id} collection={c} onClick={() => setSelectedCollection(c)} />
            ))}
          </div>
        )}
      </div>

      {sharedCollections.length > 0 && (
        <div className="border-t border-outline-variant/20 pt-12">
          <h2 className="text-3xl font-serif font-bold text-on-surface mb-6">Geteilte Sammlungen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sharedCollections.map(c => (
              <CollectionCard key={c.id} collection={c} onClick={() => setSelectedCollection(c)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
