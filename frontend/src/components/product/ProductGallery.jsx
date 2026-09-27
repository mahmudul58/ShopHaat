import { useState } from "react";
import { FaSearch } from "react-icons/fa";

/**
 * Product image gallery:
 *  - Main image (CSS hover-zoom).
 *  - Vertical thumbnail strip on desktop; horizontal scroll on mobile.
 *  - Filters thumbnails by the selected variant when relevant images exist.
 *
 *  Dark-theme variant: surface-card panel around the gallery + saffron active
 *  border on thumbnails.
 */
export function ProductGallery({ images = [], selectedVariantId }) {
  const relevant = selectedVariantId
    ? images.filter(
        (image) => !image.variant || image.variant === selectedVariantId
      )
    : images;
  const displayImages = relevant.length > 0 ? relevant : images;

  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = displayImages[Math.min(activeIndex, displayImages.length - 1)];

  if (displayImages.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-border-subtle bg-surface-card text-sm text-text-muted">
        No image
      </div>
    );
  }

  const thumbnails = displayImages.slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="group relative w-full overflow-hidden rounded-2xl bg-canvas-elevated aspect-[4/5]">
        <img
          src={activeImage.url}
          alt={activeImage.alt_text || "Product image"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-surface-card/90 px-3 py-1.5 text-xs font-medium text-text-secondary opacity-0 shadow-sm backdrop-blur-md transition-opacity group-hover:opacity-100">
          <FaSearch className="h-3 w-3" /> Hover to zoom
        </span>
      </div>

      {/* Thumbnails */}
      {thumbnails.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {thumbnails.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`aspect-square w-full overflow-hidden rounded-xl border-2 transition-all ${
                index === activeIndex
                  ? "border-text-primary opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100 hover:border-border-strong"
              }`}
            >
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-cover bg-canvas-elevated"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
