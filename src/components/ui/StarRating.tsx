import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  interactive?: boolean;
  size?: number;
}

export const StarRating = ({ rating, onChange, interactive = false, size = 5 }: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex items-center gap-1 select-none">
      {[...Array(size)].map((_, i) => {
        const starValue = i + 1;
        const isHalf = displayRating === i + 0.5;
        const isFilled = displayRating >= starValue;

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
          if (!interactive || !onChange) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const width = rect.width;
          const val = i + (x < width / 2 ? 0.5 : 1.0);
          onChange(val);
        };

        const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
          if (!interactive) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const width = rect.width;
          const val = i + (x < width / 2 ? 0.5 : 1.0);
          setHoverRating(val);
        };

        const handleMouseLeave = () => {
          if (!interactive) return;
          setHoverRating(null);
        };

        return (
          <button
            key={i}
            type="button"
            className={`relative p-0.5 transition-transform duration-150 focus:outline-none ${
              interactive ? "hover:scale-110 cursor-pointer" : "cursor-default"
            }`}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ background: 'none', border: 'none' }}
          >
            {/* Empty Star (Background) */}
            <Star className="h-6 w-6 text-neutral-300 fill-neutral-100" />

            {/* Half Filled (Overlay) */}
            {isHalf && (
              <div className="absolute inset-0 p-0.5 overflow-hidden w-[50%] select-none pointer-events-none">
                <Star className="h-6 w-6 text-amber-400 fill-amber-400 max-w-none" />
              </div>
            )}

            {/* Fully Filled (Overlay) */}
            {isFilled && (
              <div className="absolute inset-0 p-0.5 overflow-hidden select-none pointer-events-none">
                <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
