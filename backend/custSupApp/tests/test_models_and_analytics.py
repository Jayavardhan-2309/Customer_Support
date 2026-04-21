from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from custSupApp.models import ChatMessage, KnowledgeSource, Organization, SupportTicket, TicketFeedback, UploadedPDF
from custSupApp.services.analytics.admin_analytics import (
    get_admin_analytics,
    get_admin_staff_performance,
    get_overall_metrics,
    get_ticket_stats,
)
from custSupApp.services.analytics.analytics_service import (
    get_category_distribution,
    get_category_resolved,
    get_priority_by_status,
    get_priority_distribution,
    get_staff_analytics,
    get_ticket_resolution_metrics,
    get_ticket_trends,
    get_ticket_workload_metrics,
)
from custSupApp.services.analytics.staff_detail_service import get_staff_detail

User = get_user_model()


class ModelsAndAnalyticsTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Analytics Org")
        self.user = User.objects.create_user(
            username="customer",
            email="customer@example.com",
            password="secret12345",
            organization=self.organization,
        )
        self.staff = User.objects.create_user(
            username="staffer",
            email="staff@example.com",
            password="secret12345",
            role="staff",
            organization=self.organization,
        )
        self.other_staff = User.objects.create_user(
            username="helper",
            email="helper@example.com",
            password="secret12345",
            role="staff",
            organization=self.organization,
        )

        now = timezone.now()

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
            created_at=now - timedelta(hours=5),
            resolved_at=now - timedelta(hours=1),
            resolution_note="Fixed",
        )
        self.closed_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Closed issue",
            category="general",
            priority="high",
            status="closed",
            created_at=now - timedelta(days=2),
            resolved_at=now - timedelta(days=1, hours=2),
        )
        self.resolved_today_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Resolved today",
            category="technical",
            priority="normal",
            status="resolved",
            created_at=now - timedelta(hours=3),
            resolved_at=now - timedelta(hours=1),
        )

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

    def test_model_defaults_and_relationships(self):
        self.assertEqual(str(self.organization), "Analytics Org")
        self.assertTrue(self.staff.is_available)
        self.assertEqual(self.staff.active_tickets, 0)
        self.assertEqual(self.in_progress_ticket.resolution_note, "")
        self.assertEqual(self.in_progress_ticket.customer_feedback, None)
        self.assertEqual(self.in_progress_ticket.description, "")
        self.assertEqual(self.in_progress_ticket.context, "")
        self.assertEqual(self.knowledge.title, "FAQ")
        self.assertEqual(self.uploaded_pdf.status, "queued")
        self.assertEqual(self.uploaded_pdf.last_processed_page, 0)
        self.assertFalse(self.uploaded_pdf.is_indexed)
        self.assertEqual(self.feedback.comment, "Great support")

    def test_staff_analytics_service_helpers(self):
        workload = get_ticket_workload_metrics(self.staff)
        resolution = get_ticket_resolution_metrics(self.staff)
        priority_distribution = get_priority_distribution(self.staff)
        category_distribution = get_category_distribution(self.staff)
        trends = get_ticket_trends(self.staff)
        priority_by_status = get_priority_by_status(self.staff)
        category_resolved = get_category_resolved(self.staff)
        analytics = get_staff_analytics(self.staff)

        self.assertEqual(workload["assigned"], 5)
        self.assertEqual(workload["open"], 1)
        self.assertEqual(workload["in_progress"], 1)
        self.assertEqual(workload["resolved"], 3)
        self.assertEqual(resolution["resolved_today"], 2)
        self.assertGreaterEqual(resolution["resolved_this_week"], 2)
        self.assertIsNotNone(resolution["avg_resolution_hours"])
        self.assertEqual(priority_distribution, {"high": 2, "normal": 2, "low": 1})
        self.assertEqual(category_distribution, {"billing": 2, "technical": 2, "general": 1})
        self.assertEqual(len(trends), 7)
        self.assertIn("assigned", priority_by_status)
        self.assertEqual(priority_by_status["assigned"]["high"], 2)
        self.assertEqual(category_resolved["billing"], 1)
        self.assertEqual(analytics["workload"]["assigned"], 5)
        self.assertEqual(analytics["priority_distribution"]["normal"], 2)

    def test_admin_analytics_helpers(self):
        TicketFeedback.objects.create(
            ticket=self.resolved_today_ticket,
            staff=self.staff,
            user=self.user,
            rating=4,
            comment="Good help",
        )

        ticket_stats = get_ticket_stats(self.organization)
        overall_metrics = get_overall_metrics(self.organization)
        staff_performance = get_admin_staff_performance(self.organization)
        admin_analytics = get_admin_analytics(self.organization)

        self.assertEqual(ticket_stats["open"], 1)
        self.assertEqual(ticket_stats["in_progress"], 1)
        self.assertEqual(ticket_stats["resolved"], 3)
        self.assertEqual(ticket_stats["closed"], 1)
        self.assertEqual(overall_metrics["total_tickets"], 5)
        self.assertEqual(overall_metrics["resolved_today"], 2)
        self.assertGreaterEqual(overall_metrics["resolved_this_week"], 3)
        self.assertEqual(staff_performance[0]["staff_id"], self.staff.id)
        self.assertEqual(staff_performance[0]["total_feedbacks"], 2)
        self.assertIn("ticket_stats", admin_analytics)
        self.assertIn("staff_performance", admin_analytics)

    def test_staff_detail_service_formats_feedback_and_average_time(self):
        detail = get_staff_detail(self.staff.id)

        self.assertEqual(detail["staff"]["name"], "staffer")
        self.assertEqual(detail["performance"]["total_tickets"], 5)
        self.assertEqual(detail["performance"]["resolved_tickets"], 2)
        self.assertIsNotNone(detail["performance"]["avg_resolution_time"])
        self.assertEqual(detail["feedback"][0]["comment"], "Great support")

    def test_staff_detail_service_returns_none_average_without_resolved_tickets(self):
        detail = get_staff_detail(self.other_staff.id)

        self.assertEqual(detail["performance"]["total_tickets"], 0)
        self.assertEqual(detail["performance"]["resolved_tickets"], 0)
        self.assertIsNone(detail["performance"]["avg_resolution_time"])
