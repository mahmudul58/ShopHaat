from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.coupons.services import validate_and_price_coupon

from .models import Cart, CartItem
from .serializers import ApplyCouponSerializer, CartItemSerializer, CartSerializer


def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartDetailView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_or_create_cart(self.request.user)


class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["post", "patch", "delete"]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)

    def perform_create(self, serializer):
        cart = get_or_create_cart(self.request.user)
        variant = serializer.validated_data["variant"]
        existing = CartItem.objects.filter(cart=cart, variant=variant).first()
        if existing:
            new_quantity = existing.quantity + serializer.validated_data["quantity"]
            if new_quantity > variant.stock:
                from rest_framework.exceptions import ValidationError

                raise ValidationError({"quantity": f"Only {variant.stock} left in stock for this variant."})
            existing.quantity = new_quantity
            existing.save(update_fields=["quantity"])
            serializer.instance = existing
        else:
            serializer.save(cart=cart)


class ApplyCouponView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ApplyCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = get_or_create_cart(request.user)
        subtotal = sum((item.line_total for item in cart.items.all()), start=0)

        coupon, discount = validate_and_price_coupon(serializer.validated_data["code"], request.user, subtotal)

        return Response(
            {
                "code": coupon.code,
                "subtotal": subtotal,
                "discount_amount": discount,
                "total_after_discount": subtotal - discount,
            },
            status=status.HTTP_200_OK,
        )
