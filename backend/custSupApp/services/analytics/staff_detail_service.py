from django.db.models import Avg, Count, F, ExpressionWrapper, DurationField
from custSupApp.models import TicketFeedback, SupportTicket, User
from django.db import models


def get_staff_detail(staff_id):
    staff = User.objects.get(id=staff_id)

    # Feedback
    feedbacks = TicketFeedback.objects.filter(
        staff=staff
    ).select_related("user", "ticket")

    feedback_data = [
        {
            "rating": f.rating,
            "comment": f.comment,
            "user": f.user.username,
            "ticket": f.ticket.message,
            "date": f.created_at
        }
        for f in feedbacks
    ]

    # All tickets for stats
    all_tickets = SupportTicket.objects.filter(assigned_to=staff)

    stats = all_tickets.aggregate(
        total=Count("id"),
        resolved=Count("id", filter=models.Q(status="resolved"))
    )

    # Resolution time (only resolved tickets)
    resolved_tickets = all_tickets.filter(
        status="resolved",
        resolved_at__isnull=False
    ).annotate(
        resolution_time=ExpressionWrapper(
            F("resolved_at") - F("created_at"),
            output_field=DurationField()
        )
    )

    avg_time = resolved_tickets.aggregate(avg=Avg("resolution_time"))["avg"]

    if avg_time:
        total_seconds = avg_time.total_seconds()
        minutes = int(total_seconds // 60)
        hours = minutes // 60
        minutes = minutes % 60
        avg_time = f"{hours}h {minutes}m"
    else:
        avg_time = None

    return {
        "staff": {
            "id": staff.id,
            "name": staff.username
        },
        "performance": {
            "total_tickets": stats["total"],
            "resolved_tickets": stats["resolved"],
            "avg_resolution_time": avg_time
        },
        "feedback": feedback_data
    }
