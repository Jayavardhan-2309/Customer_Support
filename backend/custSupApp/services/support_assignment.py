from django.db import transaction
from custSupApp.models import User
import logging
logger= logging.getLogger(__name__)


# In your assignment service file
def assign_least_busy_staff(org_id):
    """
    Assigns the least busy available staff user WITHIN a specific organization.
    """
    logger.info(f"[Assigning least busy staff for Org: {org_id}]")

    with transaction.atomic():
        staff = (
            User.objects
            .select_for_update()
            .filter(
                role="staff", 
                is_available=True, 
                organization_id=org_id  # Filter by organization
            )
            .order_by("active_tickets", "id")
            .first()
        )

        if not staff:
            return None

        staff.active_tickets += 1
        staff.save(update_fields=["active_tickets"])

        return staff
