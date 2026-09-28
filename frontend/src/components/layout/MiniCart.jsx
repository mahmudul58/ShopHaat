import { Link } from "react-router-dom";

import { useCart } from "../../hooks/useCart";
import { Money } from "../common/Money";
import { Button } from "../common/Button";

/**
 * Floating mini-cart preview. Dark-theme variant: glassmorphism dropdown.
 */
export function MiniCart({ isOpen, onClose }) {
  const { cart } = useCart();

  if (!isOpen || cart.items.length === 0) return null;

  return (
    <div className="absolute right-0 top-full z-modal pt-2 w-80">
      <div className="rounded-2xl border border-border-subtle bg-canvas-elevated backdrop-blur-md shadow-float">
        <div className="p-4">
        <ul className="max-h-64 divide-y divide-border-subtle overflow-y-auto">
              {cart.items.map((item) => {
                const name = item.variant?.product?.name || "Product";
                const variantLabel = [item.variant?.size, item.variant?.color]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-medium text-text-primary">{name}</p>
                      {variantLabel && (
                        <p className="line-clamp-1 text-xs text-text-secondary">{variantLabel}</p>
                      )}
                      <p className="text-xs text-text-secondary">Qty {item.quantity}</p>
                    </div>
                    <Money
                      amount={item.line_total}
                      className="shrink-0 font-semibold text-text-primary"
                    />
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3 text-sm font-semibold">
              <span>Subtotal</span>
              <Money amount={cart.subtotal} className="text-text-primary" />
            </div>
            <Link to="/cart" onClick={onClose} className="mt-3 block">
              <Button className="w-full">View cart</Button>
            </Link>

      </div>
      </div>
    </div>
  );
}
