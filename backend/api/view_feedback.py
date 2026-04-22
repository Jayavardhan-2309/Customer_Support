import traceback

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from custSupApp.authentication import CookieJWTAuthentication
from custSupApp.models import Organization, SupportTicket, TicketFeedback


class OrganizationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            orgs = Organization.objects.all().values("id", "name")
            return Response(list(orgs))
        except Exception as exc:
            return Response({"error": str(exc), "trace": traceback.format_exc()}, status=500)


class SubmitFeedbackView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, ticket_id):
        ticket = get_object_or_404(
            SupportTicket, id=ticket_id, user=request.user, status="resolved"
        )
        if hasattr(ticket, "feedback"):
            return Response({"detail": "Feedback already submitted"}, status=400)

        TicketFeedback.objects.create(
            ticket=ticket,
            staff=ticket.assigned_to,
            user=request.user,
            rating=request.data.get("rating"),
            comment=request.data.get("comment", ""),
        )
        ticket.status = "closed"
        ticket.closed_at = timezone.now()
        ticket.save(update_fields=["status"])
        return Response({"message": "Feedback submitted and ticket closed"})


class UserResolvedTicketsView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = SupportTicket.objects.filter(
            user=request.user, status="resolved"
        ).select_related("assigned_to")
        data = [{
            "id": ticket.id,
            "query": ticket.description or ticket.message,
            "resolution_note": ticket.resolution_note or "None",
            "staff_name": ticket.assigned_to.username if ticket.assigned_to else "Unknown",
            "has_feedback": hasattr(ticket, "feedback"),
        } for ticket in tickets]
        return Response(data)
