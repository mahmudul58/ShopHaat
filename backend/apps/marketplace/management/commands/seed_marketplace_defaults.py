"""Create the platform-owned "Official Storefront" seller used as the
default owner for legacy products created before multi-vendor was added.
Safe to run multiple times."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.marketplace.models import MarketplaceCommission, SellerProfile


User = get_user_model()


class Command(BaseCommand):
    help = "Seed a platform-owned seller profile and default global commission rate."

    def handle(self, *args, **options):
        with transaction.atomic():
            user, _ = User.objects.get_or_create(
                email="marketplace-platform@shophaat.local",
                defaults={
                    "full_name": "ShopHaat Marketplace",
                    "role": "admin",
                    "is_staff": True,
                    "is_active": True,
                },
            )
            seller, created = SellerProfile.objects.get_or_create(
                store_slug="shophaat-official",
                defaults={
                    "user": user,
                    "store_name": "ShopHaat Official",
                    "description": "The ShopHaat platform-owned storefront. Houses legacy products migrated from the single-seller catalog.",
                    "business_name": "ShopHaat Marketplace Limited",
                    "country": "Bangladesh",
                    "status": SellerProfile.STATUS_APPROVED,
                    "approved_at": user.last_login,
                    "address_line1": "Banani",
                    "city": "Dhaka",
                    "district": "Dhaka",
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created platform seller: {seller.store_name}"))

            commission, c_created = MarketplaceCommission.objects.get_or_create(
                scope=MarketplaceCommission.SCOPE_GLOBAL,
                category__isnull=True,
                seller__isnull=True,
                defaults={"rate_percent": Decimal("10.00"), "is_active": True},
            )
            if c_created:
                self.stdout.write(self.style.SUCCESS(f"Created global commission: {commission.rate_percent}%"))
