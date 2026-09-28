from decimal import Decimal

from django.db import models
from django.db.models import Q


class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "categories"
        # Default ordering stops DRF's pagination warning
        # ("UnorderedObjectListWarning: Pagination may yield inconsistent
        # results...") and guarantees the navbar list is stable across
        # page reloads.
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class SubCategory(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="subcategories")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "subcategories"
        ordering = ["sort_order", "name"]
        constraints = [models.UniqueConstraint(fields=["category", "name"], name="uniq_subcategory_per_category")]

    def __str__(self):
        return f"{self.category.name} / {self.name}"


class Brand(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)
    logo = models.ImageField(upload_to="brands/", blank=True, null=True)
    categories = models.ManyToManyField(Category, related_name="brands", blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    STATUS_CHOICES = (
        ("DRAFT", "Draft"),
        ("PENDING_REVIEW", "Pending Review"),
        ("ACTIVE", "Active"),
        ("REJECTED", "Rejected"),
        ("INACTIVE", "Inactive"),
    )

    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=280, unique=True)
    description = models.TextField(blank=True)
    subcategory = models.ForeignKey(SubCategory, on_delete=models.PROTECT, related_name="products")
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    # Each marketplace product belongs to a seller. Nullable so the legacy
    # migration can default to the marketplace-owned seller without breaking
    # existing rows.
    seller = models.ForeignKey(
        "marketplace.SellerProfile",
        on_delete=models.PROTECT,
        related_name="products",
        null=True,
        blank=True,
    )
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    average_rating = models.DecimalField(max_digits=2, decimal_places=1, default=Decimal("0.0"))
    review_count = models.PositiveIntegerField(default=0)
    sales_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    # Soft moderation state (Active/Inactive/Draft/Pending/Rejected).
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="ACTIVE", db_index=True)
    rejection_reason = models.CharField(max_length=255, blank=True)
    sku = models.CharField(max_length=64, blank=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    short_description = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["base_price"]),
            models.Index(fields=["average_rating"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["sales_count"]),
        ]
        constraints = [models.CheckConstraint(check=Q(base_price__gte=0), name="product_price_non_negative")]  # type: ignore

    def __str__(self):
        return self.name

    def total_stock(self):
        return sum(v.stock for v in self.variants.all())  # type: ignore


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=64, unique=True)
    size = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    price_override = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "size", "color"], name="uniq_variant_combo"),
            models.CheckConstraint(check=Q(stock__gte=0), name="variant_stock_non_negative"),  # type: ignore
        ]

    @property
    def effective_price(self):
        base = self.price_override if self.price_override is not None else self.product.base_price
        if self.product.discount_percent:
            return base * (1 - (self.product.discount_percent / 100))
        return base

    def __str__(self):
        attrs = ", ".join(filter(None, [self.size, self.color]))
        return f"{self.product.name} ({attrs or self.sku})"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="images", blank=True, null=True
    )
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort_order"]

    def clean(self):
        from django.core.exceptions import ValidationError

        if not self.image and not self.image_url:
            raise ValidationError("Either image or image_url must be provided.")
        if self.image and self.image_url:
            raise ValidationError("You can provide either an uploaded image or an image URL, not both.")


class FlashSale(models.Model):
    name = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name


class FlashSaleItem(models.Model):
    flash_sale = models.ForeignKey(FlashSale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="flash_sale_items")
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    
    class Meta:
        unique_together = ("flash_sale", "product")
        
    def __str__(self):
        return f"{self.product.name} in {self.flash_sale.name}"
