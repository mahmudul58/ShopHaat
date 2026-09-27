"""Seller-side order state machine + dashboard aggregations.

The customer-facing Order.status still tracks a coarse top-level lifecycle
(PENDING → DELIVERED), but each SellerOrder tracks the granular seller-
side lifecycle (CONFIRMED → PROCESSING → READY_TO_SHIP → HANDED_OVER)
followed by an admin-side fulfillment stage (RECEIVED → SHIPPED → DELIVERED).
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import Avg, Count, F, Sum
from django.utils import timezone

from apps.core.exceptions import ConflictError
from apps.marketplace.models import (
    Notification,
    SellerOrder,
    SellerOrderStatusHistory,
    SellerProfile,
    Shipment,
)


# Statuses allowed in the seller-driven slice (left side of the lifecycle).
SELLER_TRANSITIONS = {
    SellerOrder.STATUS_PENDING: {SellerOrder.STATUS_CONFIRMED, SellerOrder.STATUS_CANCELLED},
    SellerOrder.STATUS_CONFIRMED: {SellerOrder.STATUS_PROCESSING, SellerOrder.STATUS_CANCELLED},
    SellerOrder.STATUS_PROCESSING: {SellerOrder.STATUS_READY_TO_SHIP, SellerOrder.STATUS_CANCELLED},
    SellerOrder.STATUS_READY_TO_SHIP: {SellerOrder.STATUS_HANDED_OVER, SellerOrder.STATUS_CANCELLED},
    SellerOrder.STATUS_HANDED_OVER: set(),  # only admin can move past here
    SellerOrder.STATUS_CANCELLED: set(),
    SellerOrder.STATUS_DELIVERED: {SellerOrder.STATUS_RETURN_REQUESTED},
    SellerOrder.STATUS_RETURN_REQUESTED: {SellerOrder.STATUS_RETURNED, SellerOrder.STATUS_REFUNDED},
    SellerOrder.STATUS_RETURN_APPROVED: {SellerOrder.STATUS_RETURNED, SellerOrder.STATUS_REFUNDED},
    SellerOrder.STATUS_RETURN_REJECTED: set(),
    SellerOrder.STATUS_RETURNED: {SellerOrder.STATUS_REFUNDED},
    SellerOrder.STATUS_REFUNDED: set(),
}

# Statuses allowed in the admin-driven slice (right side of the lifecycle).
#
# Strictly sequential delivery flow: HANDED_OVER → RECEIVED → SHIPPED →
# OUT_FOR_DELIVERY → DELIVERED. At each stage only ONE forward step
# is permitted (plus CANCELLED for early termination) so staff can't
# jump past intermediate states. The single "mark shipped" / "mark out
# for delivery" actions are what gets surfaced in the admin UI.
ADMIN_TRANSITIONS = {
    SellerOrder.STATUS_HANDED_OVER: {
        SellerOrder.STATUS_RECEIVED,
        SellerOrder.STATUS_CANCELLED,
    },
    SellerOrder.STATUS_RECEIVED: {
        SellerOrder.STATUS_SHIPPED,
        SellerOrder.STATUS_CANCELLED,
    },
    SellerOrder.STATUS_SHIPPED: {
        SellerOrder.STATUS_OUT_FOR_DELIVERY,
        SellerOrder.STATUS_CANCELLED,
    },
    SellerOrder.STATUS_OUT_FOR_DELIVERY: {
        SellerOrder.STATUS_DELIVERED,
        SellerOrder.STATUS_CANCELLED,
    },
    SellerOrder.STATUS_CONFIRMED: {SellerOrder.STATUS_CANCELLED},
    SellerOrder.STATUS_PROCESSING: {SellerOrder.STATUS_CANCELLED},
    SellerOrder.STATUS_READY_TO_SHIP: {SellerOrder.STATUS_CANCELLED},
    SellerOrder.STATUS_DELIVERED: {SellerOrder.STATUS_RETURN_REQUESTED},
    SellerOrder.STATUS_RETURN_REQUESTED: {
        SellerOrder.STATUS_RETURN_APPROVED,
        SellerOrder.STATUS_RETURN_REJECTED,
    },
    SellerOrder.STATUS_RETURN_APPROVED: {
        SellerOrder.STATUS_RETURNED,
        SellerOrder.STATUS_REFUNDED,
    },
    SellerOrder.STATUS_RETURNED: {SellerOrder.STATUS_REFUNDED},
}

# Customer-facing transitions (mirror the original Order status state machine).
CUSTOMER_TRANSITIONS = {
    SellerOrder.STATUS_PENDING: {SellerOrder.STATUS_CANCELLED},
    SellerOrder.STATUS_CONFIRMED: {SellerOrder.STATUS_CANCELLED},
    SellerOrder.STATUS_PROCESSING: set(),
    SellerOrder.STATUS_READY_TO_SHIP: set(),
    SellerOrder.STATUS_HANDED_OVER: set(),
    SellerOrder.STATUS_SHIPPED: set(),
    SellerOrder.STATUS_OUT_FOR_DELIVERY: set(),
    SellerOrder.STATUS_DELIVERED: {SellerOrder.STATUS_RETURN_REQUESTED},
    SellerOrder.STATUS_CANCELLED: set(),
    SellerOrder.STATUS_RETURN_REQUESTED: set(),
    SellerOrder.STATUS_RETURNED: set(),
    SellerOrder.STATUS_REFUNDED: set(),
}


@transaction.atomic
def transition_seller_order(
    *,
    seller_order: SellerOrder,
    new_status: str,
    actor,
    note: str = "",
    actor_role: str = "seller",
    shipment_fields: dict | None = None,
):
    """Move a SellerOrder to `new_status`. `actor_role` is one of
    'seller', 'admin', 'customer' and dictates which state machine applies.
    """
    current = seller_order.status

    if actor_role == "seller":
        allowed = SELLER_TRANSITIONS.get(current, set())
    elif actor_role == "admin":
        allowed = ADMIN_TRANSITIONS.get(current, set())
    elif actor_role == "customer":
        allowed = CUSTOMER_TRANSITIONS.get(current, set())
    else:
        raise ConflictError("Unknown actor role.")

    if new_status not in allowed:
        raise ConflictError(f"Cannot move a seller order from '{current}' to '{new_status}'.")

    seller_order.status = new_status
    if shipment_fields:
        for field, value in shipment_fields.items():
            if value is not None:
                setattr(seller_order, field, value)
    seller_order.save()
    SellerOrderStatusHistory.objects.create(
        seller_order=seller_order,
        status=new_status,
        changed_by=actor,
        note=note or f"Status moved to {new_status}.",
    )

    # Mirror lifecycle status onto the parent Order. Customer-visible Order
    # status uses a coarser enum than SellerOrder, so we collapse down to
    # the most relevant top-level state.
    parent = seller_order.order
    if new_status in {
        SellerOrder.STATUS_DELIVERED,
    }:
        parent.status = "DELIVERED"
        parent.save(update_fields=["status"])
    elif new_status in {
        SellerOrder.STATUS_SHIPPED,
        SellerOrder.STATUS_OUT_FOR_DELIVERY,
    }:
        parent.status = "SHIPPED"
        parent.save(update_fields=["status"])
    elif new_status in {
        SellerOrder.STATUS_CONFIRMED,
        SellerOrder.STATUS_PROCESSING,
        SellerOrder.STATUS_READY_TO_SHIP,
        SellerOrder.STATUS_HANDED_OVER,
        SellerOrder.STATUS_RECEIVED,
    }:
        # Move the customer-visible order out of PENDING once any seller
        # confirms — even if other sellers haven't confirmed yet.
        if parent.status == "PENDING":
            parent.status = "CONFIRMED"
            parent.save(update_fields=["status"])
    elif new_status == SellerOrder.STATUS_CANCELLED:
        # If all seller orders are cancelled, the customer order is too.
        sibling_statuses = list(
            seller_order.order.seller_orders.exclude(pk=seller_order.pk).values_list("status", flat=True)
        )
        if all(s == SellerOrder.STATUS_CANCELLED for s in sibling_statuses):
            parent.status = "CANCELLED"
            parent.save(update_fields=["status"])
    elif new_status == SellerOrder.STATUS_REFUNDED:
        parent.status = "REFUNDED"
        parent.save(update_fields=["status"])

    # Touch / create shipment row to keep it in sync with the status.
    if new_status in {
        SellerOrder.STATUS_RECEIVED,
        SellerOrder.STATUS_SHIPPED,
        SellerOrder.STATUS_OUT_FOR_DELIVERY,
        SellerOrder.STATUS_DELIVERED,
        SellerOrder.STATUS_HANDED_OVER,
    }:
        ship, _ = Shipment.objects.get_or_create(seller_order=seller_order)
        if new_status == SellerOrder.STATUS_RECEIVED:
            ship.status = SellerOrder.STATUS_RECEIVED
        elif new_status == SellerOrder.STATUS_SHIPPED:
            ship.status = SellerOrder.STATUS_SHIPPED
            if shipment_fields and shipment_fields.get("shipped_date"):
                ship.shipped_date = shipment_fields["shipped_date"]
        elif new_status == SellerOrder.STATUS_OUT_FOR_DELIVERY:
            ship.status = SellerOrder.STATUS_OUT_FOR_DELIVERY
        elif new_status == SellerOrder.STATUS_DELIVERED:
            ship.status = SellerOrder.STATUS_DELIVERED
            if shipment_fields and shipment_fields.get("delivery_date"):
                ship.delivery_date = shipment_fields["delivery_date"]
        if shipment_fields:
            for f, v in shipment_fields.items():
                if v:
                    setattr(ship, f, v)
        ship.save()

    return seller_order


def notify(recipient, *, target_role: str, title: str, body: str = "", link: str = "") -> Notification:
    """Convenience helper for creating in-app notifications."""
    return Notification.objects.create(
        recipient=recipient,
        target_role=target_role,
        title=title,
        body=body,
        link=link,
    )


# ──────────────────────────────────────────────────────────────────────────
# Dashboard aggregations
# ──────────────────────────────────────────────────────────────────────────

def seller_dashboard_summary(seller: SellerProfile) -> dict:
    """Real-data seller dashboard summary. No hardcoded numbers."""
    seller_orders = seller.seller_orders.all()  # type: ignore
    delivered = seller_orders.filter(status=SellerOrder.STATUS_DELIVERED)

    totals = seller_orders.aggregate(
        total_sales=Sum("subtotal"),
        total_commission=Sum("commission_amount"),
        total_earnings=Sum("seller_earning"),
    )

    low_stock_threshold = 10
    variants = seller.products.exclude(is_active=False).prefetch_related("variants").all()  # type: ignore
    low_stock = []
    total_products = seller.products.filter(is_active=True).count()  # type: ignore

    for product in variants:
        for v in product.variants.all():
            if v.stock <= low_stock_threshold:
                low_stock.append({
                    "product_id": product.id,
                    "product_slug": product.slug,
                    "product_name": product.name,
                    "variant_id": v.id,
                    "sku": v.sku,
                    "stock": v.stock,
                    "is_out_of_stock": v.stock == 0,
                })

    by_status = list(
        seller_orders.values("status").annotate(count=Count("id")).order_by("status")
    )
    # Pad with zeros for every known status so the dashboard can render
    # every tab even if some have no rows.
    by_status_map = {row["status"]: row["count"] for row in by_status}
    by_status_full = [
        {"status": code, "label": label, "count": by_status_map.get(code, 0)}
        for code, label in SellerOrder.STATUS_CHOICES
    ]

    settlement = seller.seller_orders.aggregate(  # type: ignore
        pending_amount=Sum(
            "seller_earning",
            filter=~Q(status__in=[
                SellerOrder.STATUS_DELIVERED,
                SellerOrder.STATUS_REFUNDED,
            ]),
        )
    )

    return {
        "total_sales": totals["total_sales"] or Decimal("0.00"),
        "total_earnings": totals["total_earnings"] or Decimal("0.00"),
        "total_commission": totals["total_commission"] or Decimal("0.00"),
        "total_orders": seller_orders.count(),
        "delivered_orders": delivered.count(),
        "cancelled_orders": seller_orders.filter(status=SellerOrder.STATUS_CANCELLED).count(),
        "pending_settlement": settlement["pending_amount"] or Decimal("0.00"),
        "paid_settlement": seller_orders.filter(
            settlement_status="PAID",
        ).aggregate(s=Sum("seller_earning"))["s"] or Decimal("0.00"),
        "total_products": total_products,
        "low_stock_products": low_stock[:10],
        "low_stock_count": len(low_stock),
        "orders_by_status": by_status_full,
    }


def seller_dashboard_charts(seller: SellerProfile) -> dict:
    """Time-bucketed revenue + orders for the seller's seller-orders."""
    from datetime import timedelta

    from apps.marketplace.models import SellerOrder

    since = timezone.now() - timedelta(days=90)
    qs = seller.seller_orders.filter(created_at__gte=since)  # type: ignore

    revenue_by_day = list(
        qs.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(revenue=Sum("seller_earning"), orders=Count("id"))
        .order_by("day")
    )

    top_products = list(
        qs.values(product=F("items__variant__product__name"))
        .annotate(units_sold=Sum("items__quantity"), revenue=Sum("items__unit_price_snapshot") * Sum("items__quantity"))
        .filter(product__isnull=False)
        .order_by("-units_sold")[:5]
    )

    return {
        "revenue_by_day": revenue_by_day,
        "top_products": top_products,
    }


def marketplace_dashboard_summary() -> dict:
    """Admin dashboard aggregations (subset kept for analytics)."""
    from apps.marketplace.models import MarketplaceCommission, SellerOrder
    from apps.orders.models import Order

    gmv = Order.objects.exclude(status="CANCELLED").aggregate(s=Sum("grand_total"))["s"] or Decimal("0.00")
    total_orders = Order.objects.count()
    delivered = Order.objects.filter(status="DELIVERED").count()
    cancelled = Order.objects.filter(status="CANCELLED").count()
    shipped = Order.objects.filter(status="SHIPPED").count()
    pending = Order.objects.filter(status="PENDING").count()
    return {
        "gmv": gmv,
        "total_orders": total_orders,
        "delivered_orders": delivered,
        "cancelled_orders": cancelled,
        "shipped_orders": shipped,
        "pending_orders": pending,
    }


def admin_marketplace_dashboard() -> dict:
    """Comprehensive admin dashboard data."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    from apps.orders.models import Order
    from .models import SellerOrder, SellerProfile

    gmv = Order.objects.exclude(status="CANCELLED").aggregate(s=Sum("grand_total"))["s"] or Decimal("0.00")
    total_commission = SellerOrder.objects.aggregate(
        s=Sum("commission_amount"),
    )["s"] or Decimal("0.00")
    total_seller_earnings = SellerOrder.objects.aggregate(
        s=Sum("seller_earning"),
    )["s"] or Decimal("0.00")
    pending_settlement_amount = SellerOrder.objects.filter(
        settlement_status="PENDING",
    ).exclude(status=SellerOrder.STATUS_CANCELLED).aggregate(
        s=Sum("seller_earning"),
    )["s"] or Decimal("0.00")

    sellers_by_status = list(
        SellerProfile.objects.values("status").annotate(count=Count("id"))
    )

    return {
        "gmv": gmv,
        "total_commission": total_commission,
        "total_seller_earnings": total_seller_earnings,
        "pending_settlement_amount": pending_settlement_amount,
        "total_orders": Order.objects.count(),
        "pending_orders": Order.objects.filter(status="PENDING").count(),
        "shipped_orders": Order.objects.filter(status="SHIPPED").count(),
        "delivered_orders": Order.objects.filter(status="DELIVERED").count(),
        "cancelled_orders": Order.objects.filter(status="CANCELLED").count(),
        "total_customers": User.objects.filter(role="customer").count(),
        "total_sellers": SellerProfile.objects.count(),
        "pending_seller_applications": SellerProfile.objects.filter(status=SellerProfile.STATUS_PENDING).count(),
        "active_sellers": SellerProfile.objects.filter(status=SellerProfile.STATUS_APPROVED).count(),
        "suspended_sellers": SellerProfile.objects.filter(status=SellerProfile.STATUS_SUSPENDED).count(),
        "sellers_by_status": sellers_by_status,
    }


def admin_top_sellers():
    from apps.marketplace.models import SellerOrder, SellerProfile
    rows = (
        SellerProfile.objects.filter(status=SellerProfile.STATUS_APPROVED)
        .annotate(
            order_count=Count("seller_orders"),
            total_sales=Sum("seller_orders__subtotal"),
            total_earnings=Sum("seller_orders__seller_earning"),
        )
        .order_by("-total_sales")[:10]
    )
    return [
        {
            "id": r.id,  # type: ignore
            "store_name": r.store_name,
            "store_slug": r.store_slug,
            "store_logo": r.store_logo.url if r.store_logo else None,
            "order_count": r.order_count or 0,  # type: ignore
            "total_sales": r.total_sales or Decimal("0.00"),  # type: ignore
            "total_earnings": r.total_earnings or Decimal("0.00"),  # type: ignore
            "average_rating": float(r.average_rating),
            "review_count": r.review_count,
        }
        for r in rows
    ]


def admin_top_products():
    from apps.catalog.models import Product
    rows = (
        Product.objects.exclude(seller_orders__isnull=True)
        .annotate(
            units_sold=Sum("seller_orders__items__quantity"),
            revenue=Sum("seller_orders__items__unit_price_snapshot"),
        )
        .order_by("-units_sold")[:10]
    )
    return [
        {
            "id": p.id,  # type: ignore
            "name": p.name,
            "slug": p.slug,
            "units_sold": p.units_sold or 0,  # type: ignore
            "revenue": p.revenue or Decimal("0.00"),  # type: ignore
        }
        for p in rows
    ]


def recompute_seller_rating(seller: SellerProfile):
    """Recompute the denormalized average_rating / review_count for a
    seller based on APPROVED reviews of any of the seller's products."""
    from apps.reviews.models import Review

    approved = Review.objects.filter(
        product__seller=seller,
        status="APPROVED",
    )
    count = approved.count()
    if count == 0:
        seller.average_rating = Decimal("0.00")
        seller.review_count = 0
    else:
        avg = approved.aggregate(a=Avg("rating"))["a"] or 0
        seller.average_rating = round(Decimal(avg), 2)
        seller.review_count = count
    seller.save(update_fields=["average_rating", "review_count"])


# TruncDate import (kept here to keep the import graph tidy in views.py)
from django.db.models.functions import TruncDate
from django.db.models import Q  # noqa: E402
