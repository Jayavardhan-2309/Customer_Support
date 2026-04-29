import logging
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from custSupApp.ai import get_ai_response
from custSupApp.authentication import CookieJWTAuthentication
from custSupApp.models import ChatMessage
from custSupApp.services.ticket_extraction import extract_ticket_structure_smart
from custSupApp.services.ticket_service import create_structured_ticket
from custSupApp.tasks import send_ticket_email

from .permissions import get_escalation_count_today

logger = logging.getLogger(__name__)


class SupportAIView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get("prompt")
        if not query:
            return Response({"detail": "Prompt is required"}, status=400)

        previous = ChatMessage.objects.filter(
            user=request.user
        ).order_by("-created_at")[:20].values("sender", "message")
        history = [{"role": msg["sender"], "content": msg["message"]} for msg in previous][::-1]
        ChatMessage.objects.create(user=request.user, sender="user", message=query)
        escalation_count = get_escalation_count_today(request.user)

        try:
            intent, reply, confidence, escalated = get_ai_response(
                query=query,
                history=history,
                org_id=request.user.organization_id,
                escalation_count=escalation_count,
            )
        except (RuntimeError, ValueError) as exc:
            logger.error("[AI ERROR]: %s", exc)
            return Response({
                "intent": "error",
                "reply": "Sorry, something went wrong. Please try again.",
                "confidence": 0.0,
                "escalated": False,
            }, status=200)

        if escalated:
            structured_data = extract_ticket_structure_smart(query, history)
            ticket, staff_member = create_structured_ticket(request.user, query, structured_data)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "tickets",
                {
                    "type": "send_ticket",
                    "data": {
                        "id": ticket.id,
                        "priority": ticket.priority,
                        "status": ticket.status,
                        "customer": ticket.user.username,
                        "message": ticket.message,
                        "category": ticket.category,
                    },
                },
            )

            recent_messages = ChatMessage.objects.filter(
                user=request.user,
                created_at__gte=timezone.now() - timedelta(minutes=15),
            ).order_by("created_at")
            conversation_lines = []
            for msg in recent_messages:
                prefix = "User" if msg.sender == "user" else "AI"
                conversation_lines.append(f"{prefix}: {msg.message}")
            conversation_text = "\n".join(conversation_lines)

            if staff_member:
                send_ticket_email.delay(
                    ticket_id=ticket.id,
                    staff_email=staff_member.email,
                    conversation_text=conversation_text,
                    query=query,
                )
            else:
                logger.warning("[ESCALATION] No available staff found.")

        ChatMessage.objects.create(user=request.user, sender="ai", message=reply)
        return Response({
            "intent": intent,
            "reply": reply,
            "confidence": confidence,
            "escalated": escalated,
            "escalations_remaining": max(0, 3 - (escalation_count + (1 if escalated else 0))),
        })
