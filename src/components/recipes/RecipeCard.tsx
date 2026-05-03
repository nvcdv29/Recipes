import { motion } from 'motion/react';
import { Star, BookOpen, Clock, Users } from 'lucide-react';
import { Recipe } from '../../types';
import { RatingStars } from './RatingStars';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export const RecipeCard = ({ recipe, onClick }: RecipeCardProps) => (
  <motion.div 
    layout
    whileHover={{ y: -8 }}
    onClick={onClick}
    className="bg-white rounded-[2rem] overflow-hidden cursor-pointer group border border-outline-variant/5 hover:shadow-2xl hover:shadow-primary/5 transition-all"
  >
    <div className="aspect-[4/3] relative overflow-hidden">
      <img 
        src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/800/600`} 
        alt={recipe.title}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
        <div className="flex flex-wrap justify-end gap-2">
          {recipe.dietary?.slice(0, 2).map(d => (
            <span key={d} className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm">
              {d}
            </span>
          ))}
        </div>
        {recipe.averageRating && (
          <div className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full flex items-center gap-1.5 shadow-sm">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold text-primary">{recipe.averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary/60 uppercase tracking-wider">
          {recipe.categories && recipe.categories.length > 0 && (
            <>
              <span>{recipe.categories[0]}</span>
              <span className="w-1 h-1 bg-primary/20 rounded-full" />
            </>
          )}
          <span>{recipe.difficulty}</span>
        </div>
        {recipe.averageRating && (
          <RatingStars rating={recipe.averageRating} count={recipe.ratingCount} size={12} />
        )}
      </div>
      <h3 className="text-xl font-serif font-bold text-on-surface group-hover:text-primary transition-colors mb-2 line-clamp-1">
        {recipe.title}
      </h3>
      {(recipe.sourceName || recipe.sourceUrl) && (
        <div className="mb-4 text-xs text-on-surface-variant/70 flex items-center gap-1.5">
          <BookOpen size={12} />
          {recipe.sourceUrl ? (
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline" onClick={e => e.stopPropagation()}>
              {recipe.sourceName || recipe.sourceUrl}
            </a>
          ) : (
            <span>{recipe.sourceName}</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between text-on-surface-variant/60 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock size={16} />
            <span>{recipe.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={16} />
            <span>{recipe.servings}</span>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);
