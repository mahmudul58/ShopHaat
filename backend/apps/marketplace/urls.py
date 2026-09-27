from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views


# Public router — used for storefront pagination, etc.
public_router = DefaultRouter()

admin_router = DefaultRouter()
admin_router.register("commissions", views.MarketplaceCommissionViewSet, basename="admin-commission")
admin_router.register("shipments", views.AdminShipmentViewSet, basename="admin-shipment")

seller_router = DefaultRouter()
seller_router.register("orders", views.SellerOrderViewSet, basename="seller-order")

notification_router = DefaultRouter()
notification_router.register("notifications", views.NotificationViewSet, basename="notification")


urlpatterns = [
    # --- Seller registration & self-service ---
    path("seller/register/", views.SellerRegisterView.as_view(), name="seller-register"),
    path("seller/me/", views.MySellerStatusView.as_view(), name="seller-me"),
    path("seller/profile/", views.MySellerProfileView.as_view(), name="seller-profile"),
    path("seller/dashboard/", views.SellerDashboardView.as_view(), name="seller-dashboard"),
    path("seller/dashboard/charts/", views.SellerDashboardChartsView.as_view(), name="seller-dashboard-charts"),
    path("seller/earnings/", views.SellerEarningsView.as_view(), name="seller-earnings"),
    path("seller/settlements/", views.SellerSettlementListView.as_view(), name="seller-settlements"),

    # --- Seller order & product management ---
    path("seller/", include(seller_router.urls)),

    # --- Notifications ---
    path("", include(notification_router.urls)),

    # --- Admin seller management ---
    path("admin/sellers/", views.AdminSellerListView.as_view(), name="admin-seller-list"),
    path("admin/sellers/<int:pk>/", views.AdminSellerDetailView.as_view(), name="admin-seller-detail"),
    path("admin/sellers/<int:pk>/status/", views.AdminSellerStatusUpdateView.as_view(), name="admin-seller-status"),
    path("admin/sellers/<int:pk>/products/", views.AdminSellerProductsView.as_view(), name="admin-seller-products"),
    path("admin/sellers/<int:pk>/orders/", views.AdminSellerOrdersView.as_view(), name="admin-seller-orders"),
    path("admin/dashboard/", views.AdminMarketplaceDashboardView.as_view(), name="admin-marketplace-dashboard"),
    path("admin/settings/", views.PlatformSettingsView.as_view(), name="admin-platform-settings"),
    path("admin/", include(admin_router.urls)),

    # --- Admin seller-order / shipment management ---
    path("admin/seller-orders/", views.AdminSellerOrderListView.as_view(), name="admin-seller-orders-list"),
    path("admin/seller-orders/<int:pk>/", views.AdminSellerOrderDetailView.as_view(), name="admin-seller-order-detail"),
    path("admin/seller-orders/<int:pk>/transition/", views.AdminSellerOrderTransitionView.as_view(), name="admin-seller-order-transition"),

    # --- Settlements ---
    path("admin/settlements/", views.AdminSettlementListView.as_view(), name="admin-settlement-list"),
    path("admin/settlements/eligible/", views.AdminSettlementEligibilityView.as_view(), name="admin-settlement-eligible"),
    path("admin/settlements/<int:pk>/", views.AdminSettlementUpdateView.as_view(), name="admin-settlement-update"),
    path("admin/settlements/generate/", views.AdminGenerateSettlementsView.as_view(), name="admin-settlement-generate"),

    # --- Public storefront ---
    path("stores/<slug:store_slug>/", views.StorefrontDetailView.as_view(), name="storefront-detail"),
    path("stores/<slug:store_slug>/products/", views.StorefrontProductsView.as_view(), name="storefront-products"),
]
