import { useState } from "react";
import { FaCamera } from "react-icons/fa";

import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { Textarea } from "../common/Input";
import { RatingStars } from "../product/RatingStars";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { createReview } from "../../services/reviewService";

export function ReviewModal({ isOpen, onClose, orderItem, orderDate }) {
  const { showToast } = useToast();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [sellerRating, setSellerRating] = useState(0);
  const [sellerComment, setSellerComment] = useState("");

  const [deliveryRating, setDeliveryRating] = useState(0);
  const [deliveryComment, setDeliveryComment] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !orderItem) return null;

  function reset() {
    setRating(0);
    setComment("");
    setSellerRating(0);
    setSellerComment("");
    setDeliveryRating(0);
    setDeliveryComment("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (rating === 0) {
      showToast({
        type: "error",
        message: "Please give the product a rating before submitting.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createReview(orderItem.product_slug, {
        rating,
        comment,
        seller_rating: sellerRating || null,
        seller_comment: sellerComment,
        delivery_rating: deliveryRating || null,
        delivery_comment: deliveryComment,
      });
      showToast({ type: "success", message: "Review submitted — thank you!" });
      handleClose();
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Write a review" className="max-w-3xl">
      <div className="space-y-8">
        {/* Product */}
        <ReviewSection title="Your product review">
          <div className="mb-2 flex items-center gap-1">
            <RatingStars
              rating={rating}
              size={28}
              interactive
              onChange={setRating}
            />
            <span className="ml-2 text-xs text-text-secondary">
              {rating === 0 ? "Tap a star to rate" : `${rating}/5`}
            </span>
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border-subtle bg-canvas-elevated p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface-card">
              {orderItem.product_image ? (
                <img
                  src={orderItem.product_image}
                  alt={orderItem.product_name_snapshot}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                  No image
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded bg-brand px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Verified
                </span>
                <span className="font-semibold text-text-primary">
                  {orderItem.product_name_snapshot}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {orderItem.variant_attributes_snapshot}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Delivered {new Date(orderDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <Textarea
            label="Detail (optional)"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={250}
            rows={4}
            placeholder="Share your thoughts about the product quality and your experience."
            hint={`${comment.length}/250`}
          />

          <button
            type="button"
            className="mt-2 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-canvas-elevated px-3 py-4 text-text-secondary transition-colors hover:border-brand hover:text-brand"
          >
            <FaCamera className="mb-1" />
            <span className="text-xs">Upload photo (coming soon)</span>
          </button>
        </ReviewSection>

        {/* Seller */}
        <ReviewSection title="Rate the seller">
          <div className="mb-3">
            <RatingStars
              rating={sellerRating}
              size={24}
              interactive
              onChange={setSellerRating}
            />
          </div>
          <Textarea
            label="Detail (optional)"
            value={sellerComment}
            onChange={(event) => setSellerComment(event.target.value)}
            maxLength={250}
            rows={3}
            placeholder="How was your experience with the seller?"
            hint={`${sellerComment.length}/250`}
          />
        </ReviewSection>

        {/* Delivery */}
        <ReviewSection title="Rate the delivery">
          <div className="mb-3">
            <RatingStars
              rating={deliveryRating}
              size={24}
              interactive
              onChange={setDeliveryRating}
            />
          </div>
          <Textarea
            label="Detail (optional)"
            value={deliveryComment}
            onChange={(event) => setDeliveryComment(event.target.value)}
            maxLength={250}
            rows={3}
            placeholder="How was your delivery experience?"
            hint={`${deliveryComment.length}/250`}
          />
        </ReviewSection>

        <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Submit review
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ReviewSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-text-primary">{title}</h3>
      {children}
    </section>
  );
}
