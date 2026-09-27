from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from .views import (
    BrandViewSet,
    CategoryViewSet,
    ProductImageViewSet,
    ProductVariantViewSet,
    ProductViewSet,
    SubCategoryViewSet,
    FlashSaleViewSet,
    FlashSaleItemViewSet,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("subcategories", SubCategoryViewSet, basename="subcategory")
router.register("brands", BrandViewSet, basename="brand")
router.register("products", ProductViewSet, basename="product")

# lookup="product" + the parent ProductViewSet's lookup_field="slug" makes
# drf-nested-routers generate the child kwarg as "product_slug".
products_router = NestedDefaultRouter(router, "products", lookup="product")
products_router.register("variants", ProductVariantViewSet, basename="product-variants")
products_router.register("images", ProductImageViewSet, basename="product-images")

router.register("flash-sales", FlashSaleViewSet, basename="flash-sale")
flash_sales_router = NestedDefaultRouter(router, "flash-sales", lookup="flash_sale")
flash_sales_router.register("items", FlashSaleItemViewSet, basename="flash-sale-items")

urlpatterns = router.urls + products_router.urls + flash_sales_router.urls
