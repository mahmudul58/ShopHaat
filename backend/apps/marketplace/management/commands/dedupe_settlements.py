"""
Collapse duplicate SellerSettlement rows that share the same
(seller, period_start, period_end). Kept the lowest-id settlement as
the canonical row; re-link every SellerOrder that was attached to any
of the duplicates onto the keeper; delete the duplicates.

Run this once after upgrading from a version that didn't filter
`settlements__isnull=True` on the generate endpoint. Idempotent.

Usage:
    python manage.py dedupe_settlements           # dedupe everything
    python manage.py dedupe_settlements --dry-run # show what would happen
"""
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.marketplace.models import SellerSettlement


class Command(BaseCommand):
    help = "Merge duplicate SellerSettlement rows that share the same (seller, period)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing anything.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry = options["dry_run"]
        groups = defaultdict(list)
        for s in SellerSettlement.objects.all().order_by("id"):
            groups[(s.seller_id, s.period_start, s.period_end)].append(s)

        total_deleted = 0
        total_relinked = 0
        sid = transaction.savepoint() if dry else None

        for key, items in groups.items():
            if len(items) <= 1:
                continue
            keeper = items[0]
            duplicates = items[1:]
            order_ids = set()
            for d in duplicates:
                order_ids.update(d.seller_orders.values_list("id", flat=True))
                if not dry:
                    d.seller_orders.clear()
            if order_ids and not dry:
                keeper.seller_orders.add(*order_ids)
            if not dry:
                SellerSettlement.objects.filter(
                    pk__in=[d.pk for d in duplicates]
                ).delete()
            self.stdout.write(
                f"  seller={key[0]} period={key[1]} → {key[2]}: "
                f"keep #{keeper.pk}, drop {len(duplicates)} dup(s), "
                f"re-link {len(order_ids)} order(s)"
            )
            total_deleted += len(duplicates)
            total_relinked += len(order_ids)

        if dry:
            transaction.savepoint_rollback(sid)
            self.stdout.write(self.style.WARNING(
                f"\nDry run: would delete {total_deleted} duplicate settlements "
                f"and re-link {total_relinked} orders across {len(groups)} groups."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"\nDeleted {total_deleted} duplicate settlements; "
                f"re-linked {total_relinked} orders. "
                f"Settlements remaining: {SellerSettlement.objects.count()}."
            ))
