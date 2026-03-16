from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField
from django.utils import timezone
from datetime import timedelta

from custSupApp.models import SupportTicket

def get_ticket_workload_metrics(staff_user):
    tickets= SupportTicket.objects.filter(assigned_to=staff_user)

    return {
        "assigned": tickets.count(),
        "open": tickets.filter(status="open").count(),
        "in_progress": tickets.filter(status="in_progress").count(),
        "resolved": tickets.filter(status="resolved").count(),
    }

# Resolution performance metrics
def get_ticket_resolution_metrics(staff_user):
    tickets= SupportTicket.objects.filter(assigned_to=staff_user, status="resolved")

    today= timezone.now().date()
    week_start= today- timedelta(days=7)
    resolved_today= tickets.filter(resolved_at__date=today).count()
    resolved_this_week= tickets.filter(resolved_at__date__gte=week_start).count()
    
    resolution_time= tickets.annotate(
        resolution_duration= ExpressionWrapper(F("resolved_at")-F("created_at"), output_field=DurationField())
    ).aggregate(avg_resolution=Avg("resolution_duration"))

    avg_hours= None

    if resolution_time["avg_resolution"]:
        avg_hours= resolution_time["avg_resolution"].total_seconds()/3600

    return {
        "resolved_today": resolved_today,
        "resolved_this_week": resolved_this_week,
        "avg_resolution_hours": round(avg_hours, 2) if avg_hours else None
    }

# Priority Distribution metrics
def get_priority_distribution(staff_user):
    tickets= SupportTicket.objects.filter(assigned_to= staff_user)
    data= tickets.values("priority").annotate(count=Count("id"))

    result={
        "high": 0,
        "normal": 0,
        "low": 0
    }

    for row in data:
        if row["priority"] in result:
            result[row["priority"]]= row["count"]

    return result

# category distribution metrics
def get_category_distribution(staff_user):
    tickets= SupportTicket.objects.filter(assigned_to=staff_user)
    data= tickets.values("category").annotate(count=Count("id"))
    result={}

    for row in data:
        result[row["category"]]= row["count"]

    return result

# ticket trend metrics
def get_ticket_trends(staff_user):
    today= timezone.now().date()
    days=[]
    
    for i in range(7):
        day= today-timedelta(days=i)
        created= SupportTicket.objects.filter(assigned_to=staff_user, created_at__date=day).count()

        resolved= SupportTicket.objects.filter(assigned_to=staff_user, resolved_at__date=day).count()

        open_created = SupportTicket.objects.filter(
            assigned_to=staff_user,
            status="open",
            created_at__date=day
        ).count()

        in_progress_created = SupportTicket.objects.filter(
            assigned_to=staff_user,
            status="in_progress",
            created_at__date=day
        ).count()


        days.append({
            "date":str(day),
            "created": created,
            "resolved": resolved,
            "open_created": open_created,
            "in_progress_created": in_progress_created
        })
    return list(reversed(days))

def get_priority_by_status(staff_user) -> dict:
    """
    Returns each ticket's (status, priority) pair as real counts.
 
    Shape:
    {
        "open":        {"high": 3, "normal": 7, "low": 2},
        "in_progress": {"high": 1, "normal": 4, "low": 0},
        "resolved":    {"high": 2, "normal": 5, "low": 3},
        "assigned":    {"high": 6, "normal": 16, "low": 5},  ← all tickets
    }
 
    "assigned" is the total across all statuses — used as the 4th radar axis.
    """
    rows = (
        SupportTicket.objects
        .filter(assigned_to=staff_user)
        .values("status", "priority")
        .annotate(count=Count("id"))
    )
 
    result: dict = {}
    for row in rows:
        s = row["status"]
        p = row["priority"]
        if s not in result:
            result[s] = {"high": 0, "normal": 0, "low": 0}
        if p in ("high", "normal", "low"):
            result[s][p] = row["count"]
 
    # "assigned" bucket = sum across all statuses (one query, not N loops)
    all_rows = (
        SupportTicket.objects
        .filter(assigned_to=staff_user)
        .values("priority")
        .annotate(count=Count("id"))
    )
    assigned: dict = {"high": 0, "normal": 0, "low": 0}
    for row in all_rows:
        if row["priority"] in assigned:
            assigned[row["priority"]] = row["count"]
    result["assigned"] = assigned
 
    return result


def get_category_resolved(staff_user) -> dict:
    """
    Returns how many resolved tickets exist per category for this staff member.
 
    Shape: {"Billing": 12, "Technical": 8, "General": 3, ...}
 
    Paired with category_distribution (= total created) on the frontend
    to draw the side-by-side Created vs Resolved bar chart — no multipliers.
    """
    rows = (
        SupportTicket.objects
        .filter(assigned_to=staff_user, status="resolved")
        .values("category")
        .annotate(count=Count("id"))
    )
 
    return {row["category"]: row["count"] for row in rows}

def get_staff_analytics(staff_user):
    return {
        "workload": get_ticket_workload_metrics(staff_user),
        "resolution_performance": get_ticket_resolution_metrics(staff_user),
        "priority_distribution": get_priority_distribution(staff_user),
        "category_distribution": get_category_distribution(staff_user),
        "ticket_trends": get_ticket_trends(staff_user),
        "priority_by_status":    get_priority_by_status(staff_user),
        "category_resolved":     get_category_resolved(staff_user),
    }
