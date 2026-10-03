from rest_framework import permissions

class IsStudentRole(permissions.BasePermission):
    """
    Custom permission to only allow users explicitly registered as STUDENT to write data.
    """
    def has_permission(self, request, view):
        # Always allow safe methods (GET, HEAD, OPTIONS) for any logged-in user
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Check if the logged-in user has the 'STUDENT' role string for write actions (POST)
        return request.user and request.user.is_authenticated and request.user.role == 'STUDENT'


class IsStaffRoleOrReadOnly(permissions.BasePermission):
    """Any logged-in user may read; only lecturers/admins may write."""
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user.role in ('LECTURER', 'ADMIN') or user.is_superuser


class IsAdminRoleOrReadOnly(permissions.BasePermission):
    """Any logged-in user may read; only the coordinator may write."""
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user.role == 'ADMIN' or user.is_superuser