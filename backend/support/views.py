import logging
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from pydantic import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CookieJWTAuthentication
from accounts.permissions import get_escalation_count_today
from ai_assistant.ai import get_ai_response
from custSupApp.models import ChatMessage
from knowledge_base.tasks import send_ticket_email
from tickets.services.ticket_extraction import extract_ticket_structure_smart
from tickets.services.ticket_service import create_structured_ticket

logger = logging.getLogger(__name__)


def _chat_history(user):
    previous = ChatMessage.objects.filter(
        user=user
    ).order_by("-created_at")[:20].values("sender", "message")
    return [{"role": msg["sender"], "content": msg["message"]} for msg in previous][::-1]


def _ai_error_response():
    return Response({
        "intent": "error",
        "reply": "Sorry, something went wrong. Please try again.",
        "confidence": 0.0,
        "escalated": False,
    }, status=200)


def _validated_prompt(data):
    prompt = data.get("prompt") if isinstance(data, dict) else None
    if not isinstance(prompt, str):
        return None
    prompt = prompt.strip()
    return prompt or None


def _send_ticket_update(ticket):
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


def _recent_conversation_text(user):
    """
    Get the last 10 user-AI conversation pairs for email notification.
    Returns a formatted string of the conversation.
    """
    # Get the last 20 messages (10 user messages + 10 AI responses)
    recent_messages = ChatMessage.objects.filter(
        user=user,
    ).order_by("-created_at")[:20]
    
    # Reverse to get chronological order
    recent_messages = list(reversed(recent_messages))
    
    lines = []
    for msg in recent_messages:
        prefix = "User" if msg.sender == "user" else "AI"
        lines.append(f"{prefix}: {msg.message}")
    return "\n".join(lines)


def _notify_staff(ticket, staff_member, query, user):
    if not staff_member:
        logger.warning("[ESCALATION] No available staff found.")
        return
    send_ticket_email.delay(
        ticket_id=ticket.id,
        staff_email=staff_member.email,
        conversation_text=_recent_conversation_text(user),
        query=query,
    )


def _handle_escalated_query(user, query, history):
    structured_data = extract_ticket_structure_smart(query, history)
    ticket, staff_member = create_structured_ticket(user, query, structured_data)
    _send_ticket_update(ticket)
    _notify_staff(ticket, staff_member, query, user)


def _remaining_escalations(escalation_count, escalated):
    return max(0, 3 - (escalation_count + (1 if escalated else 0)))


def _success_response(intent, reply, confidence, escalated, escalation_count):
    return Response({
        "intent": intent,
        "reply": reply,
        "confidence": confidence,
        "escalated": escalated,
        "escalations_remaining": _remaining_escalations(escalation_count, escalated),
    })


class SupportAIView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = _validated_prompt(request.data)
        if not query:
            return Response({"detail": "Prompt is required"}, status=400)

        history = _chat_history(request.user)
        ChatMessage.objects.create(user=request.user, sender="user", message=query)
        escalation_count = get_escalation_count_today(request.user)

        try:
            intent, reply, confidence, escalated = get_ai_response(
                query=query,
                history=history,
                org_id=request.user.organization_id,
                escalation_count=escalation_count,
            )
        except (RuntimeError, ValidationError) as exc:
            logger.error("[AI ERROR]: %s", exc)
            return _ai_error_response()

        if escalated:
            _handle_escalated_query(request.user, query, history)

        ChatMessage.objects.create(user=request.user, sender="ai", message=reply)
        return _success_response(intent, reply, confidence, escalated, escalation_count)
