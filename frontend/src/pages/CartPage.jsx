import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaTrash,
  FaShoppingBag,
  FaHeart,
  FaArrowRight,
  FaStore,
  FaPlus,
  FaMinus,
  FaShieldAlt,
  FaTruck,
  FaUndo,
} from "react-icons/fa";

import { Button } from "../components/common/Button";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Checkbox } from "../components/common/Input";
import { EmptyState } from "../components/common/EmptyState";
import { Money } from "../components/common/Money";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

/**
 * CartPage — grouped-by-shop layout, dark ShopHaat variant.
 *
 * Dark-theme: bg-canvas page, surface-card shop groups with saffron accents,
 * sticky dark order summary, mobile sticky CTA with glass blur.
 */
export function CartPage() {
  const { cart, updateItem, removeItem } = useCart();
  const { items: wishlistItems, addItem: addToWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());
  const lastCartIdsRef = useRef("");

  useEffect(() => {
    const currentIds = cart.items.map((i) => i.id).join("|");
    const prevIds = lastCartIdsRef.current;
    if (cart.items.length > 0 && prevIds !== currentIds) {
      setSelectedItemIds(new Set(cart.items.map((i) => i.id)));
    } else if (cart.items.length === 0) {
      setSelectedItemIds(new Set());
    }
    lastCartIdsRef.current = currentIds;
  }, [cart.items]);

  const allIds = useMemo(() => cart.items.map((i) => i.id), [cart.items]);
  const selectedCount = selectedItemIds.size;
  const totalCount = allIds.length;
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;
  const isPartialSelection = selectedCount > 0 && selectedCount < totalCount;

  function handleToggleSelection(itemId) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function handleToggleAll() {
    if (isAllSelected) setSelectedItemIds(new Set());
    else setSelectedItemIds(new Set(allIds));
  }

  function handleToggleShopGroup(groupItemIds, shouldSelect) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      for (const id of groupItemIds) {
        if (shouldSelect) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedItemIds);
    if (ids.length === 0) return;
    try {
      for (const id of ids) await removeItem(id);
      setSelectedItemIds(new Set());
      showToast({
        type: "success",
        message: `Removed ${ids.length} item${ids.length === 1 ? "" : "s"}`,
      });
    } catch (err) {
      showToast({
        type: "error",
        message: err?.response?.data?.error?.message || "Could not delete items",
      });
    }
  }

  async function handleMoveToWishlist(item) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const productId = item.variant?.product?.id;
    if (!productId) return;
    try {
      const alreadyInWishlist = wishlistItems.some((it) => {
        const pid = it.product?.id ?? it.product_id ?? it.id;
        return pid === productId;
      });
      if (!alreadyInWishlist) await addToWishlist(productId);
      await removeItem(item.id);
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      showToast({ type: "success", message: "Moved to wishlist" });
    } catch {
      showToast({ type: "error", message: "Could not move to wishlist" });
    }
  }

  const shopGroups = useMemo(() => groupByShop(cart.items), [cart.items]);

  const { selectedSubtotal, selectedItemCount, selectedShopGroups } =
    useMemo(() => {
      let subtotal = 0;
      let count = 0;
      const groups = shopGroups
        .map((g) => {
          const selectedItems = g.items.filter((it) =>
            selectedItemIds.has(it.id)
          );
          for (const it of selectedItems) {
            subtotal += parseFloat(it.line_total);
            count += it.quantity;
          }
          return { ...g, items: selectedItems };
        })
        .filter((g) => g.items.length > 0);
      return {
        selectedSubtotal: subtotal,
        selectedItemCount: count,
        selectedShopGroups: groups,
      };
    }, [shopGroups, selectedItemIds]);

  function estimateShopDelivery(itemCount) {
    return 70;
  }
  const estimatedDeliveryTotal = useMemo(() => {
    return selectedShopGroups.reduce(
      (s, g) => s + estimateShopDelivery(g.items.length),
      0
    );
  }, [selectedShopGroups]);

  const PLATFORM_FEE = 5;
  const totalPayment = selectedSubtotal + estimatedDeliveryTotal + PLATFORM_FEE;

  function handleCheckout() {
    if (selectedItemIds.size === 0) {
      showToast({ type: "error", message: "Select at least one item to checkout" });
      return;
    }
    navigate("/checkout", {
      state: { selectedItemIds: Array.from(selectedItemIds) },
    });
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <EmptyState
          icon={<FaShoppingBag className="h-7 w-7" />}
          title="Your cart is empty"
          description="Browse the catalog to find something you'll love — your next favorite is one click away."
          action={
            <Link to="/catalog">
              <Button size="lg">
                Continue Shopping <FaArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 pb-28 lg:pb-10">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Shopping Cart" }]} className="mb-6" />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          {/* Select-all + bulk delete bar */}
          <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-card px-4 py-3 shadow-card">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isPartialSelection}
              onChange={handleToggleAll}
              label={`Select All (${totalCount})`}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={selectedCount === 0}
              className="text-state-danger hover:bg-state-danger/10"
            >
              <FaTrash className="h-3 w-3" /> Delete selected
            </Button>
          </div>

          {/* Shop groups */}
          {shopGroups.map((group) => {
            const groupIds = group.items.map((i) => i.id);
            const allSelected =
              groupIds.length > 0 &&
              groupIds.every((id) => selectedItemIds.has(id));
            return (
              <ShopGroupCard
                key={group.key}
                group={group}
                allSelected={allSelected}
                onToggleShop={() =>
                  handleToggleShopGroup(groupIds, !allSelected)
                }
                selectedItemIds={selectedItemIds}
                onToggleSelection={handleToggleSelection}
                onUpdateQuantity={updateItem}
                onRemove={removeItem}
                onMoveToWishlist={handleMoveToWishlist}
                deliveryEstimate={estimateShopDelivery(group.items.length)}
              />
            );
          })}

          <div className="text-center">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-hover"
            >
              <FaHeart className="h-3 w-3" /> Continue browsing the catalog
            </Link>
          </div>
        </div>

        {/* Order summary sidebar — desktop/tablet. */}
        <aside className="hidden w-full shrink-0 self-start lg:block lg:w-[360px]">
          <div className="sticky top-28 space-y-3">
            <div className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card">
              <h2 className="mb-4 text-lg font-bold text-text-primary">
                Order Summary
              </h2>

              <dl className="space-y-3 text-sm">
                <SummaryRow
                  label="Subtotal"
                  value={<Money amount={selectedSubtotal} />}
                />
                <SummaryRow
                  label={
                    <span className="inline-flex items-center gap-1">
                      Delivery
                      <InfoTip message="Final delivery fee is calculated at checkout based on your address." />
                    </span>
                  }
                  value={
                    selectedShopGroups.length > 0 ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-text-muted line-through">
                          <Money amount={210} />
                        </span>
                        <Money
                          amount={estimatedDeliveryTotal}
                          className="font-bold text-text-primary"
                        />
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )
                  }
                />
                <SummaryRow
                  label={
                    <span className="inline-flex items-center gap-1">
                      Platform fee
                      <InfoTip message="Covers payment processing and order management." />
                    </span>
                  }
                  value={
                    selectedCount > 0 ? (
                      <Money amount={PLATFORM_FEE} />
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )
                  }
                />
              </dl>

              <div className="my-4 border-t border-dashed border-border-subtle pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-text-primary">
                    Total
                  </span>
                  <Money
                    amount={totalPayment}
                    className="text-2xl font-bold text-text-primary"
                  />
                </div>
                <p className="mt-1 text-[11px] text-text-secondary">
                  Includes all taxes and fees
                </p>
              </div>

              <Button
                variant="gradient"
                onClick={handleCheckout}
                disabled={selectedCount === 0}
                className="w-full"
                size="lg"
              >
                Checkout ({selectedCount})
                <FaArrowRight className="h-3.5 w-3.5" />
              </Button>

              <Link
                to="/catalog"
                className="mt-3 block text-center text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
              >
                Continue Shopping
              </Link>
            </div>

            {/* Trust strip */}
            <div className="rounded-2xl border border-border-subtle bg-surface-card px-5 py-4 text-xs text-text-secondary shadow-card">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-state-success">
                <FaShieldAlt className="h-4 w-4" />
                Shop with confidence
              </div>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2">
                  <FaTruck className="mt-0.5 h-3 w-3 shrink-0 text-state-success" />
                  Free delivery on eligible orders
                </li>
                <li className="flex items-start gap-2">
                  <FaShieldAlt className="mt-0.5 h-3 w-3 shrink-0 text-state-success" />
                  Secure encrypted payments
                </li>
                <li className="flex items-start gap-2">
                  <FaUndo className="mt-0.5 h-3 w-3 shrink-0 text-state-success" />
                  7-day easy returns on most items
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-canvas-elevated/95 px-4 py-3 shadow-float backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-text-secondary">
              Total ({selectedCount || 0} item{selectedCount === 1 ? "" : "s"})
            </p>
            <Money
              amount={totalPayment}
              className="text-xl font-bold text-text-primary"
            />
          </div>
          <Button
            variant="gradient"
            onClick={handleCheckout}
            disabled={selectedCount === 0}
            size="md"
            className="shrink-0"
          >
            Checkout ({selectedCount})
            <FaArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Shop group card                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function ShopGroupCard({
  group,
  allSelected,
  onToggleShop,
  selectedItemIds,
  onToggleSelection,
  onUpdateQuantity,
  onRemove,
  onMoveToWishlist,
  deliveryEstimate,
}) {
  const subtotal = group.items.reduce(
    (s, it) => s + parseFloat(it.line_total),
    0
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-card transition-shadow hover:shadow-card-hover">
      {/* Shop header */}
      <header className="flex items-center justify-between gap-3 border-b border-border-subtle bg-canvas-elevated px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onChange={onToggleShop}
            aria-label={`Select all items from ${group.name}`}
          />
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <FaStore className="h-3.5 w-3.5" />
          </span>
          <span className="font-semibold text-text-primary">{group.name}</span>
          {group.isOfficial && (
            <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-card">
              Official Store
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-text-secondary">
          {group.items.length} item{group.items.length === 1 ? "" : "s"}
        </span>
      </header>

      {/* Items */}
      <ul className="divide-y divide-border-subtle">
        {group.items.map((item) => (
          <li key={item.id}>
            <ShopCartItemRow
              item={item}
              isSelected={selectedItemIds.has(item.id)}
              onToggleSelection={onToggleSelection}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
              onMoveToWishlist={onMoveToWishlist}
            />
          </li>
        ))}
      </ul>

      {/* Per-shop subtotal */}
      <div className="flex items-center justify-end gap-2 border-t border-border-subtle bg-canvas-elevated px-4 py-3 text-sm sm:px-5">
        <span className="text-text-secondary">
          Subtotal ({group.items.length} item{group.items.length === 1 ? "" : "s"}):
        </span>
        <Money amount={subtotal} className="font-bold text-text-primary" />
      </div>

      {/* Per-shop Standard Delivery card */}
      <div className="px-4 pb-4 sm:px-5">
        <div className="flex items-center justify-between rounded-xl border border-state-success/30 bg-state-success/10 p-3.5 transition-colors hover:bg-state-success/15">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas-elevated text-state-success shadow-card">
              <FaTruck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-state-success">
                Standard Delivery
              </p>
              <p className="text-xs text-state-success/80">Receive within 5 – 7 days</p>
            </div>
          </div>
          <span className="rounded-full border border-state-success/40 bg-canvas-elevated px-3 py-1 text-sm font-bold text-state-success shadow-card">
            <Money amount={deliveryEstimate} />
          </span>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Item row inside a shop card                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function ShopCartItemRow({
  item,
  isSelected,
  onToggleSelection,
  onUpdateQuantity,
  onRemove,
  onMoveToWishlist,
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const product = item.variant?.product || {};
  const variantLabel = [item.variant?.color, item.variant?.size]
    .filter(Boolean)
    .join(" · ");

  async function changeQuantity(newQuantity) {
    if (newQuantity < 1) return;
    setIsUpdating(true);
    try {
      await onUpdateQuantity(item.id, newQuantity);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex items-start gap-3 bg-surface-card p-3 sm:gap-4 sm:p-4">
      <Checkbox
        checked={isSelected}
        onChange={() => onToggleSelection(item.id)}
        aria-label="Select item"
      />

      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-canvas-elevated">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <span className="text-[10px] text-text-muted">Image</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-text-primary">
          {product.name || "Product"}
        </p>
        {variantLabel && (
          <p className="mt-0.5 text-xs text-text-secondary">{variantLabel}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <QuantityStepper
            value={item.quantity}
            onChange={changeQuantity}
            max={item.variant?.stock || 99}
            disabled={isUpdating}
          />
          <button
            type="button"
            onClick={() => onMoveToWishlist(item)}
            className="text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            Move to wishlist
          </button>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <Money
          amount={item.line_total}
          className="text-base font-bold text-brand"
        />
        {product.base_price && parseFloat(product.base_price) > 0 && (
          <Money
            amount={product.base_price * item.quantity}
            className="text-xs text-text-muted line-through"
          />
        )}
        <div className="mt-1 flex items-center gap-1 text-text-muted">
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label="Remove item"
            className="rounded-lg p-1.5 transition-colors hover:bg-state-danger/10 hover:text-state-danger"
          >
            <FaTrash className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Save for later"
            onClick={() => onMoveToWishlist(item)}
            className="rounded-lg p-1.5 transition-colors hover:bg-brand/15 hover:text-brand"
          >
            <FaHeart className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function QuantityStepper({ value, onChange, min = 1, max = 99, disabled }) {
  return (
    <div
      className={`inline-flex items-center rounded-xl border border-border-subtle bg-canvas-elevated shadow-xs transition-colors hover:border-border-strong ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className="flex h-9 w-9 items-center justify-center rounded-l-xl text-brand transition-colors hover:bg-brand/15 disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
      >
        <FaMinus className="h-3 w-3" />
      </button>
      <span className="min-w-[2.5rem] select-none text-center text-sm font-bold text-text-primary tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className="flex h-9 w-9 items-center justify-center rounded-r-xl text-brand transition-colors hover:bg-brand/15 disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
      >
        <FaPlus className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Sidebar helpers                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-semibold text-text-primary">{value}</dd>
    </div>
  );
}

function InfoTip({ message }) {
  return (
    <span
      title={message}
      aria-label={message}
      className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-canvas-elevated text-[10px] font-bold text-text-secondary transition-colors hover:bg-brand/15 hover:text-brand"
    >
      i
    </span>
  );
}

void FaUndo;

/**
 * Group cart items by their seller (proxied through brand).
 */
function groupByShop(items) {
  const map = new Map();
  for (const item of items) {
    const brandName =
      item.variant?.product?.brand?.name || "Other products";
    if (!map.has(brandName)) {
      map.set(brandName, {
        key: brandName,
        name: brandName,
        isOfficial: false,
        items: [],
      });
    }
    map.get(brandName).items.push(item);
  }
  return Array.from(map.values());
}
