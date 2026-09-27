"""Bootstrap the PlatformSettings singleton row.

Idempotent: calls `PlatformSettings.get_solo()` which uses get_or_create,
so it's safe to run repeatedly. Does NOT auto-create a
`MarketplaceCommission(scope=GLOBAL)` row — the singleton's
`default_commission_rate` directly powers the `resolve_commission_rate`
fallback. Admins can still create an explicit global rule from the
Commissions UI if they want the value to appear there too."""
from django.core.management.base import BaseCommand

from apps.marketplace.models import PlatformSettings


class Command(BaseCommand):
    help = "Ensure the PlatformSettings singleton row exists with defaults."

    def handle(self, *args, **options):
        obj = PlatformSettings.get_solo()
        self.stdout.write(self.style.SUCCESS(
            f"PlatformSettings ready: site_name={obj.site_name!r} "
            f"default_commission_rate={obj.default_commission_rate}% "
            f"shipping_fee_dhaka={obj.shipping_fee_dhaka} "
            f"shipping_fee_other={obj.shipping_fee_other}"
        ))
