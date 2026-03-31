import logging
import os
import requests
from celery import shared_task
from celery.utils.log import get_task_logger
from django.template.loader import render_to_string
from django.conf import settings
from custSupApp.models import SupportTicket

logger = get_task_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_ticket_email(self, ticket_id, staff_email, conversation_text, query):
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)

        html_content = render_to_string(
            "emails/support_ticket.html",
            {"ticket": ticket, "conversation_text": conversation_text, "query": query},
        )

        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": os.environ["BREVO_API_KEY"],
                "Content-Type": "application/json",
            },
            json={
                "sender": {"name": "Support System", "email": os.environ["BREVO_SENDER_EMAIL"]},
                "to": [{"email": staff_email}],
                "subject": f"[Ticket #{ticket.id}] New Support Ticket",
                "htmlContent": html_content,
            },
            timeout=15,
        )

        if response.status_code not in (200, 201):
            raise Exception(f"Brevo API error {response.status_code}: {response.text}")

        logger.info(f"[send_ticket_email] Email sent for ticket #{ticket_id} to {staff_email}")

    except SupportTicket.DoesNotExist:
        logger.warning(f"[send_ticket_email] Ticket #{ticket_id} not found, skipping.")

    except Exception as exc:
        logger.error(
            f"[send_ticket_email] Failed for ticket #{ticket_id} "
            f"(attempt {self.request.retries + 1}/{self.max_retries + 1}): {exc}",
            exc_info=True,
        )
        raise self.retry(exc=exc)

@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def reindex_org(self, org_id):
    from custSupApp.models import Organization
    from custSupApp.index_knowledge import run_indexing

    if not Organization.objects.filter(id=org_id).exists():
        logger.error(f"[reindex_org] Org #{org_id} does not exist, aborting.")
        return

    try:
        run_indexing(org_id)
        logger.info(f"[reindex_org] Reindex complete for org #{org_id}")

    except Exception as exc:
        logger.error(
            f"[reindex_org] Reindex failed for org #{org_id} "
            f"(attempt {self.request.retries + 1}/{self.max_retries + 1}): {exc}",
            exc_info=True,
        )
        raise self.retry(exc=exc)
    