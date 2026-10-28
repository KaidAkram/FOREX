from rest_framework.permissions import BasePermission, SAFE_METHODS
from django.conf import settings


class IsAdminStaff(BasePermission):
    """
    Enforces strict access control: Only authenticated Django staff or superusers
    may execute administrative operations.
    In development mode with DEV_MOCK_ADMIN=True, allows dev simulation.
    """

    def has_permission(self, request, view):
        if getattr(settings, "DEV_MOCK_ADMIN", False) and settings.DEBUG:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


class IsReadOnlyOrAdmin(BasePermission):
    """
    Allows read-only access (GET, HEAD, OPTIONS) to authenticated users,
    while restricting mutations (POST, PUT, PATCH, DELETE) strictly to staff.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )

