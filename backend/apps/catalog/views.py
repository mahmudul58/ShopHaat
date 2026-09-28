from decimal import Decimal

from django.core.cache import cache
from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters, permissions, viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.core.permissions import IsApprovedSeller, IsStaffOrAdmin, ReadOnlyOrStaff
from apps.marketplace.models import SellerProfile, resolve_commission_rate

from .filters import ProductFilter
from .models import Brand, Category, Product, ProductImage, ProductVariant, SubCategory
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductImageSerializer,
    ProductListSerializer,
    ProductVariantSerializer,
    ProductWriteSerializer,
    SubCategorySerializer,
)

# Read-heavy public catalog data (categories, brands, first page of products)
# is cached briefly so the home page and top-nav don't pound the DB on every
# visitor. Cache TTLs are deliberately short — long enough to absorb spikes,
# short enough that staff edits land within a minute.
CATEGORY_LIST_CACHE_TTL = 60   # seconds
BRAND_LIST_CACHE_TTL = 60     # seconds
HOME_PRODUCTS_CACHE_TTL = 30  # seconds
HOME_PRODUCTS_CACHE_KEY = "catalog:home:products:v1"


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "slug"

    def get_queryset(self):
        return Category.objects.filter(is_active=True).prefetch_related("subcategories")

    def list(self, request, *args, **kwargs):
        # Public nav/category list — cached briefly. Staff writes invalidate
        # the key below in perform_* hooks.
        if request.method != "GET":
            return super().list(request, *args, **kwargs)
        cache_key = "catalog:categories:list:v1"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, CATEGORY_LIST_CACHE_TTL)
        return response

    def perform_create(self, serializer):
        serializer.save()
        cache.delete("catalog:categories:list:v1")

    def perform_update(self, serializer):
        serializer.save()
        cache.delete("catalog:categories:list:v1")

    def perform_destroy(self, instance):
        instance.delete()
        cache.delete("catalog:categories:list:v1")


class SubCategoryViewSet(viewsets.ModelViewSet):
    """Admin management for subcategories. Previously only available as
    a nested read on Category; now has its own CRUD endpoint with
    optional `?category=<slug>` filtering so the admin Catalog page can
    populate its SubCategories tab."""
    queryset = SubCategory.objects.select_related("category").all()
    serializer_class = SubCategorySerializer
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "slug"

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.GET.get("category")
        if category:
            qs = qs.filter(category__slug=category)
        return qs

    def perform_create(self, serializer):
        serializer.save()
        cache.delete("catalog:categories:list:v1")

    def perform_update(self, serializer):
        serializer.save()
        cache.delete("catalog:categories:list:v1")

    def perform_destroy(self, instance):
        instance.delete()
        cache.delete("catalog:categories:list:v1")


class BrandViewSet(viewsets.ModelViewSet):
    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = "slug"

    def get_queryset(self):
        qs = Brand.objects.prefetch_related("categories").all()
        category = self.request.GET.get("category")
        if category:
            qs = qs.filter(categories__slug=category).distinct()
        return qs

    def list(self, request, *args, **kwargs):
        if request.method != "GET":
            return super().list(request, *args, **kwargs)
        cache_key = "catalog:brands:list:v1"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, BRAND_LIST_CACHE_TTL)
        return response

    def perform_create(self, serializer):
        serializer.save()
        cache.delete("catalog:brands:list:v1")

    def perform_update(self, serializer):
        serializer.save()
        cache.delete("catalog:brands:list:v1")

    def perform_destroy(self, instance):
        instance.delete()
        cache.delete("catalog:brands:list:v1")


class IsProductOwnerOrStaff(permissions.BasePermission):
    """Object-level permission for ProductViewSet. Read access is granted by
    ReadOnlyOrStaff; write access requires admin/staff or the product's
    owning approved seller."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role in ("staff", "admin"):
            return True
        if user.role == "seller" and hasattr(user, "seller_profile"):
            return obj.seller_id == user.seller_profile.id and user.seller_profile.status == SellerProfile.STATUS_APPROVED
        return False


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "slug"
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ["name", "description", "brand__name"]
    ordering_fields = ["base_price", "created_at", "average_rating", "sales_count"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = Product.objects.select_related(
            "brand", "subcategory__category", "seller"
        ).prefetch_related(
            Prefetch("variants", queryset=ProductVariant.objects.only(
                "id", "product_id", "sku", "size", "color", "price_override", "stock"
            )),
            "images", "brand__categories"
        )
        if self.action == "list":
            # Defer heavy text fields not used by ProductListSerializer.
            qs = qs.defer("description", "short_description", "rejection_reason")
            user = self.request.user
            seller_filter = self.request.GET.get("seller")
            is_own_store = (
                user.is_authenticated 
                and getattr(user, "role", None) == "seller" 
                and hasattr(user, "seller_profile") 
                and user.seller_profile.store_slug == seller_filter
            )
            is_staff = user.is_authenticated and getattr(user, "role", None) in ("staff", "admin")
            
            if not (is_own_store or is_staff):
                qs = qs.filter(is_active=True, status="ACTIVE")
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductWriteSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny() if self.action == "retrieve" else permissions.AllowAny()]
        # Writes: approved sellers can mutate their own products; staff/admin always.
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        user_role = getattr(user, "role", None)
        sku = serializer.validated_data.get("sku", "")
        if not sku:
            import uuid
            sku = str(uuid.uuid4())[:8].upper()
            serializer.validated_data["sku"] = sku

        if user_role in ("staff", "admin"):
            # Staff/admin products must also be assigned to a seller — fall
            # back to the platform seller if none was provided.
            seller = serializer.validated_data.get("seller") or SellerProfile.objects.filter(
                store_slug="shophaat-official"
            ).first()
            if not seller:
                raise ValidationError({"seller": "A seller must be assigned to the product."})
            serializer.save(seller=seller, sku=sku)
        elif user_role == "seller" and hasattr(user, "seller_profile"):
            profile = user.seller_profile
            if profile.status != SellerProfile.STATUS_APPROVED:
                raise PermissionDenied("Your seller account is not approved.")
            serializer.save(seller=profile, sku=sku)
        else:
            raise PermissionDenied("Only sellers and staff can create products.")

    def perform_update(self, serializer):
        user = self.request.user
        user_role = getattr(user, "role", None)
        if user_role in ("staff", "admin"):
            serializer.save()
        elif user_role == "seller" and hasattr(user, "seller_profile"):
            profile = user.seller_profile
            if profile.status != SellerProfile.STATUS_APPROVED:
                raise PermissionDenied("Your seller account is not approved.")
            if serializer.instance.seller_id != profile.id:
                raise PermissionDenied("You can only edit your own products.")
            serializer.save()
        else:
            raise PermissionDenied("Not allowed.")

    def perform_destroy(self, instance):
        user = self.request.user
        user_role = getattr(user, "role", None)
        if user_role in ("staff", "admin"):
            instance.delete()
            return
        if user_role == "seller" and hasattr(user, "seller_profile"):
            if instance.seller_id != user.seller_profile.id:
                raise PermissionDenied("You can only delete your own products.")
            instance.delete()
            return
        raise PermissionDenied("Not allowed.")


class ProductVariantViewSet(viewsets.ModelViewSet):
    """Nested under a product for staff/admin/seller management:
    /products/{product_slug}/variants/"""

    serializer_class = ProductVariantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProductVariant.objects.filter(product__slug=self.kwargs["product_slug"])

    def _check_ownership(self, product):
        user = self.request.user
        user_role = getattr(user, "role", None)
        if user_role in ("staff", "admin"):
            return
        if user_role == "seller" and hasattr(user, "seller_profile"):
            if product.seller_id != user.seller_profile.id:
                raise PermissionDenied("You can only modify variants of your own products.")
            return
        raise PermissionDenied("Not allowed.")

    def perform_create(self, serializer):
        product = Product.objects.get(slug=self.kwargs["product_slug"])
        self._check_ownership(product)
        serializer.save(product=product)

    def perform_update(self, serializer):
        self._check_ownership(serializer.instance.product)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_ownership(instance.product)
        instance.delete()


class ProductImageViewSet(viewsets.ModelViewSet):
    serializer_class = ProductImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProductImage.objects.filter(product__slug=self.kwargs["product_slug"])

    def _check_ownership(self, product):
        user = self.request.user
        user_role = getattr(user, "role", None)
        if user_role in ("staff", "admin"):
            return
        if user_role == "seller" and hasattr(user, "seller_profile"):
            if product.seller_id != user.seller_profile.id:
                raise PermissionDenied("You can only modify images of your own products.")
            return
        raise PermissionDenied("Not allowed.")

    def perform_create(self, serializer):
        product = Product.objects.get(slug=self.kwargs["product_slug"])
        self._check_ownership(product)
        # If this is the first image, auto-promote to primary.
        if not ProductImage.objects.filter(product=product).exists():
            serializer.validated_data["is_primary"] = True
        serializer.save(product=product)

    def perform_update(self, serializer):
        self._check_ownership(serializer.instance.product)
        # If marking this image as primary, clear primary from siblings.
        if serializer.validated_data.get("is_primary"):
            serializer.instance.product.images.exclude(pk=serializer.instance.pk).update(is_primary=False)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_ownership(instance.product)
        was_primary = instance.is_primary
        product = instance.product
        instance.delete()
        # Re-promote the next image if we just removed the primary.
        if was_primary:
            next_image = product.images.order_by("sort_order", "id").first()
            if next_image:
                next_image.is_primary = True
                next_image.save(update_fields=["is_primary"])


class FlashSaleViewSet(viewsets.ModelViewSet):
    from .models import FlashSale
    from .serializers import FlashSaleSerializer
    
    queryset = FlashSale.objects.prefetch_related("items__product").all()
    serializer_class = FlashSaleSerializer
    permission_classes = [IsStaffOrAdmin]


class FlashSaleItemViewSet(viewsets.ModelViewSet):
    from .models import FlashSaleItem
    from .serializers import FlashSaleItemSerializer
    
    serializer_class = FlashSaleItemSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        from .models import FlashSaleItem
        return FlashSaleItem.objects.filter(flash_sale_id=self.kwargs["flash_sale_pk"])

    def perform_create(self, serializer):
        from .models import FlashSale
        flash_sale = FlashSale.objects.get(pk=self.kwargs["flash_sale_pk"])
        serializer.save(flash_sale=flash_sale)

