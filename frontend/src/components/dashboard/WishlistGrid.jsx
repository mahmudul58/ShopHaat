import { EmptyState } from "../common/EmptyState";
import { Button } from "../common/Button";
import { ProductCard } from "../product/ProductCard";
import { useWishlist } from "../../hooks/useWishlist";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useNavigate } from "react-router-dom";

/**
 * Wishlist grid. Uses the shared WishlistContext so removing a card
 * updates the global state (Navbar heart counter, etc.) automatically.
 *
 * Dark-theme variant: dark glass remove button instead of white pill.
 */
export function WishlistGrid({ onAction }) {
  const { items, removeItem } = useWishlist();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        description="Save products you love to find them here later."
        action={
          <Button onClick={() => navigate("/catalog")}>Browse Catalog</Button>
        }
      />
    );
  }

  async function handleMoveToCart(product) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      await addItem(product.first_variant_id, 1);
      showToast({ type: "success", message: `Moved "${product.name}" to cart` });
      onAction?.();
    } catch {
      showToast({ type: "error", message: "Could not add to cart" });
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const product = item.product_detail || item.product;
        if (!product) return null;
        return (
          <div key={item.id} className="relative">
            <ProductCard product={product} />
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="absolute right-2 top-2 z-10 hidden rounded-lg border border-border-subtle bg-canvas-elevated/90 px-2 py-1 text-xs font-medium text-state-danger shadow-card backdrop-blur-md hover:bg-state-danger/15"
              aria-label={`Remove ${product.name} from wishlist`}
            >
              Remove
            </button>
          </div>
        );
      })}
    </div>
  );
}
