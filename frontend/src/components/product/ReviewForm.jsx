import { useState } from "react";
import { FaStar, FaRegStar } from "react-icons/fa";

import { extractErrorMessage } from "../../services/apiClient";
import { useToast } from "../../hooks/useToast";
import { Button } from "../common/Button";
import { Textarea } from "../common/Input";

export function ReviewForm({ onSubmit }) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ rating, comment });
      setComment("");
      showToast({ type: "success", message: "Thanks — your review is pending approval." });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not submit your review."),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card"
    >
      <div>
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">Your rating</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`Rate ${value} stars`}
              className="rounded p-0.5 transition-colors hover:bg-canvas-elevated"
            >
              {value <= rating ? (
                <FaStar size={20} className="text-amber-400" />
              ) : (
                <FaRegStar size={20} className="text-text-muted" />
              )}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        label="Your review"
        name="comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts about this product (optional)"
        rows={3}
      />
      <Button type="submit" isLoading={isSubmitting}>
        Submit Review
      </Button>
    </form>
  );
}
