from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch
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
TEST1 = "secret12345"
from custSupApp.tests.analytics_test_base import AnalyticsTestBase
class ModelsAndAnalyticsTests(AnalyticsTestBase):
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
    def test_model_default_choices_and_related_names(self):
        default_user = User.objects.create_user(
            username="default-user",
            email="default@example.com",
            password=TEST1,
        )
        default_ticket = SupportTicket.objects.create(
            user=default_user,
            message="Default issue",
        )
        self.assertEqual(default_user.role, "user")
        self.assertIsNone(default_user.organization)
        self.assertEqual(default_ticket.status, "open")
        self.assertEqual(default_ticket.priority, "normal")
        self.assertEqual(default_ticket.category, "general")
        self.assertEqual(self.organization.users.count(), 3)
        self.assertEqual(self.organization.tickets.count(), 5)
        self.assertEqual(self.organization.documents.count(), 1)
        self.assertEqual(self.staff.received_feedback.count(), 1)
        self.assertEqual(self.user.given_feedback.count(), 1)
    @patch("custSupApp.services.analytics.analytics_service.timezone.now")
    def test_staff_analytics_service_helpers(self, analytics_now_mock):
        analytics_now_mock.return_value = self.now
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
    @patch("custSupApp.services.analytics.admin_analytics.timezone.now")
    def test_admin_analytics_helpers(self, admin_now_mock):
        admin_now_mock.return_value = self.now
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
        self.assertEqual(detail["performance"]["resolved_tickets"], 3)
        self.assertIsNotNone(detail["performance"]["avg_resolution_time"])
        self.assertEqual(detail["feedback"][0]["comment"], "Great support")
    def test_staff_detail_service_returns_none_average_without_resolved_tickets(self):
        detail = get_staff_detail(self.other_staff.id)
        self.assertEqual(detail["performance"]["total_tickets"], 0)
        self.assertEqual(detail["performance"]["resolved_tickets"], 0)
        self.assertIsNone(detail["performance"]["avg_resolution_time"])
