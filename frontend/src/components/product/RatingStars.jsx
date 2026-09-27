import { FaStar, FaRegStar } from "react-icons/fa";

export function RatingStars({ rating = 0, size = 14, interactive = false, onChange }) {
  const rounded = Math.round(Number(rating));
  const stars = [1, 2, 3, 4, 5].map((position) =>
    position <= rounded ? (
      <FaStar key={position} size={size} className="text-state-warning" />
    ) : (
      <FaRegStar key={position} size={size} className="text-text-muted" />
    )
  );

  if (!interactive) {
    return (
      <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
        {stars}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Your rating"
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= rounded;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filled}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            onClick={() => onChange?.(value)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {filled ? (
              <FaStar size={size} className="text-state-warning" />
            ) : (
              <FaRegStar size={size} className="text-text-muted hover:text-state-warning" />
            )}
          </button>
        );
      })}
    </div>
  );
}
