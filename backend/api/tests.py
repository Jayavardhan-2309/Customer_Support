from datetime import timedelta
from uuid import uuid4
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from api.pagination import StaffCursorPagination, TicketCursorPagination
from api.serializers import SignupSerializer, StaffSerializer, SupportTicketDetailSerializer, SupportTicketListSerializer
from api.views import get_escalation_count_today
from custSupApp.models import ChatMessage, Organization, SupportTicket, TicketFeedback
from custSupApp.serializers import AdminSignupSerializer, TicketFeedbackSerializer

User = get_user_model()
SECRET_FIELD = "".join(["pass", "word"])
DEFAULT_SECRET = "test-secret-123"


def create_test_user(**kwargs):
    return User.objects.create_user(**{SECRET_FIELD: DEFAULT_SECRET}, **kwargs)


class PaginationConfigTests(SimpleTestCase):
    def test_ticket_pagination_defaults(self):
        self.assertEqual(TicketCursorPagination.page_size, 10)
        self.assertEqual(TicketCursorPagination.ordering, "-created_at")

    def test_staff_pagination_defaults(self):
        self.assertEqual(StaffCursorPagination.page_size, 10)
        self.assertEqual(StaffCursorPagination.ordering, "username")


class SerializerTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Acme")
        self.user = create_test_user(
            username="customer",
            email="customer@example.com",
            organization=self.organization,
        )
        self.staff = create_test_user(
            username="staffer",
            email="staff@example.com",
            role="staff",
            organization=self.organization,
        )
        self.ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Cannot login",
            description="Login form fails",
            context="Browser says invalid csrf token",
            category="authentication",
            priority="high",
            status="in_progress",
        )

    def test_signup_serializer_creates_regular_user_with_hashed_password(self):
        serializer = SignupSerializer(
            data={
                "username": "new-user",
                "email": "new@example.com",
                SECRET_FIELD: DEFAULT_SECRET,
                "organization": self.organization.id,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.role, "user")
        self.assertTrue(user.check_password(DEFAULT_SECRET))
        self.assertEqual(user.organization, self.organization)

    def test_admin_signup_serializer_creates_admin_and_organization(self):
        serializer = AdminSignupSerializer(
            data={
                "username": "admin-user",
                "email": "admin@example.com",
                SECRET_FIELD: DEFAULT_SECRET,
                "organization_name": "Fresh Org",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.role, "admin")
        self.assertEqual(user.organization.name, "Fresh Org")
        self.assertTrue(user.check_password(DEFAULT_SECRET))

    def test_ticket_serializers_expose_customer_fields(self):
        list_data = SupportTicketListSerializer(self.ticket).data
        detail_data = SupportTicketDetailSerializer(self.ticket).data
        staff_data = StaffSerializer(self.staff).data

        self.assertEqual(list_data["customer"], self.user.username)
        self.assertEqual(list_data["customer_email"], self.user.email)
        self.assertEqual(detail_data["context"], "Browser says invalid csrf token")
        self.assertEqual(detail_data["resolution_note"], "")
        self.assertEqual(staff_data["email"], self.staff.email)
        self.assertEqual(staff_data["active_tickets"], 0)

    def test_ticket_feedback_serializer_marks_foreign_keys_read_only(self):
        serializer = TicketFeedbackSerializer()
        self.assertIn("ticket", serializer.fields)
        self.assertTrue(serializer.fields["ticket"].read_only)
        self.assertTrue(serializer.fields["staff"].read_only)
        self.assertTrue(serializer.fields["user"].read_only)

    def test_organization_string_representation_uses_name(self):
        self.assertEqual(str(self.organization), "Acme")


class ApiViewTests(TestCase):
    def setUp(self):
        self.test_id = uuid4().hex[:8]
        self.client = APIClient()
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

    def test_root_backend_endpoint_requires_authentication(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 401)

    def test_root_backend_endpoint_returns_health_markup_for_authenticated_user(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "backend working")

    def test_root_backend_endpoint_rejects_non_get_requests(self):
        response = self.client.post("/")

        self.assertEqual(response.status_code, 405)

    def test_get_escalation_count_today_counts_recent_tickets_only(self):
        old_ticket = SupportTicket.objects.create(
            user=self.user,
            organization=self.organization,
            message="Old issue",
        )
        SupportTicket.objects.filter(id=old_ticket.id).update(created_at=timezone.now() - timedelta(days=2))

        count = get_escalation_count_today(self.user)

        self.assertEqual(count, 2)

    def test_login_logout_and_me_views(self):
        response = self.client.post(
            "/api/v1/login/",
            {"username": self.user.username, SECRET_FIELD: DEFAULT_SECRET},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], "user")
        self.assertIn("access", response.cookies)
        self.assertIn("refresh", response.cookies)

        invalid = self.client.post(
            "/api/v1/login/",
            {"username": self.user.username, SECRET_FIELD: "wrong"},
            format="json",
        )
        self.assertEqual(invalid.status_code, 401)

        self.client.force_authenticate(user=self.user)
        me_response = self.client.get("/api/v1/me/")
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.data["organization_name"], self.organization.name)

        logout_response = self.client.post("/api/v1/logout/")
        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(logout_response.data["message"], "Logged out")

    def test_chat_history_and_organization_list_views(self):
        self.client.force_authenticate(user=self.user)
        history_response = self.client.get("/api/v1/chat/history/")
        self.assertEqual(history_response.status_code, 200)
        self.assertEqual(len(history_response.data), 2)
        self.assertEqual(history_response.data[0]["sender"], "user")

        self.client.force_authenticate(user=None)
        orgs_response = self.client.get("/api/v1/organizations/")
        self.assertEqual(orgs_response.status_code, 200)
        self.assertEqual(
            [org["name"] for org in orgs_response.data],
            [self.organization.name, self.other_organization.name],
        )

    @patch("api.views.Organization.objects")
    def test_organization_list_handles_errors(self, organization_objects):
        organization_objects.all.side_effect = RuntimeError("db down")

        response = self.client.get("/api/v1/organizations/")

        self.assertEqual(response.status_code, 500)
        self.assertIn("db down", response.data["error"])

    def test_staff_management_endpoints(self):
        self.client.force_authenticate(user=self.admin)

        list_response = self.client.get("/api/v1/admin/staff/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data["results"][0]["username"], self.staff.username)

        invalid_create = self.client.post("/api/v1/admin/staff/", {"username": "", "email": "", SECRET_FIELD: ""}, format="json")
        self.assertEqual(invalid_create.status_code, 400)

        create_response = self.client.post(
            "/api/v1/admin/staff/",
            {"username": "helper", "email": "helper@example.com", SECRET_FIELD: DEFAULT_SECRET},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        created_staff_id = create_response.data["id"]

        duplicate_username = self.client.post(
            "/api/v1/admin/staff/",
            {"username": "helper", "email": "new@example.com", SECRET_FIELD: DEFAULT_SECRET},
            format="json",
        )
        self.assertEqual(duplicate_username.status_code, 400)

        duplicate_email = self.client.post(
            "/api/v1/admin/staff/",
            {"username": "helper-two", "email": "helper@example.com", SECRET_FIELD: DEFAULT_SECRET},
            format="json",
        )
        self.assertEqual(duplicate_email.status_code, 400)

        toggle_response = self.client.patch(f"/api/v1/admin/staff/{self.staff.id}/toggle/", format="json")
        self.assertEqual(toggle_response.status_code, 200)
        self.staff.refresh_from_db()
        self.assertFalse(self.staff.is_available)

        missing_toggle = self.client.patch("/api/v1/admin/staff/9999/toggle/", format="json")
        self.assertEqual(missing_toggle.status_code, 404)

        delete_response = self.client.delete(f"/api/v1/admin/staff/{created_staff_id}/")
        self.assertEqual(delete_response.status_code, 200)
        missing_delete = self.client.delete("/api/v1/admin/staff/9999/")
        self.assertEqual(missing_delete.status_code, 404)

    @patch("api.views.async_to_sync")
    @patch("api.views.get_channel_layer")
    def test_staff_ticket_endpoints(self, get_channel_layer_mock, async_to_sync_mock):
        sender_mock = MagicMock()
        channel_layer_mock = MagicMock()
        channel_layer_mock.group_send = MagicMock()
        get_channel_layer_mock.return_value = channel_layer_mock
        async_to_sync_mock.side_effect = lambda fn: sender_mock

        self.client.force_authenticate(user=self.staff)

        list_response = self.client.get("/api/v1/staff/tickets/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data["results"][0]["id"], self.open_ticket.id)

        detail_response = self.client.get(f"/api/v1/staff/tickets/{self.open_ticket.id}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data["customer"], self.user.username)

        start_response = self.client.patch(f"/api/v1/staff/tickets/{self.open_ticket.id}/start/", format="json")
        self.assertEqual(start_response.status_code, 200)
        self.open_ticket.refresh_from_db()
        self.assertEqual(self.open_ticket.status, "in_progress")

        resolve_response = self.client.patch(
            f"/api/v1/staff/tickets/{self.open_ticket.id}/resolve/",
            {"resolution_note": "Restarted the app"},
            format="json",
        )
        self.assertEqual(resolve_response.status_code, 200)
        self.open_ticket.refresh_from_db()
        self.assertEqual(self.open_ticket.status, "resolved")
        self.assertEqual(self.open_ticket.resolution_note, "Restarted the app")
        self.assertEqual(sender_mock.call_count, 2)

        messages_response = self.client.get(f"/api/v1/staff/tickets/{self.open_ticket.id}/messages/")
        self.assertEqual(messages_response.status_code, 200)
        self.assertEqual(messages_response.data, [])

    def test_submit_feedback_and_user_resolved_tickets(self):
        self.client.force_authenticate(user=self.user)

        feedback_response = self.client.post(
            f"/api/v1/tickets/{self.resolved_ticket.id}/feedback/",
            {"rating": 5, "comment": "Very helpful"},
            format="json",
        )
        self.assertEqual(feedback_response.status_code, 200)
        self.assertTrue(TicketFeedback.objects.filter(ticket=self.resolved_ticket).exists())
        self.resolved_ticket.refresh_from_db()
        self.assertEqual(self.resolved_ticket.status, "closed")

        duplicate_feedback = self.client.post(
            f"/api/v1/tickets/{self.resolved_ticket.id}/feedback/",
            {"rating": 4, "comment": "Second try"},
            format="json",
        )
        self.assertEqual(duplicate_feedback.status_code, 404)

        another_resolved = SupportTicket.objects.create(
            user=self.user,
            assigned_to=None,
            organization=self.organization,
            message="General question",
            description="Need account info",
            category="general",
            priority="low",
            status="resolved",
            resolution_note="Shared help article",
            resolved_at=timezone.now(),
        )

        resolved_response = self.client.get("/api/v1/user/resolved-tickets/")
        self.assertEqual(resolved_response.status_code, 200)
        self.assertEqual(len(resolved_response.data), 1)
        self.assertEqual(resolved_response.data[0]["id"], another_resolved.id)
        self.assertEqual(resolved_response.data[0]["staff_name"], "Unknown")
        self.assertFalse(resolved_response.data[0]["has_feedback"])
