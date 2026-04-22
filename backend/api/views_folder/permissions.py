from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import BasePermission

from custSupApp.models import SupportTicket


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "admin"
        )


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "staff"
        )


def get_escalation_count_today(user) -> int:
    since = timezone.now() - timedelta(hours=24)
    return SupportTicket.objects.filter(
        user=user,
        created_at__gte=since,
    ).count()
