from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response

from apps.catalog.models import Product
from apps.core.permissions import IsStaffOrAdmin

from .models import Review, recompute_product_rating
from .serializers import AdminReviewModerationSerializer, ReviewCreateSerializer, ReviewSerializer


class ProductReviewListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        return ReviewCreateSerializer if self.request.method == "POST" else ReviewSerializer

    def get_queryset(self):
        product = get_object_or_404(Product, slug=self.kwargs["product_slug"])
        return Review.objects.filter(product=product, status="APPROVED").order_by("-created_at")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["product"] = get_object_or_404(Product, slug=self.kwargs["product_slug"])
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class AdminReviewViewSet(viewsets.ModelViewSet):
    """Moderation queue for staff/admin: approve/reject pending reviews."""

    queryset = Review.objects.all().order_by("-created_at")
    serializer_class = AdminReviewModerationSerializer
    permission_classes = [IsStaffOrAdmin]
    http_method_names = ["get", "patch", "delete"]

    def perform_update(self, serializer):
        review = serializer.save()
        recompute_product_rating(review.product)

    def perform_destroy(self, instance):
        product = instance.product
        instance.delete()
        recompute_product_rating(product)
