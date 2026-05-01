import logging

from custSupApp.models import SupportTicket
from knowledge_base.tasks import send_ticket_email
from tickets.services.support_assignment import assign_least_busy_staff
from django.conf import settings



def notify_staff(ticket, staff_member, conversation_text, query):
        if settings.DEBUG:
              send_ticket_email(ticket.id,
                staff_member.email,
                conversation_text,
                query)
        else:
            send_ticket_email.delay(
                ticket.id,
                staff_member.email,
                conversation_text,
                query
            ) # .delay sends the job to Celery worker

logger= logging.getLogger(__name__)

def create_structured_ticket(user, query, structured_data):

    staff_member = assign_least_busy_staff(user.organization_id)

    ticket = SupportTicket.objects.create(
        user=user,
        message=query,
        description=structured_data.get("description", query),
        context=structured_data.get("context", ""),
        category=structured_data.get("category", "general"),
        priority=structured_data.get("priority", "normal"),
        status="open",
        assigned_to=staff_member,
        organization=user.organization
    )

    logger.info("TICKET SERVICE CALLED")
    logger.info(
        f"Ticket #{ticket.id} created | "
        f"user={user.username} | "
        f"category={ticket.category} | "
        f"priority={ticket.priority}"
    )
    return ticket, staff_member

