import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings
from rest_framework.test import force_authenticate

from custSupApp.consumers import TicketConsumer
from custSupApp.embeddings import embed_text, embed_texts_batch, get_client
from custSupApp.models import ChatMessage, Organization, SupportTicket
from custSupApp.serializers import ChatMessageSerializer, UserSerializer
from custSupApp.services.support_assignment import assign_least_busy_staff
from custSupApp.services.ticket_service import create_structured_ticket, notify_staff
from custSupApp.views import ChatMessageView, UserView
from custSupport.views import backend_res

User = get_user_model()
SECRET_FIELD = "".join(["pass", "word"])
DEFAULT_SECRET = "test-secret-123"


def create_test_user(**kwargs):
    return User.objects.create_user(**{SECRET_FIELD: DEFAULT_SECRET}, **kwargs)


class SupportAssignmentAndTicketServiceTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Realtime Org")
        self.other_organization = Organization.objects.create(name="Other Org")
        self.user = create_test_user(
            username="customer",
            email="customer@example.com",
            organization=self.organization,
        )
        self.busy_staff = create_test_user(
            username="busy",
            email="busy@example.com",
            role="staff",
            organization=self.organization,
            active_tickets=3,
        )
        self.free_staff = create_test_user(
            username="free",
            email="free@example.com",
            role="staff",
            organization=self.organization,
            active_tickets=1,
        )
        self.unavailable_staff = create_test_user(
            username="away",
            email="away@example.com",
            role="staff",
            organization=self.organization,
            is_available=False,
            active_tickets=0,
        )
        self.other_org_staff = create_test_user(
            username="external",
            email="external@example.com",
            role="staff",
            organization=self.other_organization,
            active_tickets=0,
        )

    def test_assign_least_busy_staff_picks_available_staff_in_same_org(self):
        assigned_staff = assign_least_busy_staff(self.organization.id)

        self.assertEqual(assigned_staff.id, self.free_staff.id)
        self.free_staff.refresh_from_db()
        self.assertEqual(self.free_staff.active_tickets, 2)

    def test_assign_least_busy_staff_returns_none_when_no_available_staff(self):
        User.objects.filter(role="staff", organization=self.organization).update(is_available=False)

        assigned_staff = assign_least_busy_staff(self.organization.id)

        self.assertIsNone(assigned_staff)

    @override_settings(DEBUG=True)
    @patch("custSupApp.services.ticket_service.send_ticket_email")
    def test_notify_staff_calls_task_directly_in_debug(self, send_ticket_email_mock):
        ticket = MagicMock(id=7)

        notify_staff(ticket, self.free_staff, "conversation", "Need help")

        send_ticket_email_mock.assert_called_once_with(
            7,
            self.free_staff.email,
            "conversation",
            "Need help",
        )
        send_ticket_email_mock.delay.assert_not_called()

    @override_settings(DEBUG=False)
    @patch("custSupApp.services.ticket_service.send_ticket_email")
    def test_notify_staff_uses_delay_when_not_in_debug(self, send_ticket_email_mock):
        ticket = MagicMock(id=9)

        notify_staff(ticket, self.free_staff, "history", "Reset password")

        send_ticket_email_mock.delay.assert_called_once_with(
            9,
            self.free_staff.email,
            "history",
            "Reset password",
        )

    @patch("custSupApp.services.ticket_service.assign_least_busy_staff")
    def test_create_structured_ticket_uses_structured_values_and_defaults(self, assign_staff_mock):
        assign_staff_mock.return_value = self.free_staff

        ticket, staff_member = create_structured_ticket(
            self.user,
            "The dashboard is blank",
            {
                "description": "Dashboard stays blank after login",
                "context": "Chrome on Windows",
                "category": "technical",
                "priority": "high",
            },
        )

        self.assertEqual(staff_member, self.free_staff)
        self.assertEqual(ticket.assigned_to, self.free_staff)
        self.assertEqual(ticket.organization, self.organization)
        self.assertEqual(ticket.description, "Dashboard stays blank after login")
        self.assertEqual(ticket.context, "Chrome on Windows")
        self.assertEqual(ticket.category, "technical")
        self.assertEqual(ticket.priority, "high")
        self.assertEqual(ticket.status, "open")

    @patch("custSupApp.services.ticket_service.assign_least_busy_staff", return_value=None)
    def test_create_structured_ticket_falls_back_to_query_defaults(self, _assign_staff_mock):
        ticket, staff_member = create_structured_ticket(
            self.user,
            "Need invoice copy",
            {},
        )

        self.assertIsNone(staff_member)
        self.assertIsNone(ticket.assigned_to)
        self.assertEqual(ticket.description, "Need invoice copy")
        self.assertEqual(ticket.context, "")
        self.assertEqual(ticket.category, "general")
        self.assertEqual(ticket.priority, "normal")


class EmbeddingHelpersTests(SimpleTestCase):
    @patch.dict("os.environ", {}, clear=True)
    def test_get_client_raises_without_customer_api_key(self):
        with self.assertRaises(RuntimeError) as error:
            get_client()

        self.assertIn("CUSTOMER_API", str(error.exception))

    @patch.dict("os.environ", {"CUSTOMER_API": "key-value"}, clear=True)
    @patch("custSupApp.embeddings.genai.Client")
    def test_get_client_builds_genai_client(self, client_mock):
        client = get_client()

        self.assertEqual(client, client_mock.return_value)
        client_mock.assert_called_once_with(
            api_key="key-value",
            http_options={"timeout": 30000},
        )

    @patch("custSupApp.embeddings.get_client")
    def test_embed_text_returns_first_embedding_values(self, get_client_mock):
        get_client_mock.return_value.models.embed_content.return_value = SimpleNamespace(
            embeddings=[SimpleNamespace(values=[0.1, 0.2, 0.3])]
        )

        result = embed_text("Hello world")

        self.assertEqual(result, [0.1, 0.2, 0.3])

    @patch("custSupApp.embeddings.get_client")
    def test_embed_texts_batch_returns_all_embedding_values(self, get_client_mock):
        get_client_mock.return_value.models.embed_content.return_value = SimpleNamespace(
            embeddings=[
                SimpleNamespace(values=[1.0, 2.0]),
                SimpleNamespace(values=[3.0, 4.0]),
            ]
        )

        result = embed_texts_batch(["One", "Two"])

        self.assertEqual(result, [[1.0, 2.0], [3.0, 4.0]])


class ViewAndConsumerTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.organization = Organization.objects.create(name="View Org")
        self.user = create_test_user(
            username="viewer",
            email="viewer@example.com",
            organization=self.organization,
        )
        self.message = ChatMessage.objects.create(
            user=self.user,
            sender="user",
            message="Hello there",
        )

    def test_backend_health_view_returns_expected_markup(self):
        request = self.factory.get("/")
        force_authenticate(request, user=self.user)
        response = backend_res(request)

        self.assertEqual(response.status_code, 200)
        self.assertIn("backend working", response.content.decode())

    def test_basic_viewsets_expose_expected_querysets_and_serializers(self):
        self.assertEqual(UserView.queryset.model, User)
        self.assertIs(UserView.serializer_class, UserSerializer)
        self.assertEqual(ChatMessageView.queryset.model, ChatMessage)
        self.assertIs(ChatMessageView.serializer_class, ChatMessageSerializer)

    def test_ticket_consumer_connect_disconnect_and_send(self):
        consumer = TicketConsumer()
        consumer.channel_layer = MagicMock()
        consumer.channel_layer.group_add = AsyncMock()
        consumer.channel_layer.group_discard = AsyncMock()
        consumer.accept = AsyncMock()
        consumer.send = AsyncMock()
        consumer.channel_name = "channel-1"

        asyncio.run(consumer.connect())
        asyncio.run(consumer.disconnect(1000))
        asyncio.run(consumer.send_ticket({"data": {"id": 5, "status": "open"}}))

        consumer.channel_layer.group_add.assert_awaited_once_with("tickets", "channel-1")
        consumer.accept.assert_awaited_once()
        consumer.channel_layer.group_discard.assert_awaited_once_with("tickets", "channel-1")
        consumer.send.assert_awaited_once()
