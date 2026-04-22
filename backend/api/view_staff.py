from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.views import APIView

from api.pagination import TicketCursorPagination
from api.serializers import SupportTicketDetailSerializer, SupportTicketListSerializer
from custSupApp.authentication import CookieJWTAuthentication
from custSupApp.models import ChatMessage, SupportTicket
from custSupApp.services.analytics.analytics_service import get_staff_analytics

from .view_permissions import IsStaff


class StaffTicketViewSet(GenericViewSet, ListModelMixin):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsStaff]
    pagination_class = TicketCursorPagination

    def get_queryset(self):
        return SupportTicket.objects.select_related("user").filter(
            assigned_to=self.request.user,
            status__in=["open", "in_progress"],
        ).order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SupportTicketDetailSerializer
        return SupportTicketListSerializer

    def list(self, request):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        ticket = get_object_or_404(SupportTicket, id=pk, assigned_to=request.user)
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="resolve")
    def resolve(self, request, pk=None):
        ticket = get_object_or_404(SupportTicket, id=pk, assigned_to=request.user)
        ticket.status = "resolved"
        ticket.resolution_note = request.data.get("resolution_note", "")
        ticket.resolved_at = timezone.now()
        ticket.save(update_fields=["status", "resolution_note", "resolved_at"])
        async_to_sync(get_channel_layer().group_send)(
            "tickets",
            {"type": "send_ticket", "data": {"id": ticket.id, "status": "resolved"}},
        )
        return Response({"message": "Ticket resolved", "ticket_id": ticket.id})

    @action(detail=True, methods=["patch"], url_path="start")
    def start_progress(self, request, pk=None):
        ticket = get_object_or_404(SupportTicket, id=pk, assigned_to=request.user)
        ticket.status = "in_progress"
        ticket.save(update_fields=["status"])
        async_to_sync(get_channel_layer().group_send)(
            "tickets",
            {"type": "send_ticket", "data": {"id": ticket.id, "status": "in_progress"}},
        )
        return Response({"message": "Ticket marked as in progress", "ticket_id": ticket.id})

    @action(detail=True, methods=["get"], url_path="messages")
    def messages(self, request, pk=None):
        ticket = get_object_or_404(SupportTicket, id=pk, assigned_to=request.user)
        cutoff = ticket.created_at - timedelta(minutes=15)
        messages = ChatMessage.objects.filter(
            user=ticket.user,
            created_at__gte=cutoff,
            created_at__lte=ticket.created_at,
        ).order_by("created_at")
        data = [{"sender": m.sender, "message": m.message, "created_at": m.created_at} for m in messages]
        return Response(data)


class StaffAnalyticsView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsStaff]

    def get(self, request):
        return Response(get_staff_analytics(request.user))
