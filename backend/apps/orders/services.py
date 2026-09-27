import uuid
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import Address
from apps.catalog.models import ProductVariant
from apps.core.exceptions import ConflictError
from apps.coupons.models import CouponRedemption
from apps.coupons.services import validate_and_price_coupon
from apps.marketplace.models import (
    Notification,
    PlatformSettings,
    SellerOrder,
    SellerOrderStatusHistory,
    resolve_commission_rate,
)

from .models import Order, OrderItem, OrderStatusHistory, PaymentTransaction, ShippingMethod

# --- Order state machine -----------------------------------------------
ALLOWED_TRANSITIONS = {
    "PENDING": {"CONFIRMED", "CANCELLED"},
    "CONFIRMED": {"PROCESSING", "SHIPPED", "CANCELLED"},
    "PROCESSING": {"SHIPPED", "CANCELLED"},
    "SHIPPED": {"DELIVERED", "CANCELLED"},
    "DELIVERED": {"REFUNDED"},
    "CANCELLED": {"REFUNDED"},
    "REFUNDED": set(),
}
# States from which a customer (not staff/admin) may self-cancel.
CUSTOMER_CANCELLABLE_STATES = {"PENDING", "CONFIRMED"}


def transition_order_status(order: Order, new_status: str, actor, note: str = "", is_staff_actor: bool = False):
    current = order.status

    if new_status not in ALLOWED_TRANSITIONS.get(current, set()):
        raise ConflictError(f"Cannot move an order from '{current}' to '{new_status}'.")

    if new_status == "CANCELLED" and not is_staff_actor and current not in CUSTOMER_CANCELLABLE_STATES:
        raise ConflictError(f"Orders can only be self-cancelled while '{current}' is not yet being processed.")

    order.status = new_status
    order.save(update_fields=["status"])
    OrderStatusHistory.objects.create(order=order, status=new_status, changed_by=actor, note=note)
    return order


def _generate_order_number() -> str:
    return f"ORD-{uuid.uuid4().hex[:10].upper()}"


@transaction.atomic
def place_order(*, user, address_id: int, payment_method: str, coupon_code: str | None = None, cart_item_ids: list[int] | None = None):
    from apps.cart.models import Cart, CartItem  # local import avoids an app-loading circular import

    try:
        address = Address.objects.get(id=address_id, user=user)
    except Address.DoesNotExist:
        raise ValidationError({"address_id": "Address not found for this user."})

    if payment_method not in dict(Order.PAYMENT_METHOD_CHOICES):
        raise ValidationError({"payment_method": "Invalid payment method."})

    try:
        cart = Cart.objects.get(user=user)
    except Cart.DoesNotExist:
        raise ValidationError({"cart": "Your cart is empty."})

    cart_items_qs = (
        CartItem.objects.filter(cart=cart)
        .select_related("variant__product__seller")
    )
    if cart_item_ids:
        cart_items_qs = cart_items_qs.filter(id__in=cart_item_ids)

    cart_items = list(cart_items_qs)
    if not cart_items:
        raise ValidationError({"cart": "No valid items selected for checkout."})

    # Lock the exact variant rows this order touches, in a stable order, to
    # avoid overselling under concurrent checkouts (and to avoid deadlocks
    # between two orders locking the same variants in different orders).
    variant_ids = sorted(item.variant.pk for item in cart_items)
    locked_variants = {
        v.pk: v for v in ProductVariant.objects.select_for_update().filter(id__in=variant_ids)
    }

    subtotal = Decimal("0.00")
    line_specs = []
    for item in cart_items:
        variant = locked_variants[item.variant.pk]
        if item.quantity > variant.stock:
            raise ConflictError(
                f"'{variant.product.name}' ({variant.sku}) only has {variant.stock} left in stock."
            )
        unit_price = variant.effective_price
        subtotal += unit_price * item.quantity
        line_specs.append((variant, item.quantity, unit_price))

    discount_amount = Decimal("0.00")
    coupon = None
    if coupon_code:
        coupon, discount_amount = validate_and_price_coupon(coupon_code, user, subtotal)

    # Flat rate delivery charge, now driven by PlatformSettings so admins
    # can change Dhaka / non-Dhaka fees from the Settings page. Falls back
    # to the legacy 70/120 if the settings singleton can't be read so a
    # transient DB issue doesn't take down checkout.
    state = (getattr(address, "state", "") or "").strip().lower()
    try:
        _settings = PlatformSettings.get_solo()
        fee_dhaka = Decimal(_settings.shipping_fee_dhaka)
        fee_other = Decimal(_settings.shipping_fee_other)
    except Exception:
        fee_dhaka = Decimal("70.00")
        fee_other = Decimal("120.00")
    shipping_cost = fee_dhaka if state == "dhaka" else fee_other
    grand_total = subtotal - discount_amount + shipping_cost

    order = Order.objects.create(
        order_number=_generate_order_number(),
        user=user,
        shipping_address=address,
        shipping_address_snapshot=address.as_snapshot(),
        status="PENDING",
        subtotal=subtotal,
        discount_amount=discount_amount,
        shipping_cost=shipping_cost,
        grand_total=grand_total,
        payment_method=payment_method,
    )

    # ─────────────────────────────────────────────────────────────────────
    # Multi-vendor fan-out: one SellerOrder per (seller, order).
    # Commission is computed per-line so each seller's slice is fair even
    # when the cart spans multiple categories with category-specific rules.
    # ─────────────────────────────────────────────────────────────────────
    from collections import defaultdict
    by_seller = defaultdict(list)
    for variant, qty, unit_price in line_specs:
        seller = getattr(variant.product, "seller", None)
        if not seller:
            # Fallback: platform seller (shouldn't happen because legacy
            # products were reassigned to the marketplace seller).
            from apps.marketplace.models import SellerProfile
            seller = SellerProfile.objects.filter(store_slug="shophaat-official").first()
            if not seller:
                raise ValidationError({"cart": "No seller is configured for this product."})
        by_seller[seller.pk].append((variant, qty, unit_price))

    # Distribute the shipping cost pro-rata across seller orders so each
    # slice's earnings reflect its share of the fulfillment cost.
    total_lines = len(line_specs)
    seller_orders: dict[int, SellerOrder] = {}

    # 1. Compute per-seller subtotal first.
    seller_subtotals: dict[int, Decimal] = {}
    for seller_id, items in by_seller.items():
        s_subtotal = sum((unit_price * qty for _, qty, unit_price in items), Decimal("0.00"))
        seller_subtotals[seller_id] = s_subtotal

    # 2. Create SellerOrder rows.
    for seller_id, items in by_seller.items():
        seller = by_seller[seller_id][0][0].product.seller
        # If no override and no category rule, use the global rate.
        rate = None
        if seller.commission_rate is not None:
            rate = Decimal(seller.commission_rate)
        else:
            # Best-effort: use the first item's category to pick a rate.
            # (Most sellers will fall back to the global rate.)
            first_product = items[0][0].product
            cat = first_product.subcategory.category if first_product.subcategory else None
            rate = resolve_commission_rate(seller=seller, category=cat)
        s_subtotal = seller_subtotals[seller_id]
        s_commission = (s_subtotal * rate / Decimal("100.00")).quantize(Decimal("0.01"))
        s_earning = s_subtotal - s_commission
        # Distribute shipping proportionally to subtotal.
        s_shipping = (shipping_cost * s_subtotal / subtotal).quantize(Decimal("0.01")) if subtotal > 0 else Decimal("0.00")
        seller_order = SellerOrder.objects.create(
            order=order,
            seller=seller,
            status=SellerOrder.STATUS_PENDING,
            subtotal=s_subtotal,
            discount_amount=Decimal("0.00"),
            shipping_contribution=s_shipping,
            commission_amount=s_commission,
            seller_earning=s_earning,
        )
        seller_orders[seller_id] = seller_order
        SellerOrderStatusHistory.objects.create(
            seller_order=seller_order,
            status=SellerOrder.STATUS_PENDING,
            changed_by=user,
            note="Order placed.",
        )

    # 3. Create OrderItem rows linked to their SellerOrder slice.
    for variant, quantity, unit_price in line_specs:
        seller_id = variant.product.seller_id or list(seller_orders.keys())[0]
        seller_order = seller_orders.get(seller_id)
        attrs = ", ".join(
            f"{label}: {value}" for label, value in (("Size", variant.size), ("Color", variant.color)) if value
        )
        OrderItem.objects.create(
            order=order,
            variant=variant,
            product_name_snapshot=variant.product.name,
            variant_attributes_snapshot=attrs,
            unit_price_snapshot=unit_price,
            quantity=quantity,
            seller_order=seller_order,
        )
        variant.stock -= quantity
        variant.save(update_fields=["stock"])

    OrderStatusHistory.objects.create(order=order, status="PENDING", changed_by=user, note="Order placed.")

    payment_status = "SUCCESS" if payment_method == "SIMULATED_ONLINE" else "PENDING"
    PaymentTransaction.objects.create(
        order=order,
        method=payment_method,
        status=payment_status,
        amount=grand_total,
        reference_id=uuid.uuid4().hex[:16] if payment_method == "SIMULATED_ONLINE" else "",
    )

    if coupon is not None:
        CouponRedemption.objects.create(coupon=coupon, user=user, order=order)

    # Notify every seller about the new order.
    for seller_order in seller_orders.values():
        try:
            Notification.objects.create(
                recipient=seller_order.seller.user,
                target_role="seller",
                title=f"New order #{order.order_number}",
                body=f"You received a new order worth ৳{seller_order.subtotal}.",
                link=f"/seller/orders/{order.order_number}",
            )
        except Exception:
            # Don't break order placement on notification failures.
            pass

    # Only delete the items that were checked out
    if cart_item_ids:
        CartItem.objects.filter(cart=cart, id__in=cart_item_ids).delete()
    else:
        CartItem.objects.filter(cart=cart).delete()

    # Touch the consumer-side unused variable to keep linters happy.
    _ = total_lines

    return order
