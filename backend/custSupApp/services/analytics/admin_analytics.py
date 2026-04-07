# custSupApp/services/analytics/admin_analytics.py

from django.db.models import Avg, Count
from custSupApp.models import TicketFeedback
from django.utils import timezone
from datetime import timedelta

from custSupApp.models import SupportTicket, TicketFeedback, User

def get_admin_staff_performance(org):
    data = (
        TicketFeedback.objects
        .filter(staff__organization=org)
        .values("staff__id", "staff__username")
        .annotate(
            avg_rating=Avg("rating"),
            total_feedbacks=Count("id")
        )
        .order_by("-avg_rating")
    )

    return [
        {
            "staff_id": row["staff__id"],
            "name": row["staff__username"],
            "avg_rating": round(row["avg_rating"] or 0, 2),
            "total_feedbacks": row["total_feedbacks"]
        }
        for row in data
    ]


def get_ticket_stats(org):
    tickets = SupportTicket.objects.filter(organization=org)

    return {
        "open": tickets.filter(status="open").count(),
        "in_progress": tickets.filter(status="in_progress").count(),
        "resolved": tickets.filter(status__in=["resolved", "closed"]).count(),
        "closed": tickets.filter(status="closed").count(),
    }


def get_overall_metrics(org):
    tickets = SupportTicket.objects.filter(organization=org)

    today = timezone.now().date()
    week_start = today - timedelta(days=7)

    return {
        "total_tickets": tickets.count(),
        "resolved_today": tickets.filter(resolved_at__date=today).count(),
        "resolved_this_week": tickets.filter(resolved_at__date__gte=week_start).count(),
    }


def get_admin_analytics(org):
    return {
        "ticket_stats": get_ticket_stats(org),
        "overall_metrics": get_overall_metrics(org),
        "staff_performance": get_admin_staff_performance(org)
    }
