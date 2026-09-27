from rest_framework import serializers

from apps.catalog.models import ProductVariant
from apps.catalog.serializers import ProductVariantSerializer

from .models import Cart, CartItem

class CartProductVariantSerializer(ProductVariantSerializer):
    product = serializers.SerializerMethodField()

    class Meta(ProductVariantSerializer.Meta):
        fields = ProductVariantSerializer.Meta.fields + ["product"]

    def get_product(self, obj):
        first_image = obj.product.images.first()
        thumbnail = None
        if first_image:
            if first_image.image:
                request = self.context.get("request")
                url = first_image.image.url
                thumbnail = request.build_absolute_uri(url) if request else url
            else:
                thumbnail = first_image.image_url

        return {
            "name": obj.product.name,
            "base_price": obj.product.base_price,
            "thumbnail": thumbnail,
            "brand": {"name": obj.product.brand.name} if obj.product.brand else None
        }



class CartItemSerializer(serializers.ModelSerializer):
    variant = CartProductVariantSerializer(read_only=True)
    variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(), source="variant", write_only=True
    )
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "variant", "variant_id", "quantity", "line_total"]

    def validate(self, attrs):
        variant = attrs.get("variant") or getattr(self.instance, "variant", None)
        quantity = attrs.get("quantity", getattr(self.instance, "quantity", 1))
        if variant and quantity > variant.stock:
            raise serializers.ValidationError(
                {"quantity": f"Only {variant.stock} left in stock for this variant."}
            )
        return attrs


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "subtotal"]

    def get_subtotal(self, obj):
        return sum((item.line_total for item in obj.items.all()), start=0)


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField()
