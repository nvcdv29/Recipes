import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export const RatingStars = ({ rating, count, size = 16, interactive = false, onRate }: RatingStarsProps) => {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHover(star)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onRate && onRate(star)}
            className={cn(
              "transition-all",
              interactive ? "hover:scale-125 cursor-pointer" : "cursor-default"
            )}
          >
            <Star
              size={size}
              className={cn(
                "transition-colors",
                (hover || rating) >= star
                  ? "fill-amber-400 text-amber-400"
                  : "text-outline-variant/40"
              )}
            />
          </button>
        ))}
      </div>
      {count !== undefined && (
        <span className="text-xs font-bold text-on-surface-variant/40">
          ({count})
        </span>
      )}
    </div>
  );
};
