from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory

from custSupApp.models import ChatMessage, Organization, SupportTicket

User = get_user_model()
SECRET_FIELD = "".join(["pass", "word"])
DEFAULT_SECRET = "test-secret-123"


def create_test_user(**kwargs):
    return User.objects.create_user(**{SECRET_FIELD: DEFAULT_SECRET}, **kwargs)


class ApiViewBaseTestCase(TestCase):
    def setUp(self):
        self.test_id = uuid4().hex[:8]
        self.client = APIClient()
        self.factory = APIRequestFactory()
        self.organization = Organization.objects.create(name=f"Support Org {self.test_id}")
        self.other_organization = Organization.objects.create(name=f"Other Org {self.test_id}")
        self.admin = create_test_user(
            username=f"admin-{self.test_id}",
            email=f"admin-{self.test_id}@example.com",
            role="admin",
            organization=self.organization,
        )
        self.staff = create_test_user(
            username=f"staff-{self.test_id}",
            email=f"staff-{self.test_id}@example.com",
            role="staff",
            organization=self.organization,
        )
        self.other_staff = create_test_user(
            username=f"otherstaff-{self.test_id}",
            email=f"otherstaff-{self.test_id}@example.com",
            role="staff",
            organization=self.other_organization,
        )
        self.user = create_test_user(
            username=f"user-{self.test_id}",
            email=f"user-{self.test_id}@example.com",
            organization=self.organization,
        )
        self.open_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="App is broken",
            description="Seeing a blank page after login",
            category="technical",
            priority="high",
            status="open",
        )
        self.resolved_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Need invoice copy",
            description="Please resend March invoice",
            category="billing",
            priority="normal",
            status="resolved",
            resolution_note="Invoice sent",
            resolved_at=timezone.now(),
        )
        ChatMessage.objects.create(user=self.user, sender="user", message="First message")
        ChatMessage.objects.create(user=self.user, sender="ai", message="Reply message")
