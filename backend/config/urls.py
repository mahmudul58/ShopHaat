from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.orders.analytics import AdminAnalyticsSummaryView
from apps.reviews.urls import admin_review_urlpatterns, product_review_urlpatterns

api_v1_patterns = [
    path("auth/", include("apps.accounts.urls")),
    # Marketplace routes registered BEFORE catalog so multi-vendor storefront
    # paths (`/stores/...`) don't get swallowed by the catalog router.
    path("", include("apps.marketplace.urls")),
    path("", include("apps.catalog.urls")),
    path("cart/", include("apps.cart.urls")),
    path("", include("apps.orders.urls")),
    path("", include("apps.wishlist.urls")),
    path("products/<slug:product_slug>/reviews/", include(product_review_urlpatterns)),
    path("admin/", include("apps.coupons.urls")),
    path("admin/", include(admin_review_urlpatterns)),
    path("admin/analytics/summary/", AdminAnalyticsSummaryView.as_view(), name="admin-analytics-summary"),
]

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/", include(api_v1_patterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
