from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStaffOrAdmin(BasePermission):
    """Allows access to users with role 'staff' or 'admin'."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in ("staff", "admin"))


class IsAdminRole(BasePermission):
    """Allows access only to users with role 'admin'."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "admin")


class IsSeller(BasePermission):
    """Allows access only to authenticated users whose role is 'seller'.
    Does NOT check approval status — pair this with IsApprovedSeller when
    you need to gate against pending/rejected/suspended sellers."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in ("seller", "staff", "admin"))


class IsApprovedSeller(BasePermission):
    """Only approved sellers may pass. Used to gate dashboard pages,
    product create/update, and order-confirmation endpoints."""

    message = "Your seller application is pending approval or has been suspended."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.role in ("seller", "staff", "admin")):
            return False
        # Lazy import to dodge a circular import during app loading.
        from apps.marketplace.models import SellerProfile
        try:
            profile = user.seller_profile
        except SellerProfile.DoesNotExist:
            return False
        return profile.status == SellerProfile.STATUS_APPROVED


class IsActiveSeller(BasePermission):
    """Approved AND not suspended. Used for storefront-visibility and
    customer-facing seller endpoints where suspended sellers should be hidden."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.role in ("seller", "staff", "admin")):
            return False
        from apps.marketplace.models import SellerProfile
        try:
            profile = user.seller_profile
        except SellerProfile.DoesNotExist:
            return False
        return profile.status == SellerProfile.STATUS_APPROVED


class IsOwnerOrStaff(BasePermission):
    """Object-level permission: the owning customer, or staff/admin, may access."""

    owner_field = "user"

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_authenticated and user.role in ("staff", "admin"):
            return True
        owner = getattr(obj, self.owner_field, None)
        return owner is not None and owner == user


class ReadOnlyOrStaff(BasePermission):
    """Public read access; write access restricted to staff/admin. Used on
    catalog endpoints (categories, brands, products) where browsing is
    public but management is not."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.role in ("staff", "admin"))
