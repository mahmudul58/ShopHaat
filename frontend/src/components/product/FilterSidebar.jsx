import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const RATING_OPTIONS = [4, 3, 2, 1];

/**
 * Reusable filter panel. Dark-theme variant: surface-elevated sections with
 * saffron focus rings, border-subtle dividers.
 */
export function FilterSidebar({ filters, onChange, brands = [], className = "" }) {
  function patch(partial) {
    onChange({ ...filters, ...partial });
  }

  const selectedBrands = filters.brand
    ? filters.brand.split(",").filter(Boolean)
    : [];

  function toggleBrand(slug) {
    const next = selectedBrands.includes(slug)
      ? selectedBrands.filter((s) => s !== slug)
      : [...selectedBrands, slug];
    patch({ brand: next.join(",") });
  }

  return (
    <aside className={`space-y-5 ${className}`}>
      <FilterSection title="Price">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={filters.min_price || ""}
            onChange={(e) => patch({ min_price: e.target.value })}
            className="w-full rounded-lg border border-border-subtle bg-canvas-elevated px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <span className="text-text-muted">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={filters.max_price || ""}
            onChange={(e) => patch({ max_price: e.target.value })}
            className="w-full rounded-lg border border-border-subtle bg-canvas-elevated px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      </FilterSection>

      {brands.length > 0 && (
        <FilterSection title="Brand">
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {brands.map((brand) => (
              <label
                key={brand.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm text-text-secondary hover:bg-canvas"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.slug)}
                  onChange={() => toggleBrand(brand.slug)}
                  className="h-4 w-4 rounded border-border-subtle bg-canvas-elevated text-brand focus:ring-brand/30"
                />
                <span className="flex-1">{brand.name}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Rating">
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() =>
                patch({ min_rating: Number(filters.min_rating) === r ? "" : r })
              }
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                Number(filters.min_rating) === r
                  ? "border-brand bg-brand/15 text-brand"
                  : "border-border-subtle text-text-secondary hover:border-brand"
              }`}
            >
              {r}+ ★
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Availability">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={Boolean(filters.in_stock)}
            onChange={(e) => patch({ in_stock: e.target.checked })}
            className="h-4 w-4 rounded border-border-subtle bg-canvas-elevated text-brand focus:ring-brand/30"
          />
          In stock only
        </label>
      </FilterSection>

      {(filters.brand || filters.min_price || filters.max_price || filters.min_rating || filters.in_stock) && (
        <button
          type="button"
          onClick={() => patch({
            brand: "",
            min_price: "",
            max_price: "",
            min_rating: "",
            in_stock: "",
          })}
          className="w-full rounded-lg border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm font-medium text-text-secondary hover:bg-canvas"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border-subtle bg-canvas-elevated">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary"
      >
        {title}
        {open ? <FaChevronUp className="h-3 w-3" /> : <FaChevronDown className="h-3 w-3" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
