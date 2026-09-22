from rest_framework.permissions import BasePermission


class IsAdminStaff(BasePermission):
    """Only Django staff / superusers may access admin API."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
