from decimal import Decimal

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.core.exceptions import ConflictError

from .models import Coupon


def validate_and_price_coupon(code: str, user, subtotal: Decimal) -> tuple[Coupon, Decimal]:
    """Validates a coupon code against the given user and cart subtotal and
    returns (coupon, discount_amount). Raises ValidationError (400) for a
    bad/unknown code, or ConflictError (409) when the code is valid in
    principle but its usage limits are already exhausted.

    This does NOT create a CouponRedemption — that only happens once an
    order is actually placed (see apps.orders.services), so a coupon
    "preview" on the cart page never consumes a usage slot.
    """
    try:
        coupon = Coupon.objects.get(code__iexact=code, is_active=True)
    except Coupon.DoesNotExist:
        raise ValidationError({"code": "This coupon code is not valid."})

    now = timezone.now()
    if not (coupon.valid_from <= now <= coupon.valid_to):
        raise ValidationError({"code": "This coupon has expired or is not active yet."})

    if subtotal < coupon.min_order_amount:
        raise ValidationError(
            {"code": f"Order must be at least {coupon.min_order_amount} to use this coupon."}
        )

    if coupon.usage_limit_total is not None:
        total_used = coupon.redemptions.count()
        if total_used >= coupon.usage_limit_total:
            raise ConflictError("This coupon has reached its total usage limit.")

    if coupon.usage_limit_per_user is not None and user is not None and user.is_authenticated:
        user_used = coupon.redemptions.filter(user=user).count()
        if user_used >= coupon.usage_limit_per_user:
            raise ConflictError("You have already used this coupon the maximum number of times.")

    if coupon.discount_type == "PERCENTAGE":
        discount = (subtotal * coupon.discount_value / Decimal("100")).quantize(Decimal("0.01"))
        if coupon.max_discount_amount is not None:
            discount = min(discount, coupon.max_discount_amount)
    else:  # FIXED_AMOUNT
        discount = coupon.discount_value

    # A coupon can never discount more than the order subtotal.
    discount = min(discount, subtotal)
    return coupon, discount
