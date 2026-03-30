import logging
from celery import shared_task
from celery.utils.log import get_task_logger
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from custSupApp.models import SupportTicket
import os

logger = get_task_logger(__name__)




@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_ticket_email(self, ticket_id, staff_email, conversation_text, query):
    import resend
    resend.api_key = os.environ["RESEND_API_KEY"]
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


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def reindex_org(self, org_id):
    from custSupApp.models import Organisation  # adjust to your actual model
    from custSupApp.index_knowledge import run_indexing

    # Validate before doing any work — no point retrying a bad org_id
    if not Organisation.objects.filter(id=org_id).exists():
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