from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
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


def health_check(request):
    """Cheap liveness probe — no DB, no auth. Used by Render's health check
    so a slow query spike can't take the whole instance offline."""
    return JsonResponse({"status": "ok"})


def health_check_db(request):
    """Readiness probe — runs `SELECT 1` against the default DB so we can
    tell "instance slow" from "DB link slow" while debugging on Render.

    We let exceptions bubble out as a 500; Render's health check then
    marks the instance unhealthy until the DB is reachable again."""
    with connection.cursor() as cur:
        cur.execute("SELECT 1")
        cur.fetchone()
    return JsonResponse({"status": "ok", "db": "ok"})


urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/", include(api_v1_patterns)),
    path("api/health/", health_check, name="health-check"),
    # Bare-path variants for Render's "Health Check Path" setting, which
    # accepts a path under the service URL (no /api prefix). The
    # /api/health/ endpoint above is kept for backwards compatibility
    # with anything we already wired up.
    path("health/", health_check, name="health-check-root"),
    path("health/db/", health_check_db, name="health-check-db"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

