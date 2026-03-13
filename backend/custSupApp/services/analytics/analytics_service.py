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
        "medium": 0,
        "low": 0
    }

    for row in data:
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

        days.append({
            "date":str(day),
            "created": created,
            "resolved": resolved
        })
    return list(reversed(days))

def get_staff_analytics(staff_user):
    return {
        "workload": get_ticket_workload_metrics(staff_user),
        "resolution_performance": get_ticket_resolution_metrics(staff_user),
        "priority_distribution": get_priority_distribution(staff_user),
        "category_distribution": get_category_distribution(staff_user),
        "ticket_trends": get_ticket_trends(staff_user),
    }
