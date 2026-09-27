from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ApplyCouponView, CartDetailView, CartItemViewSet

router = DefaultRouter()
router.register("items", CartItemViewSet, basename="cart-item")

urlpatterns = [
    path("", CartDetailView.as_view(), name="cart-detail"),
    path("apply-coupon/", ApplyCouponView.as_view(), name="cart-apply-coupon"),
] + router.urls
