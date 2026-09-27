from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import User
from apps.catalog.models import Brand, Category, Product, ProductVariant, SubCategory
from apps.coupons.models import Coupon
from apps.orders.models import ShippingMethod


class Command(BaseCommand):
    help = "Seed the database with demo categories, brands, products, coupons, shipping methods and users."

    def handle(self, *args, **options):
        self.stdout.write("Seeding users...")
        admin, _ = User.objects.get_or_create(
            email="admin@example.com",
            defaults={"full_name": "Site Admin", "role": "admin", "is_staff": True, "is_superuser": True},
        )
        admin.set_password("AdminPass123!")
        admin.save()

        staff, _ = User.objects.get_or_create(
            email="staff@example.com", defaults={"full_name": "Ops Staff", "role": "staff"}
        )
        staff.set_password("StaffPass123!")
        staff.save()

        customer, _ = User.objects.get_or_create(
            email="customer@example.com", defaults={"full_name": "Demo Customer", "role": "customer"}
        )
        customer.set_password("CustomerPass123!")
        customer.save()

        self.stdout.write("Seeding categories/subcategories/brands...")
        categories_spec = {
            "Electronics": ["Smartphones", "Laptops", "Audio"],
            "Fashion": ["Men's Clothing", "Women's Clothing", "Footwear"],
            "Home & Living": ["Furniture", "Kitchen", "Decor"],
        }
        subcategories = {}
        for cat_name, subs in categories_spec.items():
            category, _ = Category.objects.get_or_create(name=cat_name, defaults={"slug": slugify(cat_name)})
            for sub_name in subs:
                sub, _ = SubCategory.objects.get_or_create(
                    category=category, name=sub_name, defaults={"slug": slugify(f"{cat_name}-{sub_name}")}
                )
                subcategories[sub_name] = sub

        brand_names = ["Northline", "Verve", "Studio Forty", "Coastal Co."]
        brands = []
        for name in brand_names:
            brand, _ = Brand.objects.get_or_create(name=name, defaults={"slug": slugify(name)})
            brands.append(brand)

        self.stdout.write("Seeding products & variants...")
        demo_products = [
            ("Aria Wireless Headphones", "Audio", 129.99, [("Black", None), ("White", None)]),
            ("Pulse Smartphone 12", "Smartphones", 699.00, [("128GB", "Black"), ("256GB", "Blue")]),
            ("Nimbus Laptop 14", "Laptops", 1199.00, [("8GB/256GB", "Silver"), ("16GB/512GB", "Space Grey")]),
            ("Everyday Oxford Shirt", "Men's Clothing", 49.99, [("M", "Blue"), ("L", "White")]),
            ("Linen Wrap Dress", "Women's Clothing", 79.99, [("S", "Sand"), ("M", "Olive")]),
            ("Trailrunner Sneakers", "Footwear", 89.99, [("42", "Black"), ("43", "Grey")]),
            ("Oakwood Dining Chair", "Furniture", 159.00, [("Natural", None), ("Walnut", None)]),
            ("Ceramic Pour-Over Set", "Kitchen", 39.00, [("Standard", None)]),
            ("Woven Wall Hanging", "Decor", 34.00, [("Standard", None)]),
        ]

        for i, (name, sub_name, price, variants) in enumerate(demo_products):
            product, _ = Product.objects.get_or_create(
                name=name,
                defaults={
                    "slug": slugify(name),
                    "description": f"A premium {name.lower()} built for everyday use.",
                    "subcategory": subcategories[sub_name],
                    "brand": brands[i % len(brands)],
                    "base_price": price,
                },
            )
            for size, color in variants:
                sku = slugify(f"{name}-{size}-{color or 'na'}")[:60]
                ProductVariant.objects.get_or_create(
                    product=product,
                    size=size,
                    color=color,
                    defaults={"sku": sku, "stock": 50},
                )

        self.stdout.write("Seeding shipping methods...")
        ShippingMethod.objects.get_or_create(
            name="Standard", defaults={"cost": 4.99, "estimated_days_min": 4, "estimated_days_max": 7}
        )
        ShippingMethod.objects.get_or_create(
            name="Express", defaults={"cost": 12.99, "estimated_days_min": 1, "estimated_days_max": 2}
        )

        self.stdout.write("Seeding coupons...")
        now = timezone.now()
        Coupon.objects.get_or_create(
            code="WELCOME10",
            defaults={
                "discount_type": "PERCENTAGE",
                "discount_value": 10,
                "max_discount_amount": 25,
                "min_order_amount": 30,
                "usage_limit_per_user": 1,
                "valid_from": now,
                "valid_to": now + timedelta(days=365),
            },
        )
        Coupon.objects.get_or_create(
            code="FLAT15",
            defaults={
                "discount_type": "FIXED_AMOUNT",
                "discount_value": 15,
                "min_order_amount": 75,
                "valid_from": now,
                "valid_to": now + timedelta(days=90),
            },
        )

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
