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

    # Bust the per-seller dashboard cache so the next /seller/dashboard
    # call returns the fresh counts/charts instead of a 30-60s stale one.
    # Done here (and not in the view) so all transition entry points —
    # seller, admin, customer return — are covered uniformly.
    try:
        from django.core.cache import cache
        cache.delete(f"seller-dashboard:{seller_order.seller_id}")
        cache.delete(f"seller-dashboard-charts:{seller_order.seller_id}")
        cache.delete(f"seller-earnings:{seller_order.seller_id}")
    except Exception:
        # Cache backend not configured in tests; never block a transition.
        pass

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
    """Real-data seller dashboard summary. No hardcoded numbers.

    The previous implementation iterated `product.variants.all()` in a
    Python loop and fired one query per row. With 200+ products that
    is enough to push the dashboard past Render's gunicorn timeout on
    the Free plan. We now do the low-stock lookup as a single DB-side
    query that joins Product + Variant in one go."""
    seller_orders = seller.seller_orders.all()  # type: ignore

    totals = seller_orders.aggregate(
        total_sales=Sum("subtotal"),
        total_commission=Sum("commission_amount"),
        total_earnings=Sum("seller_earning"),
    )
    # Combine delivered/cancelled/total counts into a single grouped
    # query instead of three separate COUNT() round-trips.
    counts = seller_orders.aggregate(
        total=Count("id"),
        delivered=Count("id", filter=Q(status=SellerOrder.STATUS_DELIVERED)),
        cancelled=Count("id", filter=Q(status=SellerOrder.STATUS_CANCELLED)),
    )

    settlement = seller_orders.aggregate(
        pending_amount=Sum(
            "seller_earning",
            filter=~Q(status__in=[
                SellerOrder.STATUS_DELIVERED,
                SellerOrder.STATUS_REFUNDED,
            ]),
        ),
        paid_settlement=Sum(
            "seller_earning",
            filter=Q(settlement_status="PAID"),
        ),
    )

    by_status = list(
        seller_orders.values("status").annotate(count=Count("id")).order_by("status")
    )
    by_status_map = {row["status"]: row["count"] for row in by_status}
    by_status_full = [
        {"status": code, "label": label, "count": by_status_map.get(code, 0)}
        for code, label in SellerOrder.STATUS_CHOICES
    ]

    # --- Low-stock: single grouped query ----------------------------------
    LOW_STOCK_THRESHOLD = 10
    from apps.catalog.models import ProductVariant

    low_stock_qs = (
        ProductVariant.objects.filter(
            product__seller=seller,
            product__is_active=True,
            stock__lte=LOW_STOCK_THRESHOLD,
        )
        .select_related("product")
        .order_by("stock", "id")[:10]
    )
    low_stock_products = [
        {
            "product_id": v.product_id,
            "product_slug": v.product.slug,
            "product_name": v.product.name,
            "variant_id": v.id,
            "sku": v.sku,
            "stock": v.stock,
            "is_out_of_stock": v.stock == 0,
        }
        for v in low_stock_qs
    ]
    low_stock_count = ProductVariant.objects.filter(
        product__seller=seller,
        product__is_active=True,
        stock__lte=LOW_STOCK_THRESHOLD,
    ).count()
    total_products = seller.products.filter(is_active=True).count()  # type: ignore

    return {
        "total_sales": totals["total_sales"] or Decimal("0.00"),
        "total_earnings": totals["total_earnings"] or Decimal("0.00"),
        "total_commission": totals["total_commission"] or Decimal("0.00"),
        "total_orders": counts["total"] or 0,
        "delivered_orders": counts["delivered"] or 0,
        "cancelled_orders": counts["cancelled"] or 0,
        "pending_settlement": settlement["pending_amount"] or Decimal("0.00"),
        "paid_settlement": settlement["paid_settlement"] or Decimal("0.00"),
        "total_products": total_products,
        "low_stock_products": low_stock_products,
        "low_stock_count": low_stock_count,
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
    # Aggregate over OrderItem rows attached to a variant of the product.
    # Previously this used a non-existent `seller_orders` reverse relation
    # and threw FieldError (BUG-BIZ-001).
    rows = (
        Product.objects.filter(variants__order_items__isnull=False)
        .annotate(
            units_sold=Sum("variants__order_items__quantity"),
            revenue=Sum(
                F("variants__order_items__unit_price_snapshot")
                * F("variants__order_items__quantity")
            ),
        )
        .distinct()
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
