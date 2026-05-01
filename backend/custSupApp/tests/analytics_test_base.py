from datetime import datetime, timedelta, timezone as dt_timezone
from django.contrib.auth import get_user_model
from django.test import TestCase
from custSupApp.models import ChatMessage, KnowledgeSource, Organization, SupportTicket, TicketFeedback, UploadedPDF

User = get_user_model()
TEST_PASSWORD = "secret12345"

class AnalyticsTestBase(TestCase):
    def setUp(self):
        self.now = datetime(2026, 1, 15, 12, 0, tzinfo=dt_timezone.utc)
        self.organization = Organization.objects.create(name="Analytics Org")
        self.user = User.objects.create_user(
            username="customer",
            email="customer@example.com",
            password=TEST_PASSWORD,
            organization=self.organization,
        )
        self.staff = User.objects.create_user(
            username="staffer",
            email="staff@example.com",
            password=TEST_PASSWORD,
            role="staff",
            organization=self.organization,
        )
        self.other_staff = User.objects.create_user(
            username="helper",
            email="helper@example.com",
            password=TEST_PASSWORD,
            role="staff",
            organization=self.organization,
        )
        self.open_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Open issue",
            category="billing",
            priority="high",
            status="open",
        )
        self.in_progress_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="In progress issue",
            category="technical",
            priority="normal",
            status="in_progress",
        )
        self.resolved_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Resolved issue",
            category="billing",
            priority="low",
            status="resolved",
            created_at=self.now - timedelta(hours=5),
            resolved_at=self.now - timedelta(hours=1),
            resolution_note="Fixed",
        )
        SupportTicket.objects.filter(id=self.resolved_ticket.id).update(
            created_at=self.now - timedelta(hours=5),
            resolved_at=self.now - timedelta(hours=1),
        )
        self.resolved_ticket.refresh_from_db()
        self.closed_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Closed issue",
            category="general",
            priority="high",
            status="closed",
            created_at=self.now - timedelta(days=2),
            resolved_at=self.now - timedelta(days=1, hours=2),
        )
        SupportTicket.objects.filter(id=self.closed_ticket.id).update(
            created_at=self.now - timedelta(days=2),
            resolved_at=self.now - timedelta(days=1, hours=2),
        )
        self.closed_ticket.refresh_from_db()
        self.resolved_today_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Resolved today",
            category="technical",
            priority="normal",
            status="resolved",
            created_at=self.now - timedelta(hours=3),
            resolved_at=self.now - timedelta(hours=1),
        )
        SupportTicket.objects.filter(id=self.resolved_today_ticket.id).update(
            created_at=self.now - timedelta(hours=3),
            resolved_at=self.now - timedelta(hours=1),
        )
        self.resolved_today_ticket.refresh_from_db()
        ChatMessage.objects.create(user=self.user, sender="user", message="Hello")
        self.knowledge = KnowledgeSource.objects.create(title="FAQ", content="Helpful content")
        self.uploaded_pdf = UploadedPDF.objects.create(
            title="Guide",
            file_url="https://example.com/file.pdf",
            organization=self.organization,
            uploaded_by=self.staff,
        )
        self.feedback = TicketFeedback.objects.create(
            ticket=self.resolved_ticket,
            staff=self.staff,
            user=self.user,
            rating=5,
            comment="Great support",
        )
