from django.contrib import admin

from .models import Order, OrderItem, OrderStatusHistory, PaymentTransaction, ShippingMethod


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = [f.name for f in OrderItem._meta.fields]
    can_delete = False


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ["status", "changed_by", "changed_at", "note"]
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "status", "grand_total", "placed_at"]
    list_filter = ["status", "payment_method"]
    search_fields = ["order_number", "user__email"]
    inlines = [OrderItemInline, OrderStatusHistoryInline]


@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = ["name", "cost", "estimated_days_min", "estimated_days_max", "is_active"]


admin.site.register(PaymentTransaction)
