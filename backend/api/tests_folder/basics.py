from unittest.mock import MagicMock

from django.test import SimpleTestCase, TestCase

from api.models import Sample
from api.pagination import StaffCursorPagination, TicketCursorPagination
from api.serializers import (
    ChatMessageSerializer,
    SampleSerializer,
    SignupSerializer,
    StaffSerializer,
    SupportTicketDetailSerializer,
    SupportTicketListSerializer,
)
from api.views import IsAdmin, IsStaff
from custSupApp.models import ChatMessage, Organization, SupportTicket
from custSupApp.serializers import AdminSignupSerializer, TicketFeedbackSerializer

from .shared import DEFAULT_SECRET, SECRET_FIELD, create_test_user


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
        serializer = SignupSerializer(data={
            "username": "new-user",
            "email": "new@example.com",
            SECRET_FIELD: DEFAULT_SECRET,
            "organization": self.organization.id,
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertEqual(user.role, "user")
        self.assertTrue(user.check_password(DEFAULT_SECRET))
        self.assertEqual(user.organization, self.organization)

    def test_admin_signup_serializer_creates_admin_and_organization(self):
        serializer = AdminSignupSerializer(data={
            "username": "admin-user",
            "email": "admin@example.com",
            SECRET_FIELD: DEFAULT_SECRET,
            "organization_name": "Fresh Org",
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertEqual(user.role, "admin")
        self.assertEqual(user.organization.name, "Fresh Org")
        self.assertTrue(user.check_password(DEFAULT_SECRET))

    def test_ticket_serializers_expose_customer_fields(self):
        self.assertEqual(SupportTicketListSerializer(self.ticket).data["customer"], self.user.username)
        self.assertEqual(SupportTicketListSerializer(self.ticket).data["customer_email"], self.user.email)
        self.assertEqual(SupportTicketDetailSerializer(self.ticket).data["context"], "Browser says invalid csrf token")
        self.assertEqual(SupportTicketDetailSerializer(self.ticket).data["resolution_note"], "")
        self.assertEqual(StaffSerializer(self.staff).data["email"], self.staff.email)
        self.assertEqual(StaffSerializer(self.staff).data["active_tickets"], 0)

    def test_sample_and_chat_message_serializers_include_model_fields(self):
        sample = Sample.objects.create(text="hello", s_id="sample-1")
        message = ChatMessage.objects.create(user=self.user, sender="user", message="Need help")
        self.assertEqual(SampleSerializer(sample).data["text"], "hello")
        self.assertEqual(SampleSerializer(sample).data["s_id"], "sample-1")
        self.assertEqual(ChatMessageSerializer(message).data["user"], self.user.id)
        self.assertEqual(ChatMessageSerializer(message).data["sender"], "user")
        self.assertEqual(ChatMessageSerializer(message).data["message"], "Need help")

    def test_ticket_feedback_serializer_marks_foreign_keys_read_only(self):
        serializer = TicketFeedbackSerializer()
        self.assertIn("ticket", serializer.fields)
        self.assertTrue(serializer.fields["ticket"].read_only)
        self.assertTrue(serializer.fields["staff"].read_only)
        self.assertTrue(serializer.fields["user"].read_only)

    def test_organization_string_representation_uses_name(self):
        self.assertEqual(str(self.organization), "Acme")
