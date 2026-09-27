import { Button } from "./Button";
import { FaCartShopping } from "react-icons/fa";

/**
 * Primary CTA: "Add to Cart". Calls onClick (which is expected to return
 * a promise). Shows spinner via Button's built-in `isLoading` prop.
 * Dark-theme variant: saffron CTA with cart icon.
 */
export function AddToCartButton({
  onClick,
  isLoading = false,
  disabled = false,
  label = "Add to Cart",
  className = "",
  size = "lg",
  showIcon = true,
}) {
  return (
    <Button
      onClick={onClick}
      isLoading={isLoading}
      disabled={disabled}
      size={size}
      className={className}
    >
      {showIcon && !isLoading && <FaCartShopping className="h-4 w-4" />}
      {label}
    </Button>
  );
}
