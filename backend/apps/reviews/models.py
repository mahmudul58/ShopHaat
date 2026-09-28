from django.conf import settings
from django.db import models
from django.db.models import Q


class Review(models.Model):
    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    )

    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    order_item = models.ForeignKey("orders.OrderItem", on_delete=models.PROTECT, related_name="review")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    
    seller_rating = models.PositiveSmallIntegerField(blank=True, null=True)
    seller_comment = models.TextField(blank=True)
    
    delivery_rating = models.PositiveSmallIntegerField(blank=True, null=True)
    delivery_comment = models.TextField(blank=True)
    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "user"], name="uniq_review_per_user_product"),
            models.CheckConstraint(check=Q(rating__gte=1) & Q(rating__lte=5), name="review_rating_range"),  # type: ignore
            models.CheckConstraint(check=Q(seller_rating__isnull=True) | (Q(seller_rating__gte=1) & Q(seller_rating__lte=5)), name="seller_rating_range"),  # type: ignore
            models.CheckConstraint(check=Q(delivery_rating__isnull=True) | (Q(delivery_rating__gte=1) & Q(delivery_rating__lte=5)), name="delivery_rating_range"),  # type: ignore
        ]

    def __str__(self):
        return f"{self.product.name} - {self.rating}* by {self.user.email}"


def recompute_product_rating(product):
    """Recomputes the denormalized average_rating/review_count on Product
    from APPROVED reviews only. Call this after a review is approved,
    rejected, or deleted."""
    approved = product.reviews.filter(status="APPROVED")
    count = approved.count()
    if count == 0:
        product.average_rating = 0
        product.review_count = 0
    else:
        avg = sum(r.rating for r in approved) / count
        product.average_rating = round(avg, 1)
        product.review_count = count
    product.save(update_fields=["average_rating", "review_count"])
