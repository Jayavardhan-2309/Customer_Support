from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from custSupApp.models import SupportTicket


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_ticket_email(self, ticket_id, staff_email, conversation_text, query):
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)

        subject = f"[Ticket #{ticket.id}] New Support Ticket"

        html_content = render_to_string(
            "emails/support_ticket.html",
            {
                "ticket": ticket,
                "conversation_text": conversation_text,
                "query": query,
            },
        )

        email = EmailMultiAlternatives(
            subject=subject,
            body="New support ticket created.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[staff_email],
        )

        email.attach_alternative(html_content, "text/html")
        email.send()

    except SupportTicket.DoesNotExist:
        # Ticket was deleted before the task ran — don't retry
        print(f"[CELERY] Ticket {ticket_id} not found, skipping email.")

    except Exception as exc:
        print(f"[CELERY] Email failed for ticket {ticket_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def reindex_org(self, org_id):
    try:
        from custSupApp.index_knowledge import run_indexing
        run_indexing(org_id)
        print(f"[CELERY] Reindex complete for org {org_id}")

    except Exception as exc:
        print(f"[CELERY] Reindex failed for org {org_id}: {exc}")
        raise self.retry(exc=exc)