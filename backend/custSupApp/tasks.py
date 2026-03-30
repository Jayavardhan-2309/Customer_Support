# Plain function — called directly from the view (no Celery)
import logging
from celery import shared_task
from celery.utils.log import get_task_logger
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from custSupApp.models import SupportTicket
import os

logger = get_task_logger(__name__)


import resend

resend.api_key = os.environ["RESEND_API_KEY"]

def send_ticket_email(self, ticket_id, staff_email, conversation_text, query):
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        html_content = render_to_string(
            "emails/support_ticket.html",
            {"ticket": ticket, "conversation_text": conversation_text, "query": query},
        )
        resend.Emails.send({
            "from": "onboarding@resend.dev",  # swap for your domain later
            "to": [staff_email],
            "subject": f"[Ticket #{ticket.id}] New Support Ticket",
            "html": html_content,
        })
        logger.info(f"[send_ticket_email] Email sent for ticket #{ticket_id}")

    except SupportTicket.DoesNotExist:
        logger.warning(f"[send_ticket_email] Ticket #{ticket_id} not found, skipping.")

    except Exception as exc:
        logger.error(f"[send_ticket_email] Failed for ticket #{ticket_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)
