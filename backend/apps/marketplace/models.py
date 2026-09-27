"""Marketplace models: sellers, stores, applications, commissions,
settlements, notifications, shipments and seller-side order groups.

The marketplace app owns the multi-vendor concepts that don't fit cleanly
into the existing single-vendor apps (accounts, catalog, cart, orders).
Where it makes sense we extend the existing models via FK instead of
duplicating them (e.g. Product.seller, OrderItem.seller_order)."""
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q


# ──────────────────────────────────────────────────────────────────────────
# Sellers / stores
# ──────────────────────────────────────────────────────────────────────────

class SellerProfile(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"
    STATUS_SUSPENDED = "SUSPENDED"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_SUSPENDED, "Suspended"),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_profile",
    )
    store_name = models.CharField(max_length=120, unique=True, db_index=True)
    store_slug = models.SlugField(max_length=140, unique=True, db_index=True)
    store_logo = models.ImageField(upload_to="seller/logos/", blank=True, null=True)
    store_banner = models.ImageField(upload_to="seller/banners/", blank=True, null=True)
    description = models.TextField(blank=True)

    # Business information
    business_name = models.CharField(max_length=150, blank=True)
    business_type = models.CharField(max_length=60, blank=True)
    trade_license_no = models.CharField(max_length=80, blank=True)

    # Address
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="Bangladesh")

    # Payout / settlement
    bank_name = models.CharField(max_length=120, blank=True)
    bank_account_name = models.CharField(max_length=120, blank=True)
    bank_account_number = models.CharField(max_length=80, blank=True)
    mobile_banking_provider = models.CharField(max_length=40, blank=True)
    mobile_banking_number = models.CharField(max_length=40, blank=True)

    # Status workflow
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    rejection_reason = models.CharField(max_length=255, blank=True)
    suspension_reason = models.CharField(max_length=255, blank=True)

    # Per-seller commission override; falls back to MarketplaceCommission
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Denormalized seller rating derived from reviews of the seller's products.
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("0.00"))
    review_count = models.PositiveIntegerField(default=0)
    followers_count = models.PositiveIntegerField(default=0)

    applied_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return self.store_name


class SellerApplicationHistory(models.Model):
    """Audit trail for seller status changes (applied, approved, rejected,
    suspended, reactivated). Useful for admin review and seller dashboard."""
    seller = models.ForeignKey(SellerProfile, on_delete=models.CASCADE, related_name="history")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    action = models.CharField(max_length=40)
    from_status = models.CharField(max_length=12, blank=True)
    to_status = models.CharField(max_length=12, blank=True)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


# ──────────────────────────────────────────────────────────────────────────
# Marketplace configuration
# ──────────────────────────────────────────────────────────────────────────

class MarketplaceCommission(models.Model):
    """Configurable commission rules. The single active "global" record
    applies to every seller unless a per-category or per-seller override
    matches. Lookups go through `resolve_for()` which keeps the rule
    precedence centralized."""
    SCOPE_GLOBAL = "GLOBAL"
    SCOPE_CATEGORY = "CATEGORY"
    SCOPE_SELLER = "SELLER"
    SCOPE_CHOICES = (
        (SCOPE_GLOBAL, "Global"),
        (SCOPE_CATEGORY, "Category"),
        (SCOPE_SELLER, "Seller"),
    )

    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES, default=SCOPE_GLOBAL)
    category = models.ForeignKey(
        "catalog.Category", on_delete=models.CASCADE, null=True, blank=True, related_name="commission_rules"
    )
    seller = models.ForeignKey(
        SellerProfile, on_delete=models.CASCADE, null=True, blank=True, related_name="commission_rules"
    )
    rate_percent = models.DecimalField(max_digits=5, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["scope", "is_active"])]

    def __str__(self):
        return f"{self.scope}: {self.rate_percent}%"


class PlatformSettings(models.Model):
    """Singleton row (pk=1) of platform-wide configuration. Read in the
    hot path (checkout, commission fallback), so keep it lean. Always use
    `PlatformSettings.get_solo()` to read — it materializes the row if
    missing so callers don't have to worry about cold-start."""
    default_commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("10.00"))
    shipping_fee_dhaka = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("70.00"))
    shipping_fee_other = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("120.00"))
    free_shipping_threshold = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency_code = models.CharField(max_length=8, default="BDT")
    currency_symbol = models.CharField(max_length=8, default="৳")
    support_email = models.EmailField(blank=True, null=True)
    support_phone = models.CharField(max_length=40, blank=True)
    payout_minimum = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    site_name = models.CharField(max_length=120, default="ShopHaat")
    site_tagline = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    class Meta:
        verbose_name = "Platform Settings"
        verbose_name_plural = "Platform Settings"

    def save(self, *args, **kwargs):
        # Enforce singleton: every row is pk=1, regardless of caller. This
        # means the admin UI cannot accidentally create a second row even
        # if some caller forgets to call get_solo() first.
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        """Return the singleton row, creating it with defaults if absent.
        Idempotent — safe to call from anywhere, including hot paths."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"PlatformSettings<{self.site_name}>"


# ──────────────────────────────────────────────────────────────────────────
# Notifications
# ──────────────────────────────────────────────────────────────────────────

class Notification(models.Model):
    """Polymorphic-ish notification for sellers/customers. Not user->user.
    `target_role` lets the dashboard pull only relevant notifications."""
    TARGET_SELLER = "seller"
    TARGET_CUSTOMER = "customer"
    TARGET_ADMIN = "admin"
    TARGET_CHOICES = (
        (TARGET_SELLER, "Seller"),
        (TARGET_CUSTOMER, "Customer"),
        (TARGET_ADMIN, "Admin"),
    )

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    target_role = models.CharField(max_length=10, choices=TARGET_CHOICES, db_index=True)
    title = models.CharField(max_length=120)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read"])]


# ──────────────────────────────────────────────────────────────────────────
# Orders — extensions on the existing Order for multi-seller.
# ──────────────────────────────────────────────────────────────────────────

class SellerOrder(models.Model):
    """One SellerOrder per (customer order, seller) combination. Lets each
    seller manage only their own slice of the customer's overall order.
    Statuses are richer than the customer-level Order (e.g. HANDED_OVER)
    because the seller-side lifecycle has more steps."""

    STATUS_PENDING = "PENDING"
    STATUS_CONFIRMED = "CONFIRMED"
    STATUS_PROCESSING = "PROCESSING"
    STATUS_READY_TO_SHIP = "READY_TO_SHIP"
    STATUS_HANDED_OVER = "HANDED_OVER"
    STATUS_RECEIVED = "RECEIVED"
    STATUS_SHIPPED = "SHIPPED"
    STATUS_OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    STATUS_DELIVERED = "DELIVERED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_RETURN_REQUESTED = "RETURN_REQUESTED"
    STATUS_RETURN_APPROVED = "RETURN_APPROVED"
    STATUS_RETURN_REJECTED = "RETURN_REJECTED"
    STATUS_RETURNED = "RETURNED"
    STATUS_REFUNDED = "REFUNDED"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_READY_TO_SHIP, "Ready to Ship"),
        (STATUS_HANDED_OVER, "Handed Over"),
        (STATUS_RECEIVED, "Received by Marketplace"),
        (STATUS_SHIPPED, "Shipped"),
        (STATUS_OUT_FOR_DELIVERY, "Out for Delivery"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_RETURN_REQUESTED, "Return Requested"),
        (STATUS_RETURN_APPROVED, "Return Approved"),
        (STATUS_RETURN_REJECTED, "Return Rejected"),
        (STATUS_RETURNED, "Returned"),
        (STATUS_REFUNDED, "Refunded"),
    )

    # Statuses the customer may self-cancel from.
    CUSTOMER_CANCELLABLE = {STATUS_PENDING, STATUS_CONFIRMED}

    # Statuses the seller (not admin) may set.
    SELLER_DRIVEN_STATUSES = {
        STATUS_CONFIRMED,
        STATUS_PROCESSING,
        STATUS_READY_TO_SHIP,
        STATUS_HANDED_OVER,
        STATUS_CANCELLED,  # only before HANDED_OVER
    }

    # Statuses only the admin / marketplace fulfillment side may set.
    ADMIN_DRIVEN_STATUSES = {
        STATUS_RECEIVED,
        STATUS_SHIPPED,
        STATUS_OUT_FOR_DELIVERY,
        STATUS_DELIVERED,
        STATUS_RETURN_APPROVED,
        STATUS_RETURN_REJECTED,
        STATUS_RETURNED,
        STATUS_REFUNDED,
    }

    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="seller_orders")
    seller = models.ForeignKey(SellerProfile, on_delete=models.PROTECT, related_name="seller_orders")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    shipping_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    seller_earning = models.DecimalField(max_digits=10, decimal_places=2)
    settlement_status = models.CharField(
        max_length=12,
        choices=(
            ("PENDING", "Pending"),
            ("PROCESSING", "Processing"),
            ("PAID", "Paid"),
            ("ON_HOLD", "On Hold"),
        ),
        default="PENDING",
        db_index=True,
    )
    tracking_number = models.CharField(max_length=80, blank=True)
    courier_name = models.CharField(max_length=80, blank=True)
    seller_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["seller", "status"]),
            models.Index(fields=["order", "seller"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["order", "seller"], name="uniq_seller_order_per_order"),
        ]


class SellerSettlement(models.Model):
    """Periodic settlement record per seller — sums up earnings ready to be
    paid out. Settlement is a periodic aggregate; the per-SellerOrder
    `settlement_status` is the atomic flag, while this is the operator view."""
    STATUS_PENDING = "PENDING"
    STATUS_PROCESSING = "PROCESSING"
    STATUS_PAID = "PAID"
    STATUS_ON_HOLD = "ON_HOLD"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_PAID, "Paid"),
        (STATUS_ON_HOLD, "On Hold"),
    )

    seller = models.ForeignKey(SellerProfile, on_delete=models.CASCADE, related_name="settlements")
    period_start = models.DateField()
    period_end = models.DateField()
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    seller_orders = models.ManyToManyField(SellerOrder, related_name="settlements", blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["seller", "status"])]
        ordering = ["-period_end"]


class Shipment(models.Model):
    """A shipment belongs to a SellerOrder (not the customer Order) since
    each seller's portion is fulfilled independently. Supports a manual
    courier integration — the courier fields are plain text so any
    provider can be slotted in later."""
    STATUS_CHOICES = SellerOrder.STATUS_CHOICES

    seller_order = models.OneToOneField(SellerOrder, on_delete=models.CASCADE, related_name="shipment")
    tracking_number = models.CharField(max_length=80, blank=True)
    courier = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=SellerOrder.STATUS_PENDING, db_index=True)
    pickup_date = models.DateField(null=True, blank=True)
    shipped_date = models.DateField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Shipment({self.seller_order.order.order_number} -> {self.seller_order.seller.store_name})"


class SellerOrderStatusHistory(models.Model):
    """Per-seller status timeline. Distinct from the OrderStatusHistory
    model which lives in apps.orders — that one tracks the customer-level
    order, this one tracks each seller's slice."""
    seller_order = models.ForeignKey(SellerOrder, on_delete=models.CASCADE, related_name="status_history")
    status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    note = models.CharField(max_length=255, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["changed_at"]


# ──────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────

def resolve_commission_rate(*, seller: SellerProfile, category=None) -> Decimal:
    """Resolve the commission rate to use for a given (seller, category)
    pair. Precedence: seller-specific override > category-specific > global
    > fallback default (10%).
    """
    if seller.commission_rate is not None:
        return Decimal(seller.commission_rate)
    if category is not None:
        category_rule = MarketplaceCommission.objects.filter(
            scope=MarketplaceCommission.SCOPE_CATEGORY, category=category, is_active=True
        ).first()
        if category_rule:
            return Decimal(category_rule.rate_percent)
    seller_rule = MarketplaceCommission.objects.filter(
        scope=MarketplaceCommission.SCOPE_SELLER, seller=seller, is_active=True
    ).first()
    if seller_rule:
        return Decimal(seller_rule.rate_percent)
    global_rule = MarketplaceCommission.objects.filter(
        scope=MarketplaceCommission.SCOPE_GLOBAL, is_active=True
    ).order_by("-updated_at").first()
    if global_rule:
        return Decimal(global_rule.rate_percent)
    # Last-resort fallback is now driven by the PlatformSettings singleton
    # so admins can change it from the UI without a code change. Defensive
    # try/except so a missing/broken settings row doesn't take down
    # checkout if the DB is briefly unavailable.
    try:
        return Decimal(PlatformSettings.get_solo().default_commission_rate)
    except Exception:
        return Decimal("10.00")
