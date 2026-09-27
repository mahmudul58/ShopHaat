from datetime import timedelta

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import ProductVariant
from apps.core.permissions import IsAdminRole
from apps.coupons.models import Coupon

from .models import Order, OrderItem

LOW_STOCK_THRESHOLD = 10

_TRUNC_FUNCS = {"daily": TruncDate, "weekly": TruncWeek, "monthly": TruncMonth}


class AdminAnalyticsSummaryView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        period = request.query_params.get("period", "daily")
        trunc_func = _TRUNC_FUNCS.get(period, TruncDate)

        since = timezone.now() - timedelta(days=90)
        paid_orders = Order.objects.filter(placed_at__gte=since).exclude(status="CANCELLED")

        revenue_over_time = list(
            paid_orders.annotate(period=trunc_func("placed_at"))
            .values("period")
            .annotate(revenue=Sum("grand_total"))
            .order_by("period")
        )

        orders_by_status = list(
            Order.objects.values("status").annotate(count=Count("id")).order_by("status")
        )

        top_products = list(
            OrderItem.objects.exclude(order__status="CANCELLED")
            .values(name=F("product_name_snapshot"))
            .annotate(units_sold=Sum("quantity"), revenue=Sum(F("unit_price_snapshot") * F("quantity")))
            .order_by("-units_sold")[:10]
        )

        low_stock = list(
            ProductVariant.objects.filter(stock__lt=LOW_STOCK_THRESHOLD)
            .select_related("product")
            .values("sku", "stock", product_name=F("product__name"))
            .order_by("stock")[:50]
        )

        coupon_usage = list(
            Coupon.objects.annotate(times_used=Count("redemptions")).values("code", "times_used").order_by("-times_used")[:20]
        )

        return Response(
            {
                "period": period,
                "revenue_over_time": revenue_over_time,
                "orders_by_status": orders_by_status,
                "top_products": top_products,
                "low_stock": low_stock,
                "coupon_usage": coupon_usage,
            }
        )
