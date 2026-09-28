from rest_framework import serializers

from .models import Brand, Category, FlashSale, FlashSaleItem, Product, ProductImage, ProductVariant, SubCategory


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ["id", "name", "slug"]


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "image", "is_active", "subcategories"]


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo", "categories"]


class ProductVariantSerializer(serializers.ModelSerializer):
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "size", "color", "price_override", "effective_price", "stock"]


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    image = serializers.ImageField(write_only=True, required=False)
    image_url = serializers.URLField(required=False, allow_blank=False)

    class Meta:
        model = ProductImage
        fields = ["id", "url", "image", "image_url", "variant", "sort_order", "is_primary"]

    def get_url(self, obj):
        if obj.image:
            return obj.image.url
        return obj.image_url

    def validate(self, attrs):
        # XOR: exactly one of image / image_url must be present.
        # Closes BUG-CAT-001 — the model.clean() XOR was never invoked
        # from perform_create, so empty payloads silently created rows.
        has_image = bool(attrs.get("image"))
        has_url = bool(attrs.get("image_url"))
        if not has_image and not has_url:
            raise serializers.ValidationError(
                {"image": "Provide either an uploaded image or an image_url."}
            )
        if has_image and has_url:
            raise serializers.ValidationError(
                {"image": "Provide either an uploaded image or an image_url, not both."}
            )
        return attrs


class SellerSummarySerializer(serializers.Serializer):
    """Embedded seller card on product pages — name, slug, logo, rating."""
    id = serializers.IntegerField()
    store_name = serializers.CharField()
    store_slug = serializers.CharField()
    store_logo = serializers.CharField(allow_null=True)
    average_rating = serializers.FloatField()
    review_count = serializers.IntegerField()
    followers_count = serializers.IntegerField()


class ProductListSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    thumbnail = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()
    default_variant_id = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "brand", "base_price", "min_price",
            "average_rating", "review_count", "thumbnail", "in_stock",
            "total_stock", "seller", "status", "discount_percent",
            "default_variant_id",
        ]

    # The four SerializerMethodFields below each iterate `obj.variants.all()`
    # which (thanks to the view's `Prefetch`) is in-memory, but iterating
    # 3-4 times per row on a 20-row page is wasteful. We materialize the
    # variant list once per row via `_variants()` and reuse it.
    def _variants(self, obj):
        try:
            return obj._prefetched_objects_cache["variants"]
        except (AttributeError, KeyError):
            return list(obj.variants.all())

    def _images(self, obj):
        try:
            return obj._prefetched_objects_cache["images"]
        except (AttributeError, KeyError):
            return list(obj.images.all())

    def get_default_variant_id(self, obj):
        variants = self._variants(obj)
        return variants[0].id if variants else None

    def get_thumbnail(self, obj):
        images = self._images(obj)
        primary = next((i for i in images if i.is_primary), None) or (images[0] if images else None)
        if primary:
            if primary.image:
                return primary.image.url
            return primary.image_url
        return None

    def get_min_price(self, obj):
        variants = self._variants(obj)
        prices = [
            (v.price_override if v.price_override is not None else obj.base_price)
            for v in variants
        ]
        return min(prices) if prices else obj.base_price

    def get_in_stock(self, obj):
        return any(v.stock > 0 for v in self._variants(obj))

    def get_total_stock(self, obj):
        return sum(v.stock for v in self._variants(obj))

    def get_seller(self, obj):
        if not obj.seller:
            return None
        s = obj.seller
        logo = s.store_logo.url if s.store_logo else None
        return {
            "id": s.id,
            "store_name": s.store_name,
            "store_slug": s.store_slug,
            "store_logo": logo,
            "average_rating": float(s.average_rating),
            "review_count": s.review_count,
            "followers_count": s.followers_count,
        }


class ProductDetailSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    subcategory = SubCategorySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    seller = serializers.SerializerMethodField()
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    sku = serializers.CharField(read_only=True)
    short_description = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "short_description",
            "subcategory", "brand", "seller",
            "base_price", "discount_percent", "sku",
            "average_rating", "review_count", "is_active", "status",
            "variants", "images",
        ]

    def get_seller(self, obj):
        if not obj.seller:
            return None
        s = obj.seller
        request = self.context.get("request")
        logo = None
        if s.store_logo:
            logo = s.store_logo.url
        return {
            "id": s.id,
            "store_name": s.store_name,
            "store_slug": s.store_slug,
            "store_logo": logo,
            "average_rating": float(s.average_rating),
            "review_count": s.review_count,
            "followers_count": s.followers_count,
            "description": s.description,
            "status": s.status,
        }


class ProductWriteSerializer(serializers.ModelSerializer):
    """Used by staff/admin & approved sellers. Variants/images are managed
    via their own nested endpoints to keep this serializer simple and
    avoid ambiguous partial-update semantics on nested lists."""

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "short_description",
            "subcategory", "brand", "base_price", "discount_percent", "sku",
            "is_active", "status", "rejection_reason",
        ]
        read_only_fields = ["rejection_reason"]


class FlashSaleItemSerializer(serializers.ModelSerializer):
    product_details = ProductListSerializer(source="product", read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True
    )

    class Meta:
        model = FlashSaleItem
        fields = ["id", "product_id", "product_details", "discount_percentage"]


class FlashSaleSerializer(serializers.ModelSerializer):
    items = FlashSaleItemSerializer(many=True, read_only=True)

    class Meta:
        model = FlashSale
        fields = ["id", "name", "start_time", "end_time", "is_active", "created_at", "updated_at", "items"]

