import { RecipeCollection } from '../../types';
import { motion } from 'motion/react';
import { useRecipeStore as useRecipes } from '../../stores/recipeStore';

interface CollectionCardProps {
  collection: RecipeCollection;
  onClick: () => void;
}

export const CollectionCard = ({ collection, onClick }: CollectionCardProps) => {
  const { recipes } = useRecipes();
  
  // Get images from the first few recipes in the collection
  const collectionRecipes = collection.recipeIds
    .map(id => recipes.find(r => r.id === id))
    .filter(r => !!r) as typeof recipes;
    
  const previewImages = collectionRecipes
    .map(r => r.images[0])
    .filter(img => !!img)
    .slice(0, 3);

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="bg-white dark:bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 cursor-pointer hover:shadow-xl hover:border-primary/30 transition-all flex flex-col h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${collection.color}20`, color: collection.color }}
        >
          {collection.icon || '📂'}
        </div>
        <h3 className="text-xl font-bold text-on-surface line-clamp-1">{collection.name}</h3>
      </div>
      
      {collection.description && (
        <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">
          {collection.description}
        </p>
      )}

      <div className="mt-auto pt-4 flex items-end justify-between">
        <div className="flex -space-x-2">
          {previewImages.length > 0 ? (
            previewImages.map((img, i) => (
              <div 
                key={i} 
                className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-surface"
              >
                <img src={img} alt="" className="dark:brightness-90 transition-all w-full h-full object-cover" />
              </div>
            ))
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center text-[10px] text-on-surface-variant font-bold">
              0
            </div>
          )}
        </div>
        <span className="text-sm font-medium text-on-surface-variant bg-surface px-3 py-1 rounded-full">
          {collection.recipeIds.length} Rezepte
        </span>
      </div>
    </motion.div>
  );
};
