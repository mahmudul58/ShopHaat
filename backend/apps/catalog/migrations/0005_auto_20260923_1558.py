"""Backfill legacy products with the marketplace-owned seller profile so
existing catalog rows remain visible after the multi-vendor migration.

Uses historical models from `apps.get_model` so the migration can replay
on a fresh database without depending on the live ORM models."""
from decimal import Decimal

from django.db import migrations


def backfill_seller(apps, schema_editor):
    # Historical models — these match the schema at this migration step.
    User = apps.get_model("accounts", "User")
    SellerProfile = apps.get_model("marketplace", "SellerProfile")
    MarketplaceCommission = apps.get_model("marketplace", "MarketplaceCommission")
    Product = apps.get_model("catalog", "Product")

    platform_user, _ = User.objects.get_or_create(
        email="marketplace-platform@shophaat.local",
        defaults={
            "full_name": "ShopHaat Marketplace",
            "role": "admin",
            "is_staff": True,
            "is_active": True,
        },
    )

    seller, _ = SellerProfile.objects.get_or_create(
        store_slug="shophaat-official",
        defaults={
            "user": platform_user,
            "store_name": "ShopHaat Official",
            "description": "Platform-owned storefront for legacy products.",
            "country": "Bangladesh",
            "status": "APPROVED",
            "address_line1": "Banani",
            "city": "Dhaka",
            "district": "Dhaka",
        },
    )

    MarketplaceCommission.objects.get_or_create(
        scope="GLOBAL",
        category=None,
        seller=None,
        defaults={"rate_percent": Decimal("10.00"), "is_active": True},
    )

    # Reassign legacy rows whose seller is NULL to the marketplace seller.
    Product.objects.filter(seller__isnull=True).update(seller=seller)


def noop_reverse(apps, schema_editor):
    # No reverse: seller was added in this migration, so undo isn't meaningful.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("marketplace", "0001_initial"),
        ("catalog", "0004_product_seller_product_short_description_product_sku_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_seller, reverse_code=noop_reverse),
    ]
