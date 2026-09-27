import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaPlus,
  FaTruck,
  FaMoneyBillWave,
  FaCreditCard,
  FaTag,
  FaCheck,
  FaLock,
  FaShieldAlt,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaShoppingBag,
  FaInfoCircle,
  FaChevronRight,
  FaArrowLeft,
} from "react-icons/fa";

import { Button } from "../components/common/Button";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Checkbox, Input } from "../components/common/Input";
import { Money } from "../components/common/Money";
import { Modal } from "../components/common/Modal";
import { Skeleton } from "../components/common/Skeleton";
import { useCart } from "../hooks/useCart";
import { useToast } from "../hooks/useToast";
import { calculateDeliveryCharge } from "../utils/delivery";
import { extractErrorMessage } from "../services/apiClient";
import { placeOrder } from "../services/orderService";
import { previewCoupon } from "../services/cartService";
import { AddressForm } from "../components/dashboard/AddressForm";
import {
  createAddress,
  fetchAddresses,
  updateAddress,
} from "../services/authService";

const PAYMENT_METHODS = [
  {
    value: "COD",
    label: "Cash on Delivery",
    description: "Pay in cash when your order arrives at your door.",
    icon: FaMoneyBillWave,
    recommended: true,
  },
  {
    value: "SIMULATED_ONLINE",
    label: "Card / Online Payment",
    description: "Pay securely online with your Visa or Mastercard.",
    icon: FaCreditCard,
  },
];

const PLATFORM_FEE = 5;

const STEPS = [
  { id: "address", label: "Address" },
  { id: "order", label: "Order" },
  { id: "payment", label: "Payment" },
];

/**
 * Single-page checkout — dark ShopHaat variant.
 *
 * Dark-theme: bg-canvas, surface-card step cards with saffron accents,
 * sticky dark sidebar with saffron highlight.
 */
export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, refreshCart } = useCart();
  const { showToast } = useToast();

  const cartItemIds = location.state?.selectedItemIds || [];

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const activeItems = useMemo(() => {
    const ids = new Set(cartItemIds);
    return cart.items.filter(
      (item) => ids.size === 0 || ids.has(item.id)
    );
  }, [cart.items, cartItemIds]);

  useEffect(() => {
    fetchAddresses()
      .then((data) => {
        setAddresses(data);
        if (data.length > 0 && !selectedAddress) {
          const def = data.find((a) => a.is_default) || data[0];
          setSelectedAddress(def);
        }
      })
      .catch(() => {
        /* surface in the address card if needed */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = useMemo(
    () => activeItems.reduce((s, i) => s + parseFloat(i.line_total || 0), 0),
    [activeItems]
  );

  const shopGroups = useMemo(() => groupByShop(activeItems), [activeItems]);

  const deliveryCost = useMemo(
    () => calculateDeliveryCharge(selectedAddress),
    [selectedAddress]
  );

  const discount = couponResult?.discount_amount || 0;
  const grandTotal = Math.max(
    0,
    subtotal + deliveryCost + PLATFORM_FEE - discount
  );

  useEffect(() => {
    if (cart.items.length === 0 && !isPlacing) {
      navigate("/cart", { replace: true });
    }
  }, [cart.items.length, isPlacing, navigate]);

  async function applyCoupon() {
    if (!couponCode) return;
    setIsCheckingCoupon(true);
    try {
      const result = await previewCoupon(couponCode);
      setCouponResult(result);
      showToast({
        type: "success",
        message: `Coupon applied — you saved ৳${result.discount_amount}`,
      });
    } catch (err) {
      setCouponResult(null);
      showToast({
        type: "error",
        message: extractErrorMessage(err, "Coupon could not be applied."),
      });
    } finally {
      setIsCheckingCoupon(false);
    }
  }

  function removeCoupon() {
    setCouponCode("");
    setCouponResult(null);
    showToast({ type: "info", message: "Coupon removed" });
  }

  async function handleAddAddress(form) {
    setIsSavingAddress(true);
    try {
      const saved = await createAddress(form);
      setAddresses((prev) => [...prev, saved]);
      setSelectedAddress(saved);
      setIsAddAddressOpen(false);
      showToast({ type: "success", message: "Address added" });
    } catch (err) {
      showToast({
        type: "error",
        message: extractErrorMessage(err, "Could not save address."),
      });
    } finally {
      setIsSavingAddress(false);
    }
  }

  function handleOpenEditAddress(addr) {
    setEditingAddress(addr);
  }

  function handleCloseEditAddress() {
    setEditingAddress(null);
  }

  async function handleSaveEditAddress(form) {
    if (!editingAddress) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateAddress(editingAddress.id, form);
      setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedAddress?.id === updated.id) {
        setSelectedAddress(updated);
      }
      setEditingAddress(null);
      showToast({ type: "success", message: "Address updated" });
    } catch (err) {
      showToast({
        type: "error",
        message: extractErrorMessage(err, "Could not update address."),
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddress) {
      showToast({ type: "error", message: "Please select a delivery address." });
      return;
    }
    if (activeItems.length === 0) {
      showToast({
        type: "error",
        message: "Your cart is empty — add an item before placing an order.",
      });
      return;
    }
    if (!agreedToTerms) {
      showToast({
        type: "error",
        message: "Please agree to the Terms & Conditions to continue.",
      });
      return;
    }
    setIsPlacing(true);
    try {
      const idsToSend = cartItemIds.length > 0
        ? cartItemIds
        : activeItems.map((it) => it.id);
      const order = await placeOrder({
        addressId: selectedAddress.id,
        paymentMethod,
        couponCode: couponResult ? couponCode : null,
        cartItemIds: idsToSend,
      });
      await refreshCart();
      showToast({ type: "success", message: "Order placed successfully!" });
      navigate(`/order-success?order=${order.order_number}`, { replace: true });
    } catch (err) {
      showToast({
        type: "error",
        message: extractErrorMessage(err, "Could not place your order."),
      });
    } finally {
      setIsPlacing(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="rounded-3xl border border-dashed border-border-subtle bg-surface-card px-8 py-12 shadow-card">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand">
            <FaShoppingBag className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            Your cart is empty
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Add some products before checking out.
          </p>
          <Link to="/catalog" className="mt-6 inline-block">
            <Button size="lg">Browse Catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Checkout" }]} className="mb-6" />


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {/* Address */}
          <AddressCard
            addresses={addresses}
            selected={selectedAddress}
            onSelect={setSelectedAddress}
            onAdd={() => setIsAddAddressOpen(true)}
            onEdit={handleOpenEditAddress}
          />

          {/* Order summary */}
          <OrderSummaryCard items={activeItems} shopGroups={shopGroups} />

          {/* Payment method */}
          <PaymentMethodCard
            selected={paymentMethod}
            onSelect={setPaymentMethod}
          />
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <CheckoutSidebar
            subtotal={subtotal}
            deliveryCost={deliveryCost}
            discount={discount}
            couponCode={couponCode}
            onCouponCodeChange={setCouponCode}
            couponApplied={Boolean(couponResult)}
            onApplyCoupon={applyCoupon}
            onRemoveCoupon={removeCoupon}
            isCheckingCoupon={isCheckingCoupon}
            agreedToTerms={agreedToTerms}
            onAgreeChange={setAgreedToTerms}
            total={grandTotal}
            canPlaceOrder={Boolean(selectedAddress) && agreedToTerms}
            isPlacing={isPlacing}
            onPlaceOrder={handlePlaceOrder}
          />
        </aside>
      </div>

      <Modal
        isOpen={isAddAddressOpen}
        onClose={() => setIsAddAddressOpen(false)}
        title="Add Delivery Address"
        className="max-w-3xl"
      >
        {isAddAddressOpen && (
          <AddressForm
            onSubmit={handleAddAddress}
            onCancel={() => setIsAddAddressOpen(false)}
            isSaving={isSavingAddress}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(editingAddress)}
        onClose={handleCloseEditAddress}
        title="Edit Delivery Address"
        className="max-w-3xl"
      >
        {editingAddress && (
          <AddressForm
            initialValues={editingAddress}
            onSubmit={handleSaveEditAddress}
            onCancel={handleCloseEditAddress}
            isSaving={isSavingEdit}
          />
        )}
      </Modal>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Address card                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function AddressCard({ addresses, selected, onSelect, onAdd, onEdit }) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-text-primary">
            Delivery Address
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            {addresses.length}/10 saved · choose where to deliver
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <FaPlus className="h-3 w-3" /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand">
            <FaMapMarkerAlt className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-text-secondary">
            No saved addresses yet
          </p>
          <p className="mt-1 text-xs text-text-muted">Add one to continue.</p>
          <Button size="sm" onClick={onAdd} className="mt-4">
            <FaPlus className="h-3 w-3" /> Add Address
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {addresses.map((addr) => {
            const isSelected = selected?.id === addr.id;
            return (
              <div
                key={addr.id}
                className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? "border-brand bg-brand/10 shadow-sm"
                    : "border-border-subtle bg-canvas-elevated hover:-translate-y-px hover:border-brand/60 hover:shadow-card"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(addr)}
                  aria-pressed={isSelected}
                  aria-label={`Select address for ${addr.full_name}`}
                  className="flex flex-1 items-start gap-3 text-left"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected
                        ? "border-brand bg-brand text-white"
                        : "border-border-strong bg-canvas-elevated"
                    }`}
                  >
                    {isSelected && <FaCheck className="h-2.5 w-2.5" />}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-primary">
                        {addr.full_name}
                      </span>
                      <span className="text-xs text-text-secondary">· {addr.phone}</span>
                      {addr.is_default && (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-card">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city},{" "}
                      {addr.state} {addr.postal_code}
                    </p>
                    {isSelected && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                        Selected for delivery
                      </p>
                    )}
                  </div>
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(addr)}
                    aria-label={`Edit address for ${addr.full_name}`}
                    className="shrink-0 rounded-lg border border-border-subtle px-2.5 py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-brand hover:bg-brand/15 hover:text-brand"
                  >
                    Edit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Order summary card (grouped by shop)                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function OrderSummaryCard({ items, shopGroups }) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-text-primary">
          Order Summary
        </h2>
        <span className="text-xs font-semibold text-text-secondary">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="hidden grid-cols-[1fr_80px_60px_80px] gap-3 border-b border-border-subtle pb-2 text-xs font-bold uppercase tracking-wider text-text-secondary sm:grid">
        <span>Product details</span>
        <span className="text-right">Price</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Total</span>
      </div>

      <div className="space-y-4 pt-3">
        {shopGroups.map((group) => (
          <ShopGroup key={group.key} group={group} />
        ))}
      </div>
    </section>
  );
}

function ShopGroup({ group }) {
  const subtotal = group.items.reduce(
    (s, it) => s + parseFloat(it.line_total),
    0
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-canvas-elevated shadow-card">
      <header className="flex items-center justify-between gap-3 border-b border-border-subtle bg-canvas-elevated px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 text-brand">
            <FaShoppingBag className="h-3 w-3" />
          </span>
          <span className="text-sm font-semibold text-text-primary">{group.name}</span>
          {group.isOfficial && (
            <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-card">
              Official Store
            </span>
          )}
        </div>
      </header>

      <ul className="divide-y divide-border-subtle">
        {group.items.map((item) => (
          <ShopOrderRow key={item.id} item={item} />
        ))}
      </ul>

      <div className="flex items-center justify-end gap-2 border-t border-border-subtle bg-canvas-elevated px-4 py-2.5 text-sm">
        <span className="text-text-secondary">
          {group.items.length} item{group.items.length === 1 ? "" : "s"} subtotal:
        </span>
        <Money amount={subtotal} className="font-bold text-text-primary" />
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center justify-between rounded-xl border border-state-success/30 bg-state-success/10 p-3.5 transition-colors hover:bg-state-success/15">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas-elevated text-state-success shadow-card">
              <FaTruck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-state-success">
                Standard Delivery
              </p>
              <p className="text-xs text-state-success/80">Receive by 5 – 7 days</p>
            </div>
          </div>
          <span className="rounded-full border border-state-success/40 bg-canvas-elevated px-3 py-1 text-sm font-bold text-state-success shadow-card">
            <Money amount={Math.max(70, group.items.length * 4)} />
          </span>
        </div>
      </div>
    </div>
  );
}

function ShopOrderRow({ item }) {
  const product = item.variant?.product || {};
  const variantLabel = [item.variant?.color, item.variant?.size]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-start gap-3 bg-canvas-elevated p-3 sm:gap-4 sm:p-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
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
      </div>

      <div className="hidden text-right text-sm sm:block sm:w-20">
        <Money
          amount={item.line_total / item.quantity}
          className="font-bold text-brand"
        />
        {product.base_price && parseFloat(product.base_price) > 0 && (
          <Money
            amount={product.base_price}
            className="block text-[11px] text-text-muted line-through"
          />
        )}
      </div>

      <div className="w-12 text-center text-sm font-semibold text-text-secondary">
        ×{item.quantity}
      </div>

      <div className="hidden text-right text-sm sm:block sm:w-20">
        <Money amount={item.line_total} className="font-bold text-text-primary" />
      </div>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Payment method card                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function PaymentMethodCard({ selected, onSelect }) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card sm:p-6">
      <h2 className="mb-1 text-lg font-bold text-text-primary">
        Payment Method
      </h2>
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-text-secondary">
        Recommended option
      </p>

      <div className="space-y-2.5">
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          const isSelected = selected === method.value;
          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onSelect(method.value)}
              aria-pressed={isSelected}
              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-brand bg-brand/10"
                  : "border-border-subtle bg-canvas-elevated hover:-translate-y-px hover:border-brand/60 hover:shadow-card"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isSelected
                    ? "bg-brand-gradient text-white shadow-card"
                    : "bg-brand/15 text-brand"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-text-primary">{method.label}</p>
                  {method.recommended && (
                    <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">{method.description}</p>
              </div>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected
                    ? "border-brand bg-brand text-white"
                    : "border-border-strong bg-canvas-elevated"
                }`}
              >
                {isSelected && <FaCheck className="h-2.5 w-2.5" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Sidebar                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function CheckoutSidebar({
  subtotal,
  deliveryCost,
  discount,
  couponCode,
  onCouponCodeChange,
  couponApplied,
  onApplyCoupon,
  onRemoveCoupon,
  isCheckingCoupon,
  agreedToTerms,
  onAgreeChange,
  total,
  canPlaceOrder,
  isPlacing,
  onPlaceOrder,
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-text-primary">
          Price Details
        </h2>

        <dl className="space-y-3 text-sm">
          <SidebarRow
            label="Subtotal"
            value={<Money amount={subtotal} />}
          />
          <SidebarRow
            label={
              <span className="inline-flex items-center gap-1">
                Delivery
                <InfoTip message="Recomputed from the selected address: ৳70 inside Dhaka, ৳120 elsewhere." />
              </span>
            }
            value={<Money amount={deliveryCost} className="font-bold text-text-primary" />}
          />
          {discount > 0 && (
            <SidebarRow
              label={
                <span>
                  Discount{" "}
                  {couponCode && (
                    <span className="ml-1 rounded bg-state-success/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-state-success">
                      {couponCode}
                    </span>
                  )}
                </span>
              }
              value={
                <span className="font-bold text-state-success">
                  − <Money amount={discount} />
                </span>
              }
            />
          )}
          <SidebarRow
            label={
              <span className="inline-flex items-center gap-1">
                Platform fee
                <InfoTip message="Covers payment processing and order management." />
              </span>
            }
            value={<Money amount={PLATFORM_FEE} />}
          />
        </dl>

        <div className="my-4 border-t border-dashed border-border-subtle pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-text-primary">Total</span>
            <Money amount={total} className="text-2xl font-bold text-text-primary" />
          </div>
          <p className="mt-1 text-[11px] text-text-secondary">
            Final amount — taxes included
          </p>
        </div>

        {/* Coupon */}
        <div className="mb-4 rounded-2xl border border-border-subtle bg-canvas-elevated p-3.5">
          <p className="mb-1.5 text-sm font-bold text-text-primary">
            Have a ShopHaat coupon?
          </p>
          <div className="flex items-stretch gap-2">
            <Input
              name="coupon"
              value={couponCode}
              onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
              placeholder="Promo / Coupon code"
              disabled={couponApplied}
              className="flex-1"
            />
            {couponApplied ? (
              <Button variant="secondary" onClick={onRemoveCoupon}>
                Remove
              </Button>
            ) : (
              <Button
                variant="gradient"
                onClick={onApplyCoupon}
                isLoading={isCheckingCoupon}
                disabled={!couponCode}
              >
                <FaTag className="h-3 w-3" /> Apply
              </Button>
            )}
          </div>
        </div>

        {/* T&C */}
        <div className="mb-4 rounded-2xl border border-border-subtle bg-canvas-elevated p-3.5">
          <Checkbox
            checked={agreedToTerms}
            onChange={(e) => onAgreeChange(e.target.checked)}
            label={
              <span>
                I agree to the{" "}
                <a className="font-semibold text-brand underline" href="/terms" target="_blank" rel="noreferrer">
                  Terms & Conditions
                </a>
                ,{" "}
                <a className="font-semibold text-brand underline" href="/privacy" target="_blank" rel="noreferrer">
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a className="font-semibold text-brand underline" href="/returns" target="_blank" rel="noreferrer">
                  Return & Refund Policy
                </a>{" "}
                of ShopHaat.
              </span>
            }
          />
        </div>

        <Button
          variant="gradient"
          onClick={onPlaceOrder}
          isLoading={isPlacing}
          disabled={!canPlaceOrder}
          className="w-full"
          size="lg"
        >
          <FaLock className="h-3 w-3" /> Place Order
        </Button>
        <p className="mt-2 text-center text-[11px] text-text-secondary">
          By placing this order you agree to our terms of service.
        </p>
      </div>

      <SecurityCard />
      <AcceptedPaymentsCard />
    </div>
  );
}

function SidebarRow({ label, value }) {
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

/* ────────────────────────────────────────────────────────────────────────── */
/* Security + payment chips                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function SecurityCard() {
  const items = [
    "PCI-DSS compliant card processing.",
    "Card information is encrypted and unreadable in storage.",
    "All transactional data is encrypted in transit.",
    "ShopHaat never sells your card information.",
  ];
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-state-success">
        <FaShieldAlt className="h-4 w-4" />
        ShopHaat protects your card information
      </div>
      <ul className="space-y-1.5 text-xs text-text-secondary">
        {items.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <FaCheck className="mt-0.5 h-3 w-3 shrink-0 text-state-success" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AcceptedPaymentsCard() {
  const chips = [
    { label: "VISA", icon: FaCcVisa, color: "text-[#1A1F71]" },
    { label: "Mastercard", icon: FaCcMastercard, color: "text-[#EB001B]" },
    { label: "Amex", icon: FaCcAmex, color: "text-[#006FCF]" },
    { label: "bKash", color: "text-[#E2136E]" },
    { label: "Nagad", color: "text-[#F6921E]" },
    { label: "Rocket", color: "text-[#8C3494]" },
  ];
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card">
      <h3 className="mb-3 text-base font-bold text-text-primary">
        We Accept
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-canvas-elevated px-2 py-1 text-[11px] font-bold shadow-xs"
            >
              {Icon ? (
                <Icon className={`h-4 w-4 ${chip.color}`} />
              ) : null}
              <span className={chip.color}>{chip.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Grouping helper                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

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

void Skeleton;
void FaInfoCircle;
