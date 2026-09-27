from rest_framework import serializers

from .models import Order, OrderItem, OrderStatusHistory, PaymentTransaction, ShippingMethod


class ShippingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod
        fields = ["id", "name", "cost", "estimated_days_min", "estimated_days_max"]


class OrderItemSellerSerializer(serializers.Serializer):
    """Embedded summary of a SellerOrder within a customer Order."""
    id = serializers.IntegerField()
    status = serializers.CharField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    commission_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    seller_earning = serializers.DecimalField(max_digits=10, decimal_places=2)
    store_name = serializers.CharField()
    store_slug = serializers.CharField()
    store_logo = serializers.CharField(allow_null=True)


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    product_id = serializers.IntegerField(source="variant.product_id", read_only=True)
    product_slug = serializers.CharField(source="variant.product.slug", read_only=True)
    product_image = serializers.SerializerMethodField()
    seller_store_name = serializers.SerializerMethodField()
    seller_store_slug = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "product_name_snapshot", "variant_attributes_snapshot",
            "unit_price_snapshot", "quantity", "line_total",
            "product_id", "product_slug", "product_image",
            "seller_order", "seller_store_name", "seller_store_slug",
        ]

    def get_product_image(self, obj):
        if obj.variant and obj.variant.product:
            primary = next(
                (i for i in obj.variant.product.images.all() if i.is_primary), None
            ) or obj.variant.product.images.first()
            if primary:
                request = self.context.get('request')
                if primary.image:
                    return request.build_absolute_uri(primary.image.url) if request else primary.image.url
                return primary.image_url
        return None

    def get_seller_store_name(self, obj):
        return obj.variant.product.seller.store_name if obj.variant and obj.variant.product and obj.variant.product.seller else None

    def get_seller_store_slug(self, obj):
        return obj.variant.product.seller.store_slug if obj.variant and obj.variant.product and obj.variant.product.seller else None


class SellerOrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        from apps.marketplace.models import SellerOrderStatusHistory
        model = SellerOrderStatusHistory
        fields = ["status", "changed_at", "note"]


class SellerOrderSummarySerializer(serializers.ModelSerializer):
    """Embedded view of each SellerOrder attached to the customer Order."""
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = SellerOrderStatusHistorySerializer(many=True, read_only=True)
    store_name = serializers.CharField(source="seller.store_name", read_only=True)
    store_slug = serializers.CharField(source="seller.store_slug", read_only=True)
    store_logo = serializers.SerializerMethodField()

    class Meta:
        from apps.marketplace.models import SellerOrder
        model = SellerOrder
        fields = [
            "id", "status", "subtotal", "shipping_contribution",
            "commission_amount", "seller_earning", "settlement_status",
            "tracking_number", "courier_name",
            "store_name", "store_slug", "store_logo",
            "items", "status_history",
        ]

    def get_store_logo(self, obj):
        if obj.seller.store_logo:
            request = self.context.get("request")
            url = obj.seller.store_logo.url
            return request.build_absolute_uri(url) if request else url
        return None


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ["status", "changed_at", "note"]


class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = ["method", "status", "amount", "reference_id", "created_at"]


class OrderListSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source="user.email", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    payment_transactions = PaymentTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["order_number", "status", "grand_total", "placed_at", "customer_email", "items", "payment_transactions"]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    seller_orders = SellerOrderSummarySerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    payment_transactions = PaymentTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "order_number", "status", "shipping_address_snapshot",
            "items", "seller_orders",
            "subtotal", "discount_amount", "shipping_cost", "grand_total",
            "payment_method", "placed_at", "status_history", "payment_transactions",
        ]


class PlaceOrderSerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=Order.PAYMENT_METHOD_CHOICES)
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    cart_item_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True
    )


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)
    note = serializers.CharField(required=False, allow_blank=True)
