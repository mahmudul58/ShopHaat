import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/**
 * Desktop-only mega menu shown when hovering "Categories" in the navbar.
 * Renders categories in a multi-column grid; close on outside click.
 * Dark-theme variant: glassmorphism dropdown on canvas-elevated.
 */
const PREFERRED_ORDER = [
  "mobile", "smartphone", "smart",
  "laptop", "computer", "shoe", "sneaker",
  "headphone", "audio", "beat",
  "fashion", "apparel", "shirt",
  "furniture", "home", "minimal",
  "watch", "kitchen", "handicraft"
];

const getCategoryRank = (slug) => {
  const s = slug.toLowerCase();
  const index = PREFERRED_ORDER.findIndex((keyword) => s.includes(keyword));
  return index === -1 ? 999 : index;
};

export function MegaMenu({ categories, isOpen, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sortedCategories = categories
    ? [...categories].sort((a, b) => getCategoryRank(a.slug) - getCategoryRank(b.slug))
    : [];

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-modal w-full border-t border-border-subtle bg-canvas-elevated backdrop-blur-md shadow-float"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-4 px-4 py-6 sm:grid-cols-3 lg:grid-cols-4">
        {sortedCategories.length === 0 ? (
          <p className="col-span-full py-4 text-center text-sm text-text-secondary">
            Loading categories...
          </p>
        ) : (
          sortedCategories.map((category) => (
            <div key={category.id}>
              <Link
                to={`/catalog?category=${category.slug}`}
                onClick={onClose}
                className="mb-2 block text-sm font-semibold text-text-primary hover:text-brand"
              >
                {category.name}
              </Link>
              {category.subcategories?.length > 0 && (
                <ul className="space-y-1">
                  {category.subcategories.map((sub) => (
                    <li key={sub.id}>
                      <Link
                        to={`/catalog?subcategory=${sub.slug}`}
                        onClick={onClose}
                        className="text-sm text-text-secondary hover:text-brand"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
