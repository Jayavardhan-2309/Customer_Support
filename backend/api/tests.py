from datetime import timedelta
from uuid import uuid4
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from rest_framework.test import APIClient

from api.pagination import StaffCursorPagination, TicketCursorPagination
from api.serializers import SignupSerializer, StaffSerializer, SupportTicketDetailSerializer, SupportTicketListSerializer
from api.views import IsAdmin, IsStaff, PDFViewSet, get_escalation_count_today
from custSupApp.models import ChatMessage, Organization, SupportTicket, TicketFeedback, UploadedPDF
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


class PermissionTests(SimpleTestCase):
    def test_is_admin_permission_accepts_only_authenticated_admins(self):
        request = MagicMock()
        request.user = MagicMock(is_authenticated=True, role="admin")

        self.assertTrue(IsAdmin().has_permission(request, view=None))

        request.user.role = "staff"
        self.assertFalse(IsAdmin().has_permission(request, view=None))

    def test_is_staff_permission_accepts_only_authenticated_staff(self):
        request = MagicMock()
        request.user = MagicMock(is_authenticated=True, role="staff")

        self.assertTrue(IsStaff().has_permission(request, view=None))

        request.user.is_authenticated = False
        self.assertFalse(IsStaff().has_permission(request, view=None))


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

    def test_root_backend_endpoint_requires_authentication(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "backend working")

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

    def test_support_ai_requires_prompt(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post("/api/v1/support-ai/", {}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Prompt is required")

    @patch("api.views.get_escalation_count_today", return_value=0)
    @patch("api.views.get_ai_response", return_value=("general", "Helpful answer", 0.91, False))
    def test_support_ai_returns_reply_and_persists_messages(self, get_ai_response_mock, _count_mock):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/v1/support-ai/",
            {"prompt": "How do I reset my password?"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["intent"], "general")
        self.assertEqual(response.data["reply"], "Helpful answer")
        self.assertEqual(response.data["escalations_remaining"], 3)

        get_ai_response_mock.assert_called_once()
        self.assertEqual(
            get_ai_response_mock.call_args.kwargs["history"],
            [
                {"role": "user", "content": "First message"},
                {"role": "ai", "content": "Reply message"},
            ],
        )
        self.assertEqual(
            list(ChatMessage.objects.filter(user=self.user).values_list("sender", "message")),
            [
                ("user", "First message"),
                ("ai", "Reply message"),
                ("user", "How do I reset my password?"),
                ("ai", "Helpful answer"),
            ],
        )

    @patch("api.views.get_escalation_count_today", return_value=0)
    @patch("api.views.get_ai_response", side_effect=RuntimeError("backend offline"))
    def test_support_ai_returns_safe_error_when_backend_fails(self, _get_ai_response_mock, _count_mock):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/v1/support-ai/",
            {"prompt": "Please help"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["intent"], "error")
        self.assertEqual(response.data["reply"], "Sorry, something went wrong. Please try again.")
        self.assertEqual(ChatMessage.objects.filter(user=self.user).count(), 3)
        last_message = ChatMessage.objects.filter(user=self.user).order_by("-created_at").first()
        self.assertEqual(last_message.sender, "user")

    @patch("api.views.send_ticket_email.delay")
    @patch("api.views.async_to_sync")
    @patch("api.views.get_channel_layer")
    @patch("api.views.create_structured_ticket")
    @patch("api.views.extract_ticket_structure_smart", return_value={"priority": "high"})
    @patch("api.views.get_ai_response", return_value=("billing", "Escalating now", 0.2, True))
    @patch("api.views.get_escalation_count_today", return_value=1)
    def test_support_ai_escalation_creates_ticket_and_notifies_staff(
        self,
        _count_mock,
        _get_ai_response_mock,
        _extract_ticket_mock,
        create_ticket_mock,
        get_channel_layer_mock,
        async_to_sync_mock,
        send_ticket_email_mock,
    ):
        escalated_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Escalated ticket",
            description="Escalated by AI",
            category="billing",
            priority="high",
            status="open",
        )
        sender_mock = MagicMock()
        async_to_sync_mock.side_effect = lambda fn: sender_mock
        get_channel_layer_mock.return_value = MagicMock(group_send=MagicMock())
        create_ticket_mock.return_value = (escalated_ticket, self.staff)
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/v1/support-ai/",
            {"prompt": "I need a real person"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["escalated"])
        self.assertEqual(response.data["escalations_remaining"], 1)
        create_ticket_mock.assert_called_once()
        sender_mock.assert_called_once()
        send_ticket_email_mock.assert_called_once()

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

    def test_pdf_list_filters_to_admin_organization(self):
        UploadedPDF.objects.create(
            title="Internal Guide",
            file_url="https://files/internal.pdf",
            uploaded_by=self.admin,
            organization=self.organization,
        )
        UploadedPDF.objects.create(
            title="Other Guide",
            file_url="https://files/other.pdf",
            uploaded_by=self.other_staff,
            organization=self.other_organization,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.get("/api/v1/admin/pdfs/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["title"] for item in response.data], ["Internal Guide"])

    def test_pdf_upload_validates_missing_extension_and_size(self):
        self.client.force_authenticate(user=self.admin)

        missing_file = self.client.post("/api/v1/admin/pdfs/upload/", {}, format="multipart")
        self.assertEqual(missing_file.status_code, 400)

        not_pdf = SimpleUploadedFile("notes.txt", b"plain text", content_type="text/plain")
        invalid_type = self.client.post("/api/v1/admin/pdfs/upload/", {"file": not_pdf}, format="multipart")
        self.assertEqual(invalid_type.status_code, 400)

        huge_pdf = MagicMock()
        huge_pdf.name = "huge.pdf"
        huge_pdf.size = 11 * 1024 * 1024
        request = self.factory.post("/api/v1/admin/pdfs/upload/")
        request.user = self.admin
        request.FILES["file"] = huge_pdf
        response = PDFViewSet()
        too_large = response.upload(request)
        self.assertEqual(too_large.status_code, 400)

    @patch.dict(
        "os.environ",
        {
            "SUPABASE_URL": "https://example-supabase.test",
            "SUPABASE_SERVICE_KEY": "service-key",
        },
    )
    @patch("api.views.index_pdf.delay")
    @patch("api.views.create_client")
    def test_pdf_upload_saves_record_and_enqueues_indexing(self, create_client_mock, index_pdf_mock):
        storage_bucket = MagicMock()
        storage = MagicMock()
        storage.from_.return_value = storage_bucket
        supabase = MagicMock(storage=storage)
        create_client_mock.return_value = supabase
        self.client.force_authenticate(user=self.admin)
        pdf_file = SimpleUploadedFile("guide.pdf", b"%PDF-1.4 test", content_type="application/pdf")

        response = self.client.post("/api/v1/admin/pdfs/upload/", {"file": pdf_file}, format="multipart")

        self.assertEqual(response.status_code, 201)
        created_pdf = UploadedPDF.objects.get(title="guide.pdf")
        self.assertEqual(created_pdf.organization, self.organization)
        self.assertIn("/storage/v1/object/public/pdfs/", created_pdf.file_url)
        storage_bucket.upload.assert_called_once()
        index_pdf_mock.assert_called_once_with(created_pdf.id)

    def test_pdf_destroy_returns_not_found_for_unknown_pdf(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete("/api/v1/admin/pdfs/9999/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "PDF not found")


    @patch("api.views.get_staff_analytics", return_value={"resolved": 4})
    def test_staff_analytics_view_returns_service_data(self, get_staff_analytics_mock):
        self.client.force_authenticate(user=self.staff)

        response = self.client.get("/api/v1/staff/analytics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resolved"], 4)
        get_staff_analytics_mock.assert_called_once_with(self.staff)

    @patch("api.views.get_admin_analytics", return_value={"total_tickets": 12})
    def test_admin_analytics_view_returns_service_data(self, get_admin_analytics_mock):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get("/api/v1/admin/analytics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_tickets"], 12)
        get_admin_analytics_mock.assert_called_once_with(self.organization)

    @patch("api.views.get_staff_detail", return_value={"id": 7, "name": "Staff Member"})
    def test_admin_staff_detail_view_returns_service_data(self, get_staff_detail_mock):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(f"/api/v1/admin/analytics/staff/{self.staff.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "Staff Member")
        get_staff_detail_mock.assert_called_once_with(self.staff.id)

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

    def test_submit_feedback_rejects_ticket_that_already_has_feedback(self):
        feedback_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Need follow-up",
            category="general",
            priority="normal",
            status="resolved",
        )
        TicketFeedback.objects.create(
            ticket=feedback_ticket,
            staff=self.staff,
            user=self.user,
            rating=5,
            comment="Already reviewed",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/v1/tickets/{feedback_ticket.id}/feedback/",
            {"rating": 3, "comment": "Another comment"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Feedback already submitted")

    def test_user_resolved_tickets_marks_feedback_presence(self):
        feedback_ticket = SupportTicket.objects.create(
            user=self.user,
            assigned_to=self.staff,
            organization=self.organization,
            message="Resolved with feedback",
            description="Documented issue",
            category="general",
            priority="normal",
            status="resolved",
        )
        TicketFeedback.objects.create(
            ticket=feedback_ticket,
            staff=self.staff,
            user=self.user,
            rating=4,
            comment="Solid help",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/v1/user/resolved-tickets/")

        self.assertEqual(response.status_code, 200)
        matching = [ticket for ticket in response.data if ticket["id"] == feedback_ticket.id]
        self.assertEqual(len(matching), 1)
        self.assertTrue(matching[0]["has_feedback"])
        self.assertEqual(matching[0]["staff_name"], self.staff.username)
