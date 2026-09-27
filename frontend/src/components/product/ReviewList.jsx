import { FaCheckCircle } from "react-icons/fa";

import { EmptyState } from "../common/EmptyState";
import { Skeleton } from "../common/Skeleton";
import { RatingStars } from "./RatingStars";

export function ReviewList({ reviews, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <EmptyState
        title="No reviews yet"
        description="Be the first to review this product."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card"
        >
          <div className="flex flex-wrap items-center gap-2">
            <RatingStars rating={review.rating} size={14} />
            <span className="text-sm font-semibold text-text-primary">
              {review.user_name || "Verified buyer"}
            </span>
            {review.is_verified_purchase && (
              <span className="inline-flex items-center gap-1 rounded-full bg-state-success/15 px-2 py-0.5 text-[10px] font-semibold text-state-success">
                <FaCheckCircle className="h-2.5 w-2.5" /> Verified Purchase
              </span>
            )}
          </div>
          {review.comment && (
            <p className="mt-2 text-sm text-text-secondary">{review.comment}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
