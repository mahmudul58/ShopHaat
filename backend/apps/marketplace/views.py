"""Multi-vendor marketplace API endpoints.

All views in this module are wired together by apps/marketplace/urls.py.
Endpoints are split into four sections: registration & approval, seller
self-service, admin seller management, seller-orders / shipments, and
public storefront APIs.

Role-based authorization is enforced at the permission class level —
never trust the frontend to gate these routes.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.catalog.models import Category, Product
from apps.core.permissions import (
    IsActiveSeller,
    IsAdminRole,
    IsApprovedSeller,
    IsSeller,
    IsStaffOrAdmin,
)
from apps.marketplace.models import (
    MarketplaceCommission,
    Notification,
    PlatformSettings,
    SellerApplicationHistory,
    SellerOrder,
    SellerOrderStatusHistory,
    SellerProfile,
    SellerSettlement,
    Shipment,
    resolve_commission_rate,
)
from apps.marketplace.serializers import (
    AdminSellerListSerializer,
    MarketplaceCommissionSerializer,
    NotificationSerializer,
    PlatformSettingsSerializer,
    SellerApplicationHistorySerializer,
    SellerOrderSerializer,
    SellerOrderTransitionSerializer,
    SellerProfileSerializer,
    SellerProfileUpdateSerializer,
    SellerRegistrationSerializer,
    SellerSettlementSerializer,
    SellerStatusUpdateSerializer,
    ShipmentSerializer,
    StorefrontSerializer,
)
from apps.marketplace.services import (
    admin_marketplace_dashboard,
    admin_top_products,
    admin_top_sellers,
    notify,
    recompute_seller_rating,
    seller_dashboard_charts,
    seller_dashboard_summary,
    transition_seller_order,
)


User = get_user_model()


# ──────────────────────────────────────────────────────────────────────────
# Phase 3: Seller registration & login state
# ──────────────────────────────────────────────────────────────────────────

class SellerRegisterView(generics.GenericAPIView):
    """A logged-in customer (or fresh user without a seller profile) submits
    a seller application. They immediately become role='seller' but status
    starts PENDING so they cannot access the dashboard until approved."""
    serializer_class = SellerRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "seller_application"

    def post(self, request):
        if hasattr(request.user, "seller_profile"):
            raise ValidationError({"detail": "You already have a seller profile."})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(SellerProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class MySellerStatusView(APIView):
    """Returns the current seller's profile (PENDING/APPROVED/etc.).
    Frontend uses this to decide whether to show the application form
    or the dashboard."""
    permission_classes = [permissions.IsAuthenticated, IsSeller]

    def get(self, request):
        try:
            profile = getattr(request.user, "seller_profile", None)
            if not profile:
                raise SellerProfile.DoesNotExist
        except SellerProfile.DoesNotExist:
            return Response({"detail": "No seller profile."}, status=status.HTTP_404_NOT_FOUND)
        data = SellerProfileSerializer(profile).data
        data["history"] = SellerApplicationHistorySerializer(
            profile.history.all(), many=True
        ).data
        return Response(data)


class MySellerProfileView(generics.RetrieveUpdateAPIView):
    """Seller edits their own store profile."""
    permission_classes = [permissions.IsAuthenticated, IsActiveSeller]

    def get_object(self):
        seller = getattr(self.request.user, "seller_profile", None)
        if not seller:
            raise PermissionDenied("No seller profile")
        return seller

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return SellerProfileUpdateSerializer
        return SellerProfileSerializer


# ──────────────────────────────────────────────────────────────────────────
# Phase 7: Seller dashboard endpoints
# ──────────────────────────────────────────────────────────────────────────

class SellerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = getattr(request.user, "seller_profile", None)
        if not seller:
            raise PermissionDenied("No seller profile")
        summary = seller_dashboard_summary(seller)
        summary["store_name"] = seller.store_name
        summary["status"] = seller.status
        summary["average_rating"] = seller.average_rating
        summary["review_count"] = seller.review_count
        return Response(summary)


class SellerDashboardChartsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = getattr(request.user, "seller_profile", None)
        if not seller:
            raise PermissionDenied("No seller profile")
        return Response(seller_dashboard_charts(seller))


# ──────────────────────────────────────────────────────────────────────────
# Admin seller management
# ──────────────────────────────────────────────────────────────────────────

class AdminSellerListView(generics.ListAPIView):
    """Paginated seller list with optional ?status= filter."""
    serializer_class = AdminSellerListSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        qs = SellerProfile.objects.select_related("user").annotate(
            product_count=Count("products", distinct=True),
            seller_order_count=Count("seller_orders", distinct=True),
            total_sales=Sum("seller_orders__subtotal"),
        ).order_by("-applied_at")
        status_filter = self.request.GET.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class AdminSellerDetailView(generics.RetrieveAPIView):
    serializer_class = SellerProfileSerializer
    permission_classes = [IsStaffOrAdmin]
    queryset = SellerProfile.objects.select_related("user").all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        data = SellerProfileSerializer(instance).data
        data["history"] = SellerApplicationHistorySerializer(
            instance.history.all(), many=True
        ).data
        return Response(data)


class AdminSellerStatusUpdateView(APIView):
    """Approve / reject / suspend / reactivate a seller."""
    permission_classes = [IsAdminRole]

    @transaction.atomic
    def post(self, request, pk):
        seller = get_object_or_404(SellerProfile, pk=pk)
        serializer = SellerStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        reason = serializer.validated_data.get("reason", "")

        if seller.status == new_status:
            raise ValidationError({"status": "Already in that status."})

        old = seller.status
        seller.status = new_status
        if new_status == SellerProfile.STATUS_REJECTED:
            seller.rejection_reason = reason
        elif new_status == SellerProfile.STATUS_SUSPENDED:
            seller.suspension_reason = reason
        elif new_status == SellerProfile.STATUS_APPROVED and not seller.approved_at:
            from django.utils import timezone
            seller.approved_at = timezone.now()
        seller.save()

        SellerApplicationHistory.objects.create(
            seller=seller,
            actor=request.user,
            action=f"status_changed:{new_status.lower()}",
            from_status=old,
            to_status=new_status,
            reason=reason,
        )

        # In-app notification for the seller.
        notify(
            seller.user,
            target_role="seller",
            title={
                SellerProfile.STATUS_APPROVED: "Your seller account has been approved",
                SellerProfile.STATUS_REJECTED: "Your seller application has been rejected",
                SellerProfile.STATUS_SUSPENDED: "Your seller account has been suspended",
                SellerProfile.STATUS_PENDING: "Your seller account is pending",
            }.get(new_status, "Seller status updated"),
            body=reason,
            link="/seller",
        )

        return Response(SellerProfileSerializer(seller).data)


# ──────────────────────────────────────────────────────────────────────────
# Public storefront endpoints
# ──────────────────────────────────────────────────────────────────────────

class StorefrontDetailView(generics.RetrieveAPIView):
    """GET /stores/<slug>/ — public storefront metadata."""
    serializer_class = StorefrontSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "store_slug"
    queryset = SellerProfile.objects.filter(status=SellerProfile.STATUS_APPROVED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        data = self.get_serializer(instance).data
        # Add real product count for the storefront tiles.
        data["product_count"] = instance.products.filter(is_active=True, status="ACTIVE").count()
        return Response(data)


class StorefrontProductsView(generics.ListAPIView):
    """GET /stores/<slug>/products/ — paginated, browsable list."""
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        from apps.catalog.serializers import ProductListSerializer
        return ProductListSerializer

    def get_queryset(self):
        store_slug = self.kwargs["store_slug"]
        seller = get_object_or_404(
            SellerProfile, store_slug=store_slug, status=SellerProfile.STATUS_APPROVED
        )
        return (
            Product.objects.filter(seller=seller, is_active=True, status="ACTIVE")
            .select_related("brand", "subcategory__category")
            .prefetch_related("variants", "images")
            .order_by("-created_at")
        )


# ──────────────────────────────────────────────────────────────────────────
# Seller order management
# ──────────────────────────────────────────────────────────────────────────

class SellerOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """All seller-side order views. `get_queryset` is locked to the caller's
    seller profile so a seller can never see another seller's orders."""
    serializer_class = SellerOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsApprovedSeller]

    def get_queryset(self):
        from django.db.models import Case, When, Value, IntegerField
        seller = getattr(self.request.user, "seller_profile", None)
        if not seller:
            return SellerOrder.objects.none()
        qs = SellerOrder.objects.filter(seller=seller).select_related(
            "order", "order__user", "shipment"
        ).prefetch_related(
            "items__variant__product__images",
            "status_history",
        ).annotate(
            is_delivered=Case(
                When(status="DELIVERED", then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by("is_delivered", "-created_at")
        status_filter = self.request.GET.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        seller_order = self.get_object()
        ser = SellerOrderTransitionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        new_status = ser.validated_data["status"]
        note = ser.validated_data.get("note", "")
        shipment_fields = {
            "tracking_number": ser.validated_data.get("tracking_number"),
            "courier_name": ser.validated_data.get("courier_name"),
            "pickup_date": ser.validated_data.get("pickup_date"),
            "shipped_date": ser.validated_data.get("shipped_date"),
            "delivery_date": ser.validated_data.get("delivery_date"),
        }
        # Strip None so the service doesn't accidentally clear values.
        shipment_fields = {k: v for k, v in shipment_fields.items() if v}
        transition_seller_order(
            seller_order=seller_order,
            new_status=new_status,
            actor=request.user,
            note=note,
            actor_role="seller",
            shipment_fields=shipment_fields or None,
        )

        # Customer notification on key transitions.
        if new_status in {
            SellerOrder.STATUS_CONFIRMED,
            SellerOrder.STATUS_PROCESSING,
            SellerOrder.STATUS_SHIPPED,
            SellerOrder.STATUS_DELIVERED,
            SellerOrder.STATUS_CANCELLED,
        }:
            notify(
                seller_order.order.user,
                target_role="customer",
                title=f"Order #{seller_order.order.order_number} updated",
                body=f"Your order is now {seller_order.get_status_display()}.",
                link=f"/dashboard/orders/{seller_order.order.order_number}",
            )

        return Response(SellerOrderSerializer(seller_order).data)


# ──────────────────────────────────────────────────────────────────────────
# Admin seller-order management (marketplace fulfillment)
# ──────────────────────────────────────────────────────────────────────────

class AdminSellerOrderListView(generics.ListAPIView):
    serializer_class = SellerOrderSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        from django.db.models import Case, When, Value, IntegerField
        qs = SellerOrder.objects.select_related(
            "order", "order__user", "seller", "shipment"
        ).prefetch_related(
            "items__variant__product__images",
            "status_history",
        ).annotate(
            is_delivered=Case(
                When(status="DELIVERED", then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by("is_delivered", "-created_at")
        
        params = self.request.GET
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if params.get("seller"):
            qs = qs.filter(seller__store_slug=params["seller"])
        return qs


class AdminSellerOrderDetailView(generics.RetrieveAPIView):
    serializer_class = SellerOrderSerializer
    permission_classes = [IsStaffOrAdmin]
    queryset = SellerOrder.objects.select_related(
        "order", "order__user", "seller", "shipment"
    ).prefetch_related("items__variant__product__images", "status_history")


class AdminSellerOrderTransitionView(APIView):
    """Admin-only state transitions for the right half of the lifecycle."""
    permission_classes = [IsStaffOrAdmin]

    @transaction.atomic
    def post(self, request, pk):
        seller_order = get_object_or_404(SellerOrder, pk=pk)
        ser = SellerOrderTransitionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        shipment_fields = {
            k: ser.validated_data.get(k)
            for k in ("tracking_number", "courier_name", "pickup_date", "shipped_date", "delivery_date")
        }
        shipment_fields = {k: v for k, v in shipment_fields.items() if v}
        transition_seller_order(
            seller_order=seller_order,
            new_status=ser.validated_data["status"],
            actor=request.user,
            note=ser.validated_data.get("note", ""),
            actor_role="admin",
            shipment_fields=shipment_fields or None,
        )

        notify(
            seller_order.order.user,
            target_role="customer",
            title=f"Order #{seller_order.order.order_number} updated",
            body=f"Your order is now {seller_order.get_status_display()}.",
            link=f"/dashboard/orders/{seller_order.order.order_number}",
        )
        return Response(SellerOrderSerializer(seller_order).data)


class AdminShipmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShipmentSerializer
    permission_classes = [IsStaffOrAdmin]
    queryset = Shipment.objects.select_related("seller_order", "seller_order__order").all()


# ──────────────────────────────────────────────────────────────────────────
# Earnings / settlement
# ──────────────────────────────────────────────────────────────────────────

class SellerEarningsView(APIView):
    """Per-seller earnings summary. Same shape the dashboard card uses."""
    permission_classes = [permissions.IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = getattr(request.user, "seller_profile", None)
        if not seller:
            raise PermissionDenied("No seller profile")
        seller_orders = SellerOrder.objects.filter(seller=seller)
        totals = seller_orders.aggregate(
            gross=Sum("subtotal"),
            commission=Sum("commission_amount"),
            earnings=Sum("seller_earning"),
        )
        paid = seller_orders.filter(settlement_status="PAID").aggregate(s=Sum("seller_earning"))["s"] or Decimal("0.00")
        pending = seller_orders.exclude(settlement_status="PAID").aggregate(s=Sum("seller_earning"))["s"] or Decimal("0.00")
        return Response({
            "total_sales": totals["gross"] or Decimal("0.00"),
            "marketplace_commission": totals["commission"] or Decimal("0.00"),
            "net_earnings": totals["earnings"] or Decimal("0.00"),
            "paid_settlement": paid,
            "pending_settlement": pending,
        })


class SellerSettlementListView(generics.ListAPIView):
    """List of seller-side settlements for the logged-in seller."""
    serializer_class = SellerSettlementSerializer
    permission_classes = [permissions.IsAuthenticated, IsApprovedSeller]

    def get_queryset(self):
        seller = getattr(self.request.user, "seller_profile", None)
        if not seller:
            return SellerSettlement.objects.none()
        return SellerSettlement.objects.filter(seller=seller)


class AdminSettlementListView(generics.ListAPIView):
    serializer_class = SellerSettlementSerializer
    permission_classes = [IsAdminRole]
    queryset = SellerSettlement.objects.select_related("seller").all()


class AdminSettlementUpdateView(APIView):
    permission_classes = [IsAdminRole]

    @transaction.atomic
    def patch(self, request, pk):
        settlement = get_object_or_404(SellerSettlement, pk=pk)
        new_status = request.data.get("status")
        if new_status not in {"PENDING", "PROCESSING", "PAID", "ON_HOLD"}:
            raise ValidationError({"status": "Invalid status."})
        settlement.status = new_status
        if new_status == "PAID":
            from django.utils import timezone
            settlement.paid_at = timezone.now()
            # Flip every linked SellerOrder to PAID for the per-row view.
            settlement.seller_orders.update(settlement_status="PAID")
        settlement.save()
        # Notify the seller.
        if settlement.seller:
            notify(
                settlement.seller.user,
                target_role="seller",
                title=f"Settlement updated to {new_status}",
                body=f"Period: {settlement.period_start} — {settlement.period_end}. Amount: ৳{settlement.net_amount}",
                link="/seller/earnings",
            )
        return Response(SellerSettlementSerializer(settlement).data)


class AdminGenerateSettlementsView(APIView):
    """Generate SellerSettlement aggregates from SellerOrders that are
    DELIVERED and still PENDING settlement. Idempotent by period.

    Returns the count of eligible orders the request would have settled
    as `eligible_count` even when zero settlements are created, so the
    admin UI can show the user that there's nothing new to settle
    instead of leaving them wondering whether the button is broken.
    """
    permission_classes = [IsAdminRole]

    @transaction.atomic
    def post(self, request):
        # Group all eligible seller-orders by seller into one settlement
        # each (per request). A real implementation would bucket by week/
        # month; we keep this simple and predictable.
        #
        # We also exclude any order already attached to *any* settlement
        # (even from a previous run that didn't get fully paid) so we
        # never double-count the same earnings across two settlements.
        eligible_qs = SellerOrder.objects.filter(
            settlement_status="PENDING",
            status=SellerOrder.STATUS_DELIVERED,
            settlements__isnull=True,
        )
        eligible_count = eligible_qs.distinct().count()

        seller_orders = eligible_qs.select_related("seller").distinct()

        from collections import defaultdict
        from datetime import date, timedelta

        bucketed = defaultdict(list)
        for so in seller_orders:
            bucketed[so.seller.pk].append(so)

        created = []
        for seller_id, items in bucketed.items():
            seller = items[0].seller
            gross = sum((i.subtotal for i in items), Decimal("0.00"))
            commission = sum((i.commission_amount for i in items), Decimal("0.00"))
            net = sum((i.seller_earning for i in items), Decimal("0.00"))
            today = date.today()
            period_start = today - timedelta(days=30)
            settlement = SellerSettlement.objects.create(
                seller=seller,
                period_start=period_start,
                period_end=today,
                gross_amount=gross,
                commission_amount=commission,
                net_amount=net,
                status="PENDING",
            )
            settlement.seller_orders.set(items)
            # Flip each order's settlement_status to PROCESSING so a
            # second invocation of "Generate" won't pick them up again,
            # while AdminSettlementUpdateView can still move them to PAID
            # (or back to PENDING on hold) later.
            SellerOrder.objects.filter(pk__in=[i.pk for i in items]).update(
                settlement_status="PROCESSING"
            )
            created.append(settlement.pk)
        return Response({
            "created_settlement_ids": created,
            "count": len(created),
            "eligible_count": eligible_count,
        })


class AdminSettlementEligibilityView(APIView):
    """How many SellerOrders are currently eligible for settlement.

    Useful for the admin UI to show a counter on the Generate button
    ("3 orders ready") and disable the button when there's nothing new.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = SellerOrder.objects.filter(
            settlement_status="PENDING",
            status=SellerOrder.STATUS_DELIVERED,
            settlements__isnull=True,
        ).distinct()
        return Response({"eligible_count": qs.count()})


# ──────────────────────────────────────────────────────────────────────────
# Notifications
# ──────────────────────────────────────────────────────────────────────────

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"updated": updated})

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"ok": True})


# ──────────────────────────────────────────────────────────────────────────
# Commission admin
# ──────────────────────────────────────────────────────────────────────────

class MarketplaceCommissionViewSet(viewsets.ModelViewSet):
    """Admin CRUD on commission rules. Supports an optional `?scope=`
    query param for filtering, and a custom `effective` action that
    returns the resolved rate for a (seller, category) pair — used by
    the Commissions page preview panel."""
    queryset = MarketplaceCommission.objects.select_related("category", "seller").all()
    serializer_class = MarketplaceCommissionSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = super().get_queryset()
        scope = self.request.GET.get("scope")
        if scope:
            qs = qs.filter(scope=scope)
        return qs.order_by("scope", "-updated_at")

    @action(detail=False, methods=["get"], url_path="effective")
    def effective(self, request):
        """GET /api/v1/admin/commissions/effective/?seller_id=&category_id=
        Returns the resolved rate and whether the per-seller override
        (SellerProfile.commission_rate) won — so the UI can show the
        user *why* a particular rate is being used."""
        seller_id = request.query_params.get("seller_id")
        if not seller_id:
            raise ValidationError({"seller_id": "seller_id is required."})
        seller = get_object_or_404(SellerProfile, pk=seller_id)
        category = None
        category_id = request.query_params.get("category_id")
        if category_id:
            category = get_object_or_404(Category, pk=category_id)
        rate = resolve_commission_rate(seller=seller, category=category)
        return Response({
            "rate_percent": str(rate),
            "seller_id": seller.pk,
            "category_id": category.pk if category else None,
            "seller_overrides": seller.commission_rate is not None,
        })


class PlatformSettingsView(APIView):
    """GET / PATCH /api/v1/admin/settings/ — the PlatformSettings singleton.
    PATCH always stamps `updated_by=request.user` so the Settings page can
    show who last edited the values."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        obj = PlatformSettings.get_solo()
        return Response(PlatformSettingsSerializer(obj).data)

    def patch(self, request):
        obj = PlatformSettings.get_solo()
        ser = PlatformSettingsSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save(updated_by=request.user)
        return Response(ser.data)


# ──────────────────────────────────────────────────────────────────────────
# Admin marketplace dashboard
# ──────────────────────────────────────────────────────────────────────────

class AdminMarketplaceDashboardView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response({
            "summary": admin_marketplace_dashboard(),
            "top_sellers": admin_top_sellers(),
            "top_products": admin_top_products(),
        })


class AdminSellerProductsView(generics.ListAPIView):
    """Lists products for a specific seller (admin moderation view)."""
    permission_classes = [IsStaffOrAdmin]

    def get_serializer_class(self):
        from apps.catalog.serializers import ProductListSerializer
        return ProductListSerializer

    def get_queryset(self):
        seller = get_object_or_404(SellerProfile, pk=self.kwargs["pk"])
        return (
            Product.objects.filter(seller=seller)
            .select_related("brand", "subcategory__category")
            .prefetch_related("variants", "images")
            .order_by("-created_at")
        )


class AdminSellerOrdersView(generics.ListAPIView):
    permission_classes = [IsStaffOrAdmin]

    def get_serializer_class(self):
        return SellerOrderSerializer

    def get_queryset(self):
        seller = get_object_or_404(SellerProfile, pk=self.kwargs["pk"])
        return SellerOrder.objects.filter(seller=seller).select_related(
            "order", "order__user", "shipment"
        ).prefetch_related(
            "items__variant__product__images",
            "status_history",
        ).order_by("-created_at")
