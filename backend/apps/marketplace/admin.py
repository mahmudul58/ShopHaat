from django.contrib import admin

from .models import (
    MarketplaceCommission,
    Notification,
    SellerApplicationHistory,
    SellerOrder,
    SellerOrderStatusHistory,
    SellerProfile,
    SellerSettlement,
    Shipment,
)


class SellerApplicationHistoryInline(admin.TabularInline):
    model = SellerApplicationHistory
    extra = 0
    readonly_fields = ["actor", "action", "from_status", "to_status", "reason", "created_at"]
    can_delete = False


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ["store_name", "user", "status", "applied_at", "approved_at", "city"]
    list_filter = ["status", "city", "district"]
    search_fields = ["store_name", "store_slug", "user__email", "user__full_name"]
    readonly_fields = ["applied_at", "approved_at", "updated_at"]
    inlines = [SellerApplicationHistoryInline]


class SellerOrderStatusHistoryInline(admin.TabularInline):
    model = SellerOrderStatusHistory
    extra = 0
    readonly_fields = ["status", "changed_by", "note", "changed_at"]
    can_delete = False


@admin.register(SellerOrder)
class SellerOrderAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "seller", "status", "seller_earning", "settlement_status", "created_at"]
    list_filter = ["status", "settlement_status"]
    search_fields = ["order__order_number", "seller__store_name"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [SellerOrderStatusHistoryInline]


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ["seller_order", "courier", "tracking_number", "status", "shipped_date", "delivery_date"]
    list_filter = ["status", "courier"]
    search_fields = ["tracking_number", "seller_order__order__order_number"]


@admin.register(SellerSettlement)
class SellerSettlementAdmin(admin.ModelAdmin):
    list_display = ["seller", "period_start", "period_end", "gross_amount", "commission_amount", "net_amount", "status"]
    list_filter = ["status"]
    search_fields = ["seller__store_name"]


@admin.register(MarketplaceCommission)
class MarketplaceCommissionAdmin(admin.ModelAdmin):
    list_display = ["scope", "rate_percent", "category", "seller", "is_active"]
    list_filter = ["scope", "is_active"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["recipient", "target_role", "title", "is_read", "created_at"]
    list_filter = ["target_role", "is_read"]
    search_fields = ["title", "body", "recipient__email"]
