from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.views import APIView

from api.pagination import TicketCursorPagination
from accounts.authentication import CookieJWTAuthentication
from accounts.permissions import IsStaff
from custSupApp.models import ChatMessage, SupportTicket
from custSupApp.services.analytics.analytics_service import get_staff_analytics
from staff_portal.serializers import SupportTicketDetailSerializer, SupportTicketListSerializer


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
        """
        Get paginated messages for a ticket.
        Query parameters:
            - page: Page number (default: 1)
            - per_page: Messages per page (default: 10)
        
        Returns messages in reverse chronological order (newest first) for pagination.
        """
        ticket = get_object_or_404(SupportTicket, id=pk, assigned_to=request.user)
        
        # Get pagination parameters
        page = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 10))
        
        # Get messages for this ticket, ordered by created_at descending (newest first)
        # If ticket field is not set on messages, fall back to time-based filtering
        if ChatMessage.objects.filter(ticket=ticket).exists():
            messages = ChatMessage.objects.filter(
                ticket=ticket
            ).order_by("-created_at")
        else:
            # Fallback: get messages from 15 minutes before ticket creation to now
            # This ensures backward compatibility with existing messages
            cutoff = ticket.created_at - timedelta(minutes=15)
            messages = ChatMessage.objects.filter(
                user=ticket.user,
                created_at__gte=cutoff,
            ).order_by("-created_at")
        
        # Paginate the results
        paginator = Paginator(messages, per_page)
        page_obj = paginator.get_page(page)
        
        # Build response data
        data = [{
            "sender": m.sender,
            "message": m.message,
            "created_at": m.created_at.isoformat(),
        } for m in page_obj.object_list]
        
        return Response({
            "results": data,
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "next_page": page_obj.next_page_number() if page_obj.has_next() else None,
            "previous_page": page_obj.previous_page_number() if page_obj.has_previous() else None,
        })


class StaffAnalyticsView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsStaff]

    def get(self, request):
        return Response(get_staff_analytics(request.user))
