import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useWishlist } from "../../hooks/useWishlist";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useNavigate } from "react-router-dom";

/**
 * Heart icon button. Filled when the product is in the user's wishlist.
 * Click toggles it; if unauthenticated, redirects to /login first.
 *
 * Dark-theme variant: dark elevated backdrop, saffron filled state.
 */
export function WishlistButton({ productId, productName = "item", size = "md", className = "" }) {
  const { isAuthenticated } = useAuth();
  const { items, addItem, removeItem } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const inWishlist = items?.some((it) => {
    const pid = it.product?.id ?? it.product_id ?? it.id;
    return pid === productId;
  });

  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const btnSize = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      if (inWishlist) {
        // removeItem expects a wishlist item id; find it
        const item = items.find((it) => {
          const pid = it.product?.id ?? it.product_id ?? it.id;
          return pid === productId;
        });
        if (item) await removeItem(item.id);
        showToast({ type: "info", message: `Removed "${productName}" from wishlist` });
      } else {
        await addItem(productId);
        showToast({ type: "success", message: "Item added to wishlist" });
      }
    } catch {
      showToast({ type: "error", message: "Could not update wishlist" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={inWishlist}
      className={`inline-flex items-center justify-center rounded-full bg-canvas/80 backdrop-blur shadow-sm ring-1 ring-border-subtle transition-colors hover:bg-canvas-elevated hover:ring-brand hover:text-brand ${
        inWishlist ? "text-brand" : "text-text-secondary hover:text-brand"
      } ${btnSize} ${className}`}
    >
      {inWishlist ? <FaHeart className={sizeClass} /> : <FaRegHeart className={sizeClass} />}
    </button>
  );
}
