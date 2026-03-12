from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from custSupApp.models import SupportTicket


@shared_task
def send_ticket_email(ticket_id, staff_email, conversation_text, query):

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
        body="New support ticket created.",  # fallback text
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[staff_email],
    )

    email.attach_alternative(html_content, "text/html")

    email.send()