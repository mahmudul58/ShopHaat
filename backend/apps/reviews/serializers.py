from rest_framework import serializers

from apps.orders.models import OrderItem

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id", "user_name", "rating", "comment", 
            "seller_rating", "seller_comment", 
            "delivery_rating", "delivery_comment", 
            "status", "created_at"
        ]
        read_only_fields = ["id", "user_name", "status", "created_at"]


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            "id", "rating", "comment", 
            "seller_rating", "seller_comment", 
            "delivery_rating", "delivery_comment"
        ]

    def validate(self, attrs):
        user = self.context["request"].user
        product = self.context["product"]

        if Review.objects.filter(product=product, user=user).exists():
            raise serializers.ValidationError("You have already reviewed this product.")

        verified_item = (
            OrderItem.objects.filter(
                order__user=user,
                order__status="DELIVERED",
                variant__product=product,
            )
            .order_by("-order__placed_at")
            .first()
        )
        if verified_item is None:
            raise serializers.ValidationError(
                "You can only review products from a delivered order."
            )
        attrs["order_item"] = verified_item
        attrs["product"] = product
        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        return Review.objects.create(**validated_data)


class AdminReviewModerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "product", "user", "rating", "comment", "status", "created_at"]
        read_only_fields = ["id", "product", "user", "rating", "comment", "created_at"]
        # `status` is intentionally the only writable field — this endpoint
        # is for moderation (approve/reject), not editing review content.
