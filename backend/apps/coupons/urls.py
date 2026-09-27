from rest_framework.routers import DefaultRouter

from .views import CouponViewSet

router = DefaultRouter()
router.register("coupons", CouponViewSet, basename="admin-coupon")

urlpatterns = router.urls
