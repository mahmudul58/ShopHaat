from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from django.contrib.auth import get_user_model

User = get_user_model()

from .models import (
    MarketplaceCommission,
    Notification,
    PlatformSettings,
    SellerApplicationHistory,
    SellerOrder,
    SellerOrderStatusHistory,
    SellerProfile,
    SellerSettlement,
    Shipment,
)


# ──────────────────────────────────────────────────────────────────────────
# Seller profiles
# ──────────────────────────────────────────────────────────────────────────

class SellerRegistrationSerializer(serializers.ModelSerializer):
    """Used by a logged-in customer to apply as a seller. The user record
    is updated to role='seller' in the same transaction so the seller can
    immediately access the seller dashboard even before approval."""
    user_full_name = serializers.CharField(source="user.full_name", required=False)
    user_phone = serializers.CharField(source="user.phone", required=False, allow_blank=True)

    class Meta:
        model = SellerProfile
        fields = [
            "store_name", "store_slug", "description",
            "business_name", "business_type", "trade_license_no",
            "address_line1", "address_line2", "city", "district", "area", "country",
            "bank_name", "bank_account_name", "bank_account_number",
            "mobile_banking_provider", "mobile_banking_number",
            "user_full_name", "user_phone",
        ]

    def validate_store_slug(self, value):
        if SellerProfile.objects.filter(store_slug=value).exists():
            raise serializers.ValidationError("This store URL is already taken.")
        return value

    def validate_store_name(self, value):
        if SellerProfile.objects.filter(store_name__iexact=value).exists():
            raise serializers.ValidationError("A store with this name already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = self.context["request"].user
        user_data = validated_data.pop("user", {})

        # Promote the underlying user to seller role. We do this before
        # creating the profile so the OneToOne reverse accessor works.
        if "full_name" in user_data and user_data["full_name"]:
            user.full_name = user_data["full_name"]
        if "phone" in user_data and user_data["phone"]:
            user.phone = user_data["phone"]
        
        if user.role == "customer":
            user.role = "seller"
            
        user.save(update_fields=["full_name", "phone", "role"])

        profile = SellerProfile.objects.create(user=user, **validated_data)
        SellerApplicationHistory.objects.create(
            seller=profile,
            actor=user,
            action="applied",
            from_status="",
            to_status=SellerProfile.STATUS_PENDING,
            reason="Seller submitted application.",
        )
        return profile


class SellerProfileSerializer(serializers.ModelSerializer):
    """Public read for storefront pages; includes denormalized stats."""
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    product_count = serializers.SerializerMethodField()
    seller_order_count = serializers.SerializerMethodField()

    class Meta:
        model = SellerProfile
        fields = [
            "id", "store_name", "store_slug", "store_logo", "store_banner",
            "description", "country", "city", "district", "area",
            "average_rating", "review_count", "followers_count", "status",
            "email", "phone", "full_name",
            "product_count", "seller_order_count",
        ]

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()

    def get_seller_order_count(self, obj):
        return obj.seller_orders.count()


class SellerProfileUpdateSerializer(serializers.ModelSerializer):
    """Used by the seller's own edit-profile endpoint. Excludes status
    fields — only the admin can change approval/suspension state."""

    class Meta:
        model = SellerProfile
        fields = [
            "store_name", "description", "store_logo", "store_banner",
            "business_name", "business_type", "trade_license_no",
            "address_line1", "address_line2", "city", "district", "area", "country",
            "bank_name", "bank_account_name", "bank_account_number",
            "mobile_banking_provider", "mobile_banking_number",
        ]


class SellerStatusUpdateSerializer(serializers.Serializer):
    """Admin-only status transition (approve/reject/suspend/reactivate)."""
    status = serializers.ChoiceField(choices=[c[0] for c in SellerProfile.STATUS_CHOICES])
    reason = serializers.CharField(required=False, allow_blank=True)


class SellerApplicationHistorySerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, default=None)

    class Meta:
        model = SellerApplicationHistory
        fields = [
            "id", "action", "from_status", "to_status", "reason",
            "actor_email", "created_at",
        ]


# ──────────────────────────────────────────────────────────────────────────
# Notifications
# ──────────────────────────────────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "body", "link", "is_read", "created_at"]


# ──────────────────────────────────────────────────────────────────────────
# Commission / settlement
# ──────────────────────────────────────────────────────────────────────────

class MarketplaceCommissionSerializer(serializers.ModelSerializer):
    """Hardened commission rule serializer. Enforces:
       - scope ↔ FK coherence (SELLER needs seller, CATEGORY needs category,
         GLOBAL needs neither)
       - rate_percent is between 0 and 100
       - exactly one GLOBAL row exists (others blocked)
       - no duplicate (scope, target) rule
    """
    class Meta:
        model = MarketplaceCommission
        fields = ["id", "scope", "category", "seller", "rate_percent", "is_active",
                  "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        # When patching, `attrs` only carries the fields being updated;
        # fall back to the instance values for everything else.
        instance = self.instance
        scope = attrs.get("scope") or (instance.scope if instance else None)
        category = attrs.get("category", instance.category if instance else None)
        seller = attrs.get("seller", instance.seller if instance else None)
        rate = attrs.get("rate_percent", instance.rate_percent if instance else None)

        # Scope ↔ FK coherence
        if scope == MarketplaceCommission.SCOPE_SELLER and not seller:
            raise serializers.ValidationError({"seller": "Seller-scoped rule requires a seller."})
        if scope == MarketplaceCommission.SCOPE_CATEGORY and not category:
            raise serializers.ValidationError({"category": "Category-scoped rule requires a category."})
        if scope == MarketplaceCommission.SCOPE_GLOBAL and (seller or category):
            raise serializers.ValidationError({"scope": "Global rule must not reference a seller or category."})

        # Rate bounds
        if rate is None or Decimal(rate) < Decimal("0") or Decimal(rate) > Decimal("100"):
            raise serializers.ValidationError({"rate_percent": "Rate must be between 0 and 100."})

        # Single GLOBAL row
        if scope == MarketplaceCommission.SCOPE_GLOBAL:
            qs = MarketplaceCommission.objects.filter(scope=MarketplaceCommission.SCOPE_GLOBAL)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"scope": "Only one active global commission rule is allowed. Edit the existing row."}
                )

        # Duplicate (scope, seller) or (scope, category)
        if scope in (MarketplaceCommission.SCOPE_SELLER, MarketplaceCommission.SCOPE_CATEGORY):
            qs = MarketplaceCommission.objects.filter(scope=scope)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if scope == MarketplaceCommission.SCOPE_SELLER and seller:
                qs = qs.filter(seller=seller)
            if scope == MarketplaceCommission.SCOPE_CATEGORY and category:
                qs = qs.filter(category=category)
            if qs.exists():
                label = "seller" if scope == MarketplaceCommission.SCOPE_SELLER else "category"
                raise serializers.ValidationError(
                    {label: f"A rule for this {label} already exists. Edit it instead of creating a new one."}
                )

        return attrs


class PlatformSettingsSerializer(serializers.ModelSerializer):
    """Platform-wide settings singleton. `updated_by_email` is a small UX
    nicety so the Settings page can show who last edited the values."""
    updated_by_email = serializers.EmailField(source="updated_by.email", read_only=True, default=None)

    class Meta:
        model = PlatformSettings
        fields = [
            "default_commission_rate",
            "shipping_fee_dhaka", "shipping_fee_other", "free_shipping_threshold",
            "currency_code", "currency_symbol",
            "support_email", "support_phone",
            "payout_minimum",
            "site_name", "site_tagline",
            "updated_at", "updated_by", "updated_by_email",
        ]
        read_only_fields = ["updated_at", "updated_by", "updated_by_email"]


class SellerSettlementSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source="seller.store_name", read_only=True)
    seller_orders_count = serializers.SerializerMethodField()

    class Meta:
        model = SellerSettlement
        fields = [
            "id", "seller", "seller_name", "period_start", "period_end",
            "gross_amount", "commission_amount", "net_amount",
            "seller_orders_count", "status", "paid_at", "created_at",
        ]

    def get_seller_orders_count(self, obj):
        return obj.seller_orders.count()


# ──────────────────────────────────────────────────────────────────────────
# Seller orders
# ──────────────────────────────────────────────────────────────────────────

class SellerOrderItemSerializer(serializers.Serializer):
    """Lightweight projection for the seller-side order detail/list."""
    id = serializers.IntegerField()
    product_name = serializers.CharField()
    variant_attributes = serializers.CharField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField()
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    product_image = serializers.CharField(allow_null=True)
    product_slug = serializers.CharField(allow_null=True)


class SellerOrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    status_history = serializers.SerializerMethodField()
    customer_email = serializers.CharField(source="order.user.email", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    shipping_address = serializers.SerializerMethodField()
    shipment = serializers.SerializerMethodField()
    seller_name = serializers.CharField(source="seller.store_name", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    payment_method = serializers.CharField(source="order.payment_method", read_only=True)
    placed_at = serializers.DateTimeField(source="order.placed_at", read_only=True)

    class Meta:
        model = SellerOrder
        fields = [
            "id", "order", "order_number", "seller", "seller_name",
            "status", "subtotal", "discount_amount", "shipping_contribution",
            "commission_amount", "seller_earning", "settlement_status",
            "tracking_number", "courier_name", "seller_notes",
            "items", "status_history", "customer_email", "customer_name",
            "customer_phone", "shipping_address", "shipment",
            "payment_method", "placed_at",
            "created_at", "updated_at",
        ]

    def _items_for(self, obj):
        return obj.items.select_related("variant__product").all()

    def get_items(self, obj):
        out = []
        for item in self._items_for(obj):
            product = getattr(item.variant, "product", None)
            first_image = product.images.first() if product else None
            image_url = None
            if first_image:
                if first_image.image:
                    request = self.context.get("request")
                    url = first_image.image.url
                    image_url = request.build_absolute_uri(url) if request else url
                else:
                    image_url = first_image.image_url
            out.append({
                "id": item.id,
                "product_name": item.product_name_snapshot,
                "variant_attributes": item.variant_attributes_snapshot,
                "unit_price": item.unit_price_snapshot,
                "quantity": item.quantity,
                "line_total": item.line_total,
                "product_image": image_url,
                "product_slug": product.slug if product else None,
            })
        return out

    def get_status_history(self, obj):
        return SellerOrderStatusHistorySerializer(obj.status_history.all(), many=True).data

    def get_customer_name(self, obj):
        addr = obj.order.shipping_address_snapshot or {}
        return addr.get("full_name") or obj.order.user.full_name

    def get_customer_phone(self, obj):
        addr = obj.order.shipping_address_snapshot or {}
        return addr.get("phone") or obj.order.user.phone

    def get_shipping_address(self, obj):
        snap = obj.order.shipping_address_snapshot or {}
        if not snap:
            return None
        return ", ".join(filter(None, [
            snap.get("line1"),
            snap.get("line2"),
            snap.get("city"),
            snap.get("state"),
            snap.get("postal_code"),
        ]))

    def get_shipment(self, obj):
        ship = getattr(obj, "shipment", None)
        if not ship:
            return None
        return ShipmentSerializer(ship).data


class SellerOrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.EmailField(source="changed_by.email", read_only=True, default=None)

    class Meta:
        model = SellerOrderStatusHistory
        fields = ["id", "status", "note", "changed_by_email", "changed_at"]


class SellerOrderTransitionSerializer(serializers.Serializer):
    """Single serializer for both seller-driven and admin-driven transitions.
    View decides which statuses the actor can choose from."""
    status = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)
    tracking_number = serializers.CharField(required=False, allow_blank=True)
    courier_name = serializers.CharField(required=False, allow_blank=True)
    pickup_date = serializers.DateField(required=False, allow_null=True)
    shipped_date = serializers.DateField(required=False, allow_null=True)
    delivery_date = serializers.DateField(required=False, allow_null=True)


class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = [
            "id", "tracking_number", "courier", "status",
            "pickup_date", "shipped_date", "delivery_date", "notes",
            "created_at", "updated_at",
        ]


# ──────────────────────────────────────────────────────────────────────────
# Storefront / public endpoints
# ──────────────────────────────────────────────────────────────────────────

class StorefrontSerializer(serializers.ModelSerializer):
    """Public-facing storefront view."""
    product_count = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id", "store_name", "store_slug", "store_logo", "store_banner",
            "description", "country", "city", "district",
            "average_rating", "review_count", "followers_count",
            "product_count", "email",
        ]


# ──────────────────────────────────────────────────────────────────────────
# Admin marketplace
# ──────────────────────────────────────────────────────────────────────────

class AdminSellerListSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    product_count = serializers.IntegerField(read_only=True)
    seller_order_count = serializers.IntegerField(read_only=True)
    total_sales = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id", "store_name", "store_slug", "store_logo",
            "status", "applied_at", "approved_at",
            "email", "full_name", "phone",
            "product_count", "seller_order_count", "total_sales",
            "city", "district",
        ]
