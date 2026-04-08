from django.db import transaction
from custSupApp.models import User
import logging
logger= logging.getLogger(__name__)


def assign_least_busy_staff():
    """
    Assigns the least busy available staff user.
    Uses select_for_update to prevent race conditions.
    """
    logger.info("[Assigning least busy staff]")

    with transaction.atomic(): # for atomicity in db transactions, these group of instructions are done at a time and are committed to db only when all are executed successfully

        staff = (
            User.objects
            .select_for_update() # this is used to prevent race condition, another user's ticket is not assigned to this staff
            .filter(role="staff", is_available=True)
            .order_by("active_tickets", "id")
            .first()
        )

        if not staff:
            return None

        # Increment workload safely
        staff.active_tickets += 1
        staff.save(update_fields=["active_tickets"]) # update only the active_tickets field in staff

        return staff