# custSupApp/services/analytics/admin_analytics.py

from django.db.models import Avg, Count
from custSupApp.models import TicketFeedback

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

