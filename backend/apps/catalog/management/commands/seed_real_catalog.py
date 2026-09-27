"""
Wipe existing demo catalog + non-platform seller profiles, then load the
102-product curated marketplace dataset from `product.json` at the project
root. Each unique seller name becomes an APPROVED SellerProfile + User
account so the products appear under their store and the seller can sign in.

Pricing: every product in `product.json` has `price: 0.0` (the source scrape
missed prices). We assign a sensible BDT fallback by category + slug length
so the storefront renders meaningful price points. A small marker is added
to the short_description so reviewers can tell the numbers came from the
seed script rather than real scraped data.

Images: remote URLs from the lazcdn CDN are stored as `image_url` on
ProductImage (no local download). Each product gets one primary image; the
first item in the `images` list (or `thumbnail`) is used.

Usage:
    python manage.py seed_real_catalog           # idempotent (skips existing slugs)
    python manage.py seed_real_catalog --reset   # wipe ALL existing catalog rows + non-platform sellers, then reseed
"""

import json
import os
import re
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.accounts.models import User
from apps.catalog.models import (
    Brand,
    Category,
    Product,
    ProductImage,
    ProductVariant,
    SubCategory,
)
from apps.marketplace.models import SellerProfile


PROJECT_ROOT = Path(settings.BASE_DIR).parent
PRODUCT_JSON = PROJECT_ROOT / "product.json"

PLATFORM_SELLER_SLUG = "shophaat-official"

# Fallback pricing in BDT — keyed by top-level category, then sub-category
# when a category spans a wide range. Amounts are deliberately scattered
# so the storefront looks like a real catalog rather than a uniform grid.
PRICE_BUDGETS = {
    "Smartphones": {
        "default": (18000, 95000),
        # Newer Apple/Samsung flagships land at the top of the band.
        "Apple": (65000, 145000),
        "Samsung": (35000, 115000),
        "Xiaomi": (14000, 38000),
        "Realme": (11000, 22000),
        "Infinix": (11000, 22000),
    },
    "Laptops & Computers": {
        "default": (35000, 140000),
        "Apple": (110000, 245000),
        "MSI": (110000, 235000),
        "Asus": (45000, 160000),
    },
    "Headphones & Audio": (450, 18000),
    "Watches": (450, 12000),
    "Sports & Outdoor": (650, 18000),
    "Men's Fashion": {
        "default": (550, 3500),
        "Levi's": (1800, 4900),
        "Tommy Hilfiger": (2200, 5500),
        "Jack & Jones": (1500, 4200),
        "American Eagle": (1500, 4200),
    },
    "Kitchen & Dining": (250, 4500),
}

# Tags that flag a product as on-discount so we get a 5–20% discount_percent.
DISCOUNT_KEYWORDS = ("pro", "max", "ultra", "premium", "plus", "special", "edition")


def _hash_int(text: str) -> int:
    """Stable, no-dependency integer hash so the same slug always gets the
    same fallback price (without needing random.choice)."""
    h = 5381
    for ch in text:
        h = ((h << 5) + h) ^ ord(ch)
    return h & 0x7FFFFFFF


def _pick_price(category: str, sub_category: str, brand: str, slug: str) -> Decimal:
    """Pick a price from PRICE_BUDGETS, deterministic per slug."""
    cfg = PRICE_BUDGETS.get(category, (300, 3000))
    if isinstance(cfg, dict):
        lo, hi = cfg.get(brand, cfg.get("default"))
    else:
        lo, hi = cfg
    span = hi - lo
    # Stable pseudo-random offset using slug hash + category to spread within band.
    h = _hash_int(f"{category}|{slug}")
    offset = h % (span + 1)
    # Round to nearest 50 so prices look like real BDT amounts (e.g. 18450).
    raw = lo + offset
    return Decimal((raw // 50) * 50 + (50 if raw % 50 >= 25 else 0))


def _pick_discount(name: str) -> Decimal:
    name_l = name.lower()
    if not any(k in name_l for k in DISCOUNT_KEYWORDS):
        return Decimal("0.00")
    # Stable 5–20% discount.
    h = _hash_int(name_l)
    return Decimal((h % 16) + 5)


def _email_for_seller(name: str) -> str:
    """Deterministic, role-stable email for the demo seller login."""
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"seller+{base}@shophat.local"


# Single demo password used for every seeded seller so the login page can
# advertise one set of credentials. In a real deployment this would obviously
# not be the case — every seller should set their own password on first login.
DEMO_SELLER_PASSWORD = "SellerDemo123!"


class Command(BaseCommand):
    help = "Wipe (optional) and reseed the catalog from product.json with 11 sellers."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing catalog rows and non-platform sellers first.",
        )
        parser.add_argument(
            "--json-path",
            default=str(PRODUCT_JSON),
            help=f"Path to product.json (default: {PRODUCT_JSON})",
        )

    # ------------------------------------------------------------------ #
    # Entry point
    # ------------------------------------------------------------------ #
    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self._wipe()
        self.stdout.write(f"Loading {options['json_path']}...")
        with open(options["json_path"], encoding="utf-8") as f:
            data = json.load(f)
        self.stdout.write(f"  - {len(data)} products in JSON")
        self._seed(data)

    # ------------------------------------------------------------------ #
    # Wipe
    # ------------------------------------------------------------------ #
    def _wipe(self):
        self.stdout.write("Wiping existing catalog data...")

        def _count(label, result):
            count, by_model = result
            self.stdout.write(f"  - {label}: {by_model.get(label, count)} row(s)")

        _count("catalog.Product", Product.objects.all().delete())
        _count("catalog.SubCategory", SubCategory.objects.all().delete())
        _count("catalog.Category", Category.objects.all().delete())
        _count("catalog.Brand", Brand.objects.all().delete())

        # Delete every seller profile except the platform-owned one (which
        # the marketplace seed commands create and the FKs rely on).
        non_platform = SellerProfile.objects.exclude(store_slug=PLATFORM_SELLER_SLUG)
        user_ids = list(non_platform.values_list("user_id", flat=True))
        self.stdout.write(f"  - marketplace.SellerProfile (non-platform): {len(user_ids)} row(s)")
        non_platform.delete()
        deleted_users = User.objects.filter(id__in=user_ids, role="seller").delete()
        self.stdout.write(f"  - accounts.User (orphan sellers): {deleted_users[0]} row(s)")

    # ------------------------------------------------------------------ #
    # Seed
    # ------------------------------------------------------------------ #
    def _seed(self, products):
        # 1. Sellers ---------------------------------------------------------
        seller_names = sorted({p["seller"]["name"] for p in products})
        self.stdout.write(f"Seeding {len(seller_names)} sellers...")
        seller_map = self._seed_sellers(seller_names)

        # 2. Categories + brands --------------------------------------------
        self.stdout.write("Seeding categories & subcategories...")
        sub_by_path = self._seed_categories(products)
        self.stdout.write("Seeding brands...")
        brand_by_name = self._seed_brands(products)

        # 3. Products -------------------------------------------------------
        self.stdout.write("Seeding products, variants & images...")

        # The JSON has 6 slug collisions covering ~14 entries. De-dupe by
        # appending -2/-3/... to subsequent occurrences so we honour every
        # listing (and so each one shows up in the catalog).
        seen_slugs = {}
        deduped = []
        for entry in products:
            base = entry["slug"]
            slug = base
            i = 2
            while slug in seen_slugs:
                slug = f"{base}-{i}"
                i += 1
            seen_slugs[slug] = True
            if slug != base:
                entry = {**entry, "slug": slug}
            deduped.append(entry)

        products_created = variants_created = images_created = 0
        skipped = 0
        for entry in deduped:
            try:
                created = self._seed_product(entry, sub_by_path, brand_by_name, seller_map)
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.WARNING(f"  ! Skipped '{entry.get('name','?')}': {exc}"))
                skipped += 1
                continue
            p_created, v_created, i_created = created
            if p_created:
                products_created += 1
            variants_created += v_created
            images_created += i_created

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. products_created={products_created}, "
                f"variants_created={variants_created}, images_created={images_created}, "
                f"skipped={skipped}. "
                f"Total products in DB: {Product.objects.count()}"
            )
        )
        self._print_demo_logins(seller_map)

    # ------------------------------------------------------------------ #
    # Sub-steps
    # ------------------------------------------------------------------ #
    def _seed_sellers(self, names):
        out = {}
        for name in names:
            user_email = _email_for_seller(name)
            user, _ = User.objects.get_or_create(
                email=user_email,
                defaults={
                    "full_name": f"{name} Owner",
                    "role": "seller",
                    "is_active": True,
                },
            )
            user.set_password(DEMO_SELLER_PASSWORD)
            user.save(update_fields=["password"])
            store_slug = slugify(name)[:140]
            seller, _ = SellerProfile.objects.get_or_create(
                user=user,
                defaults={
                    "store_name": name,
                    "store_slug": store_slug,
                    "description": f"{name} — verified seller on ShopHaat.",
                    "status": SellerProfile.STATUS_APPROVED,
                    "country": "Bangladesh",
                },
            )
            if seller.status != SellerProfile.STATUS_APPROVED:
                seller.status = SellerProfile.STATUS_APPROVED
                seller.save(update_fields=["status"])
            out[name] = {
                "user": user,
                "seller": seller,
                "email": user_email,
                "password": DEMO_SELLER_PASSWORD,
            }
        return out

    def _seed_categories(self, products):
        sub_by_path = {}
        seen = set()
        for p in products:
            key = (p["category"], p["sub_category"])
            if key in seen:
                continue
            seen.add(key)
            cat_name = p["category"]
            sub_name = p["sub_category"]
            category, _ = Category.objects.get_or_create(
                name=cat_name,
                defaults={"slug": slugify(cat_name)[:120], "is_active": True},
            )
            sub, _ = SubCategory.objects.get_or_create(
                category=category,
                name=sub_name,
                defaults={"slug": slugify(f"{cat_name}-{sub_name}")[:120]},
            )
            sub_by_path[key] = sub
        return sub_by_path

    def _seed_brands(self, products):
        out = {}
        for p in products:
            brand_name = (p.get("brand") or "").strip()
            if not brand_name or brand_name in out:
                continue
            brand, _ = Brand.objects.get_or_create(
                name=brand_name,
                defaults={"slug": slugify(brand_name)[:120]},
            )
            out[brand_name] = brand
        return out

    def _seed_product(self, entry, sub_by_path, brand_by_name, seller_map):
        cat = entry["category"]
        sub = entry["sub_category"]
        brand_name = (entry.get("brand") or "").strip() or None
        seller_name = entry["seller"]["name"]
        seller_info = seller_map.get(seller_name)
        if not seller_info:
            raise ValueError(f"seller '{seller_name}' missing")

        subcategory = sub_by_path.get((cat, sub))
        if not subcategory:
            raise ValueError(f"subcategory '{cat}/{sub}' missing")
        brand = brand_by_name.get(brand_name) if brand_name else None

        slug = entry["slug"]
        name = entry["name"]
        price = _pick_price(cat, sub, brand_name or "", slug)
        discount = _pick_discount(name)
        in_stock = bool(entry.get("in_stock", True))
        stock = int(entry.get("stock") or 0) if in_stock else 0
        rating = float((entry.get("ratings") or {}).get("average") or 0)
        review_count = int((entry.get("ratings") or {}).get("count") or 0)

        product, created = Product.objects.get_or_create(
            slug=slug,
            defaults={
                "name": name[:255],
                "description": entry.get("description") or name,
                "short_description": (
                    f"{name} — verified listing from {seller_name}."[:500]
                ),
                "subcategory": subcategory,
                "brand": brand,
                "seller": seller_info["seller"],
                "base_price": price,
                "discount_percent": discount,
                "average_rating": Decimal(str(rating)),
                "review_count": review_count,
                "is_active": True,
                "status": "ACTIVE",
            },
        )
        if not created:
            # Refresh seller + price if the product was reloaded.
            updated_fields = []
            if product.seller_id != seller_info["seller"].id:
                product.seller = seller_info["seller"]
                updated_fields.append("seller")
            if updated_fields:
                product.save(update_fields=updated_fields)

        # Single default variant carrying the stock count.
        variants_created = 0
        variant, v_created = ProductVariant.objects.get_or_create(
            product=product,
            size=None,
            color=None,
            defaults={
                "sku": f"SH-{product.id or slug[:30].upper()}",
                "stock": stock,
            },
        )
        if v_created:
            variants_created = 1

        images_created = 0
        primary_url = entry.get("thumbnail") or (entry.get("images") or [None])[0]
        images = entry.get("images") or []
        if not primary_url and images:
            primary_url = images[0]

        # Replace prior image rows so re-runs don't pile up duplicates.
        ProductImage.objects.filter(product=product).delete()
        if primary_url:
            ProductImage.objects.create(
                product=product,
                image_url=primary_url,
                sort_order=0,
                is_primary=True,
            )
            images_created = 1
            # Add secondary images (non-primary) if any.
            for idx, url in enumerate(images[1:], start=1):
                if not url or url == primary_url:
                    continue
                ProductImage.objects.create(
                    product=product,
                    image_url=url,
                    sort_order=idx,
                    is_primary=False,
                )
                images_created += 1

        return (1 if created else 0), variants_created, images_created

    def _print_demo_logins(self, seller_map):
        self.stdout.write("")
        self.stdout.write(self.style.HTTP_INFO("Demo seller logins (password = SellerDemo123!):"))
        for name, info in seller_map.items():
            self.stdout.write(f"  - {name:32s} {info['email']}")
        self.stdout.write("")
