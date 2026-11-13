import { motion } from 'motion/react';
import { Star, Clock, Users, Heart } from 'lucide-react';
import { Recipe } from '../../types';
import { RatingStars } from './RatingStars';
import { useAuthStore as useAuth } from '../../stores/authStore';
import { cn } from '../../lib/utils';

interface RecipeListItemProps {
  recipe: Recipe;
  onClick: () => void;
}

export const RecipeListItem = ({ recipe, onClick }: RecipeListItemProps) => {
  const { userProfile, toggleFavorite } = useAuth();
  const isFavorite = userProfile?.favorites?.includes(recipe.id || '') || false;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recipe.id) {
      toggleFavorite(recipe.id);
    }
  };

  return (
    <motion.div 
      layout
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="bg-white dark:bg-surface-container-low rounded-xl overflow-hidden cursor-pointer group border border-outline-variant/10 hover:border-primary/30 transition-all flex h-24 items-center pr-4 mb-3 shadow-sm hover:shadow-md"
    >
      <div className="h-full aspect-square relative shrink-0">
        <img 
          src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/80/80`} 
          alt={recipe.title}
          className="dark:brightness-90 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex-1 min-w-0 pl-4 py-2 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-serif font-bold text-on-surface group-hover:text-primary transition-colors truncate">
            {recipe.title}
          </h3>
          <div className="flex gap-1 shrink-0">
            {recipe.dietary?.slice(0, 1).map(d => (
              <span key={d} className="px-2 py-0.5 bg-primary/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary">
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-on-surface-variant/70">
          {recipe.categories && recipe.categories.length > 0 && (
            <span className="font-medium text-primary/80 uppercase tracking-wider">{recipe.categories[0]}</span>
          )}
          {recipe.categories && recipe.categories.length > 0 && <span className="w-1 h-1 bg-on-surface-variant/30 rounded-full shrink-0" />}
          
          <div className="flex items-center gap-1 shrink-0">
            <Clock size={12} />
            <span>{recipe.duration}</span>
          </div>
          <span className="w-1 h-1 bg-on-surface-variant/30 rounded-full shrink-0" />
          
          <div className="flex items-center gap-1 shrink-0">
            <Users size={12} />
            <span>{recipe.servings}</span>
          </div>
          <span className="w-1 h-1 bg-on-surface-variant/30 rounded-full shrink-0" />
          
          <span className="shrink-0">{recipe.difficulty}</span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-4 ml-4">
        {recipe.averageRating ? (
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-on-surface">{recipe.averageRating.toFixed(1)}</span>
              <Star size={14} className="fill-amber-400 text-amber-400" />
            </div>
            <span className="text-[10px] text-on-surface-variant">({recipe.ratingCount})</span>
          </div>
        ) : (
          <div className="hidden sm:block text-xs text-on-surface-variant/50">Neu</div>
        )}

        <button 
          onClick={handleFavoriteClick}
          className="p-2 bg-surface-container-low hover:bg-surface-container-high rounded-full transition-all shrink-0"
        >
          <Heart 
            size={18} 
            className={cn("transition-colors", isFavorite ? "fill-[#FF4B4B] text-[#FF4B4B]" : "text-gray-400")} 
          />
        </button>
      </div>
    </motion.div>
  );
};
