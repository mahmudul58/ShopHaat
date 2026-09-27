/**
 * Controlled component: the parent (ProductDetailPage) owns which variant
 * is selected and passes it down, so price/stock/gallery all update from
 * one source of truth instead of each reading a duplicated local state.
 *
 * Dark-theme variant: surface-elevated chips with saffron active state.
 */
export function VariantSelector({ variants, selectedVariant, onSelect }) {
  const sizes = [...new Set(variants.map((variant) => variant.size).filter(Boolean))];
  const colors = [...new Set(variants.map((variant) => variant.color).filter(Boolean))];

  function selectBySizeColor(size, color) {
    let match = variants.find(
      (variant) => (variant.size || null) === (size || null) && (variant.color || null) === (color || null)
    );

    // If the exact combination doesn't exist, try to select any variant that matches the newly clicked attribute
    if (!match) {
      if (size !== selectedVariant?.size) {
        match = variants.find((variant) => (variant.size || null) === (size || null));
      } else if (color !== selectedVariant?.color) {
        match = variants.find((variant) => (variant.color || null) === (color || null));
      }
    }

    if (match) onSelect(match);
  }

  return (
    <div className="space-y-4">
      {sizes.length > 0 && (
        <div>
          <span className="mb-1 block text-sm font-medium text-text-secondary">Size</span>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => selectBySizeColor(size, selectedVariant?.color)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  selectedVariant?.size === size
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-border-subtle bg-canvas-elevated text-text-secondary hover:border-border-strong hover:text-text-primary"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <span className="mb-1 block text-sm font-medium text-text-secondary">Color</span>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => selectBySizeColor(selectedVariant?.size, color)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  selectedVariant?.color === color
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-border-subtle bg-canvas-elevated text-text-secondary hover:border-border-strong hover:text-text-primary"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}


    </div>
  );
}
