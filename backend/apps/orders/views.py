from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.exceptions import ConflictError
from apps.core.permissions import IsStaffOrAdmin
from apps.marketplace.services import transition_seller_order

from .models import Order, ShippingMethod
from .serializers import (
    OrderDetailSerializer,
    OrderListSerializer,
    PlaceOrderSerializer,
    ShippingMethodSerializer,
    UpdateOrderStatusSerializer,
)
from .services import place_order, transition_order_status


class ShippingMethodListView(generics.ListAPIView):
    queryset = ShippingMethod.objects.filter(is_active=True)
    serializer_class = ShippingMethodSerializer
    permission_classes = [permissions.IsAuthenticated]


class AdminOrderListView(generics.ListAPIView):
    """Staff/admin order-management list — every order, not just the
    requesting user's own (unlike OrderListCreateView.GET below).
    Optional ?status=PENDING filter for the management screen's tabs."""

    serializer_class = OrderListSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        from django.db.models import Case, When, Value, IntegerField
        queryset = Order.objects.annotate(
            is_delivered=Case(
                When(status="DELIVERED", then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by("is_delivered", "-placed_at")
        
        status_filter = self.request.GET.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class OrderListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "order_placement"

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by("-placed_at")

    def get_serializer_class(self):
        return PlaceOrderSerializer if self.request.method == "POST" else OrderListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = place_order(user=request.user, **serializer.validated_data)
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    lookup_field = "order_number"
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "role", None) in ("staff", "admin"):
            return Order.objects.all()
        return Order.objects.filter(user=user)


class CancelOrderView(APIView):
    """Cancel a customer order. With multi-vendor, every seller order goes
    CANCELLED so each seller's slice is consistently marked."""
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _cancel_all_seller_orders(order, actor):
        from apps.marketplace.models import SellerOrder
        for so in order.seller_orders.all():
            if so.status in {"PENDING", "CONFIRMED"}:
                try:
                    transition_seller_order(
                        seller_order=so,
                        new_status=SellerOrder.STATUS_CANCELLED,
                        actor=actor,
                        note="Customer cancelled the parent order.",
                        actor_role="admin",  # mirror to allow cancel from any non-final state
                    )
                except ConflictError:
                    # Seller-order is already in a state that can't be cancelled
                    # (e.g. SHIPPED). Skip without aborting the parent order.
                    continue

    def patch(self, request, order_number):
        from django.http import Http404
        # Closes BUG-ORD-001: a missing order_number and an order_number
        # belonging to another user must produce the same 404 response so
        # the endpoint cannot be used for order-existence enumeration.
        try:
            order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            raise Http404("Order not found.")

        if order.status not in {"PENDING", "CONFIRMED"}:
            raise ConflictError("Order cannot be cancelled at this stage.")

        transition_order_status(order, "CANCELLED", actor=request.user, note="Cancelled by customer.")
        self._cancel_all_seller_orders(order, request.user)
        # Re-fetch the order so the serializer reflects the cascade.
        order.refresh_from_db()
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_200_OK)


class CustomerReturnRequestView(APIView):
    """Customer asks for a return on a delivered order. The seller/admin
    then approves/rejects via the marketplace seller-order transition."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_number):
        from django.http import Http404
        # Same enumeration-resistance rule as the cancel endpoint. See
        # BUG-ORD-001.
        try:
            order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            raise Http404("Order not found.")

        if order.status != "DELIVERED":
            raise ConflictError("Only delivered orders are eligible for return.")

        from apps.marketplace.models import SellerOrder
        from apps.marketplace.services import transition_seller_order as tso
        for so in SellerOrder.objects.filter(order=order, status=SellerOrder.STATUS_DELIVERED):
            tso(
                seller_order=so,
                new_status=SellerOrder.STATUS_RETURN_REQUESTED,
                actor=request.user,
                note="Customer initiated return request.",
                actor_role="customer",
            )
        return Response({"detail": "Return request submitted."}, status=status.HTTP_200_OK)


class AdminUpdateOrderStatusView(APIView):
    permission_classes = [IsStaffOrAdmin]

    def patch(self, request, order_number):
        from django.http import Http404
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            raise Http404("Order not found.")

        serializer = UpdateOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        transition_order_status(
            order,
            serializer.validated_data["status"],
            actor=request.user,
            note=serializer.validated_data.get("note", ""),
            is_staff_actor=True,
        )
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_200_OK)
