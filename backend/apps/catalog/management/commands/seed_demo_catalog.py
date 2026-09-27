"""
Wipe & reseed the catalog with demo categories, brands and products.

Inspired by the typical verticals sold on South Asian e-commerce sites
(e.g. cartup.com, daraz.com.bd, othoba.com). Pricing is in BDT.

Usage:
    python manage.py seed_demo_catalog           # reseed (additive; skips existing slugs)
    python manage.py seed_demo_catalog --reset   # wipe ALL existing catalog rows, then reseed

Note: deleting a Product cascades to ProductVariant, ProductImage, CartItem,
WishlistItem, and Review. Order history is preserved (OrderItem.variant is
SET_NULL, OrderItem snapshots survive).
"""

import os
from decimal import Decimal
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from PIL import Image, ImageDraw, ImageFont

from apps.catalog.models import (
    Brand,
    Category,
    Product,
    ProductImage,
    ProductVariant,
    SubCategory,
)


# --------------------------------------------------------------------------- #
# Demo dataset
# --------------------------------------------------------------------------- #

CATEGORIES = [
    ("Electronics & Gadgets", ["Smartphones", "Laptops & Accessories"]),
    ("Fashion & Apparel", ["Men's Wear", "Women's Wear"]),
    ("Footwear", ["Men's Shoes", "Women's Shoes"]),
    ("Beauty & Personal Care", ["Skincare", "Makeup"]),
    ("Home & Kitchen", ["Cookware", "Bedding"]),
    ("Furniture & Decor", ["Living Room", "Bedroom"]),
    ("Health & Wellness", ["Vitamins & Supplements", "Fitness Gear"]),
    ("Baby & Kids", ["Toys", "Kids Clothing"]),
    ("Groceries", ["Snacks", "Beverages"]),
    ("Sports & Outdoors", ["Gym Equipment", "Cycling"]),
]

BRANDS = [
    "Samsung", "Apple", "Xiaomi", "Lenovo", "HP",
    "Zara", "H&M", "Bata", "Nestlé", "Decathlon",
]

# (name, category, subcategory, brand, base_price_bdt, [(variant_attr, stock), ...])
PRODUCTS = [
    # Electronics & Gadgets
    ("Galaxy A55 5G Smartphone",        "Electronics & Gadgets", "Smartphones",         "Samsung",  38999, [("128GB Black", 35), ("256GB Blue", 25)],       "#1f2937", "#60a5fa"),
    ("Redmi Note 13 Pro",               "Electronics & Gadgets", "Smartphones",         "Xiaomi",   24999, [("128GB Mint", 40), ("256GB Black", 30)],        "#0f172a", "#f472b6"),
    ("MacBook Air M2 13-inch",          "Electronics & Gadgets", "Laptops & Accessories","Apple",  119000, [("8GB / 256GB", 12)],                              "#e5e7eb", "#111827"),
    ("ThinkPad E14 Gen 5",              "Electronics & Gadgets", "Laptops & Accessories","Lenovo",  78500, [("16GB / 512GB", 18)],                             "#111827", "#dc2626"),
    ("HP Pavilion 15 Laptop",           "Electronics & Gadgets", "Laptops & Accessories","HP",      82000, [("8GB / 512GB", 20)],                              "#0ea5e9", "#0c4a6e"),

    # Fashion & Apparel
    ("Slim Fit Cotton Shirt",           "Fashion & Apparel",     "Men's Wear",          "Zara",      1499, [("M Blue", 50), ("L White", 50)],                   "#1e3a8a", "#dbeafe"),
    ("Classic Chino Pants",             "Fashion & Apparel",     "Men's Wear",          "H&M",       1899, [("32 Khaki", 40), ("34 Navy", 40)],                 "#a16207", "#fef3c7"),
    ("Floral Midi Dress",               "Fashion & Apparel",     "Women's Wear",        "Zara",      2299, [("S Floral", 30), ("M Floral", 30)],               "#f9a8d4", "#831843"),
    ("Oversized Knit Sweater",          "Fashion & Apparel",     "Women's Wear",        "H&M",       1799, [("M Cream", 35), ("L Beige", 35)],                  "#fef3c7", "#92400e"),

    # Footwear
    ("Leather Derby Shoes",             "Footwear",              "Men's Shoes",         "Bata",      3499, [("42 Brown", 25), ("43 Brown", 25)],                "#78350f", "#fde68a"),
    ("Canvas Sneakers",                 "Footwear",              "Men's Shoes",         "Bata",      1999, [("42 White", 40), ("43 White", 40)],                "#f3f4f6", "#1f2937"),
    ("Ballet Flats",                    "Footwear",              "Women's Shoes",       "Bata",      2299, [("37 Nude", 30), ("38 Black", 30)],                 "#fed7aa", "#7c2d12"),

    # Beauty & Personal Care
    ("Vitamin C Brightening Serum",     "Beauty & Personal Care","Skincare",           "H&M",       1290, [("30ml", 60)],                                      "#fb923c", "#fff7ed"),
    ("Hyaluronic Acid Moisturizer",    "Beauty & Personal Care","Skincare",           "H&M",        990, [("50ml", 80)],                                      "#bae6fd", "#0c4a6e"),
    ("Matte Lipstick Set",              "Beauty & Personal Care","Makeup",             "Zara",       850, [("Nude Pack", 45)],                                 "#be185d", "#fce7f3"),

    # Home & Kitchen
    ("Non-Stick Fry Pan 10\"",          "Home & Kitchen",        "Cookware",           "Nestlé",    1490, [("Standard", 70)],                                  "#1f2937", "#9ca3af"),
    ("Pressure Cooker 5L",              "Home & Kitchen",        "Cookware",           "Nestlé",    3490, [("5L", 40)],                                        "#b91c1c", "#fef2f2"),
    ("Cotton Bedsheet Set Queen",       "Home & Kitchen",        "Bedding",            "H&M",       2599, [("Queen", 30)],                                     "#e0e7ff", "#3730a3"),

    # Furniture & Decor
    ("3-Seater Fabric Sofa",            "Furniture & Decor",     "Living Room",        "Decathlon", 34999, [("Grey", 8)],                                       "#6b7280", "#1f2937"),
    ("Solid Wood Coffee Table",         "Furniture & Decor",     "Living Room",        "Decathlon", 12999, [("Walnut", 12)],                                    "#78350f", "#fef3c7"),
    ("Memory Foam Pillow",              "Furniture & Decor",     "Bedroom",            "Decathlon",  1990, [("Standard", 60)],                                  "#f5f5f4", "#a8a29e"),

    # Health & Wellness
    ("Multivitamin Daily Pack (30)",    "Health & Wellness",     "Vitamins & Supplements","Nestlé",  690, [("30 tabs", 100)],                                  "#fde047", "#854d0e"),
    ("Whey Protein 1kg Chocolate",      "Health & Wellness",     "Fitness Gear",       "Decathlon", 2890, [("1kg", 40)],                                       "#7c2d12", "#fef3c7"),

    # Baby & Kids
    ("Plush Teddy Bear",                "Baby & Kids",           "Toys",               "H&M",        590, [("30cm", 75)],                                      "#fcd34d", "#92400e"),
    ("Building Blocks Set (120 pcs)",   "Baby & Kids",           "Toys",               "Decathlon", 1290, [("Standard", 50)],                                  "#ef4444", "#fef2f2"),
    ("Kids Cotton T-Shirt",             "Baby & Kids",           "Kids Clothing",      "H&M",        499, [("4Y Blue", 80), ("6Y Pink", 80)],                  "#f472b6", "#831843"),

    # Groceries
    ("Premium Cashew Nuts 500g",        "Groceries",             "Snacks",             "Nestlé",     890, [("500g", 90)],                                       "#fde68a", "#92400e"),
    ("Green Tea Bags (50)",             "Groceries",             "Beverages",          "Nestlé",     350, [("50 bags", 120)],                                   "#16a34a", "#f0fdf4"),

    # Sports & Outdoors
    ("Adjustable Dumbbell Pair 20kg",   "Sports & Outdoors",     "Gym Equipment",      "Decathlon",  6490, [("20kg", 15)],                                       "#1f2937", "#fbbf24"),
    ("Yoga Mat 6mm",                    "Sports & Outdoors",     "Gym Equipment",      "Decathlon",  1290, [("Purple", 40), ("Black", 40)],                       "#7c3aed", "#f5f3ff"),
    ("Adult Mountain Bike 26\"",        "Sports & Outdoors",     "Cycling",            "Decathlon", 18990, [("26-inch", 10)],                                    "#0f766e", "#ccfbf1"),
]


# --------------------------------------------------------------------------- #
# Local image generation
# --------------------------------------------------------------------------- #

def _generate_product_image(name: str, brand: str, bg_hex: str, fg_hex: str) -> bytes:
    """Build a 600x400 product card PNG in memory using Pillow."""
    W, H = 600, 400
    img = Image.new("RGB", (W, H), bg_hex)
    draw = ImageDraw.Draw(img)

    # Subtle diagonal stripe overlay (decorative)
    overlay = Image.new("RGB", (W, H), fg_hex)
    mask = Image.new("L", (W, H), 0)
    mdraw = ImageDraw.Draw(mask)
    for i in range(-H, W, 20):
        mdraw.line([(i, 0), (i + H, H)], fill=40, width=12)
    img = Image.composite(overlay, img, mask)

    draw = ImageDraw.Draw(img)

    # Brand pill
    try:
        font_brand = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
        font_name = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
    except OSError:
        font_brand = ImageFont.load_default()
        font_name = ImageFont.load_default()

    # Brand chip top-left
    chip_w, chip_h = 24 + len(brand) * 11, 36
    draw.rounded_rectangle([(24, 24), (24 + chip_w, 24 + chip_h)],
                           radius=8, fill=fg_hex)
    draw.text((36, 30), brand[:14], fill=bg_hex, font=font_brand)

    # Decorative circle top-right
    draw.ellipse([(W - 140, -60), (W + 20, 100)], fill=fg_hex)

    # Product name — wrap to 2 lines max
    words = name.split()
    line1, line2 = "", ""
    for w in words:
        candidate = (line1 + " " + w).strip()
        if draw.textlength(candidate, font=font_name) <= (W - 48):
            line1 = candidate
        else:
            line2 = (line2 + " " + w).strip() if line2 else w
    draw.text((24, H - 110), line1, fill=fg_hex, font=font_name)
    if line2:
        draw.text((24, H - 70), line2, fill=fg_hex, font=font_name)

    # Footer bar
    draw.rectangle([(0, H - 10), (W, H)], fill=fg_hex)

    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _save_product_image(product, name, brand, bg_hex, fg_hex):
    """Write a generated PNG into MEDIA_ROOT/products/<slug>.png and attach
    it to a ProductImage. Replaces any existing image_url."""
    payload = _generate_product_image(name, brand, bg_hex, fg_hex)
    rel_path = f"products/{product.slug}.png"
    abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, "wb") as f:
        f.write(payload)

    # Remove the row that used image_url (if any).
    ProductImage.objects.filter(product=product).delete()
    return ProductImage.objects.create(
        product=product,
        image=rel_path,         # ImageField stores relative to MEDIA_ROOT
        image_url=None,
        sort_order=0,
    )


class Command(BaseCommand):
    help = "Wipe (optional) and reseed the catalog with a fresh demo dataset."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing categories, brands, products, variants and images first.",
        )

    # ------------------------------------------------------------------ #
    # Entry point
    # ------------------------------------------------------------------ #
    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self._wipe()
        self._seed()

    # ------------------------------------------------------------------ #
    # Wipe
    # ------------------------------------------------------------------ #
    def _wipe(self):
        self.stdout.write("Wiping existing catalog data...")
        # Order matters because of PROTECT FKs (Product.subcategory).
        # We delete Product first — its CASCADE handles variants, images,
        # cart items, wishlist items and reviews. Then SubCategory becomes
        # safe to delete, then Category and Brand.
        def _count(label, result):
            count, by_model = result
            self.stdout.write(f"  - {label}: {by_model.get(label, count)} row(s)")

        _count("catalog.Product", Product.objects.all().delete())
        _count("catalog.SubCategory", SubCategory.objects.all().delete())
        _count("catalog.Category", Category.objects.all().delete())
        _count("catalog.Brand", Brand.objects.all().delete())

    # ------------------------------------------------------------------ #
    # Seed
    # ------------------------------------------------------------------ #
    def _seed(self):
        self.stdout.write("Seeding categories & subcategories...")
        sub_by_path = {}
        for cat_name, subs in CATEGORIES:
            category, _ = Category.objects.get_or_create(
                name=cat_name,
                defaults={"slug": slugify(cat_name), "is_active": True},
            )
            for sub_name in subs:
                sub, _ = SubCategory.objects.get_or_create(
                    category=category,
                    name=sub_name,
                    defaults={"slug": slugify(f"{cat_name}-{sub_name}")},
                )
                sub_by_path[(cat_name, sub_name)] = sub

        self.stdout.write("Seeding brands...")
        brand_by_name = {}
        for brand_name in BRANDS:
            brand, _ = Brand.objects.get_or_create(
                name=brand_name,
                defaults={"slug": slugify(brand_name)},
            )
            brand_by_name[brand_name] = brand

        self.stdout.write("Seeding products, variants & images...")
        products_created = 0
        variants_created = 0
        images_created = 0
        for (name, cat_name, sub_name, brand_name, price_bdt, variants,
             bg_hex, fg_hex) in PRODUCTS:
            slug = slugify(name)
            product, created = Product.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "description": (
                        f"{name} — a curated demo listing for the storefront. "
                        f"Free shipping inside Dhaka, cash on delivery available."
                    ),
                    "subcategory": sub_by_path[(cat_name, sub_name)],
                    "brand": brand_by_name[brand_name],
                    "base_price": Decimal(price_bdt),
                    "is_active": True,
                },
            )
            if created:
                products_created += 1

            for attr, stock in variants:
                # Treat the "attr" string as a size-like descriptor; no color split here.
                sku = slugify(f"{name}-{attr}")[:60]
                _, v_created = ProductVariant.objects.get_or_create(
                    product=product,
                    size=attr,
                    color=None,
                    defaults={"sku": sku, "stock": stock},
                )
                if v_created:
                    variants_created += 1

            # Generate a real local PNG and attach it as the product image.
            _save_product_image(product, name, brand_name, bg_hex, fg_hex)
            images_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. created products={products_created}, "
                f"variants={variants_created}, images={images_created}. "
                f"Total products in DB: {Product.objects.count()}"
            )
        )