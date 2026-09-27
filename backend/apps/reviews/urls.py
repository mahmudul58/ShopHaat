from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AdminReviewViewSet, ProductReviewListCreateView

# Included under /products/<slug>/reviews/ from config/urls.py
product_review_urlpatterns = [
    path("", ProductReviewListCreateView.as_view(), name="product-reviews"),
]

# Included under /admin/ from config/urls.py
admin_router = DefaultRouter()
admin_router.register("reviews", AdminReviewViewSet, basename="admin-review")
admin_review_urlpatterns = admin_router.urls
