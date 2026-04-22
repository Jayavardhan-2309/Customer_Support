from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.utils import timezone

from custSupApp.models import ChatMessage

from ._tests_shared import ApiViewBaseTestCase, DEFAULT_SECRET, SECRET_FIELD


class StaffViewTests(ApiViewBaseTestCase):
    def test_staff_management_endpoints(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get("/api/v1/admin/staff/").data["results"][0]["username"], self.staff.username)
        invalid_create = self.client.post("/api/v1/admin/staff/", {"username": "", "email": "", SECRET_FIELD: ""}, format="json")
        self.assertEqual(invalid_create.status_code, 400)
        create_response = self.client.post("/api/v1/admin/staff/", {"username": "helper", "email": "helper@example.com", SECRET_FIELD: DEFAULT_SECRET}, format="json")
        self.assertEqual(create_response.status_code, 201)
        created_staff_id = create_response.data["id"]
        duplicate_username = self.client.post("/api/v1/admin/staff/", {"username": "helper", "email": "new@example.com", SECRET_FIELD: DEFAULT_SECRET}, format="json")
        self.assertEqual(duplicate_username.status_code, 400)
        duplicate_email = self.client.post("/api/v1/admin/staff/", {"username": "helper-two", "email": "helper@example.com", SECRET_FIELD: DEFAULT_SECRET}, format="json")
        self.assertEqual(duplicate_email.status_code, 400)
        self.assertEqual(self.client.patch(f"/api/v1/admin/staff/{self.staff.id}/toggle/", format="json").status_code, 200)
        self.staff.refresh_from_db()
        self.assertFalse(self.staff.is_available)
        self.assertEqual(self.client.patch("/api/v1/admin/staff/9999/toggle/", format="json").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/v1/admin/staff/{created_staff_id}/").status_code, 200)
        self.assertEqual(self.client.delete("/api/v1/admin/staff/9999/").status_code, 404)

    @patch("api.view_staff.async_to_sync")
    @patch("api.view_staff.get_channel_layer")
    def test_staff_ticket_endpoints(self, get_channel_layer_mock, async_to_sync_mock):
        sender_mock = MagicMock()
        channel_layer_mock = MagicMock(group_send=MagicMock())
        get_channel_layer_mock.return_value = channel_layer_mock
        async_to_sync_mock.side_effect = lambda fn: sender_mock
        self.client.force_authenticate(user=self.staff)
        self.assertEqual(self.client.get("/api/v1/staff/tickets/").data["results"][0]["id"], self.open_ticket.id)
        self.assertEqual(self.client.get(f"/api/v1/staff/tickets/{self.open_ticket.id}/").data["customer"], self.user.username)
        self.assertEqual(self.client.patch(f"/api/v1/staff/tickets/{self.open_ticket.id}/start/", format="json").status_code, 200)
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
        self.assertEqual(self.client.get(f"/api/v1/staff/tickets/{self.open_ticket.id}/messages/").data, [])

    def test_staff_ticket_detail_rejects_tickets_assigned_to_other_staff(self):
        self.client.force_authenticate(user=self.other_staff)
        self.assertEqual(self.client.get(f"/api/v1/staff/tickets/{self.open_ticket.id}/").status_code, 404)

    def test_staff_ticket_messages_returns_only_recent_messages_before_ticket_creation(self):
        ticket = self.open_ticket.__class__.objects.create(
            user=self.user, assigned_to=self.staff, organization=self.organization, message="Need timeline",
            description="Collect related chat messages", category="general", priority="normal", status="open",
        )
        ticket_created_at = timezone.now()
        self.open_ticket.__class__.objects.filter(id=ticket.id).update(created_at=ticket_created_at)
        ChatMessage.objects.filter(user=self.user).update(created_at=ticket_created_at - timedelta(minutes=20))
        included_message = ChatMessage.objects.create(user=self.user, sender="user", message="Recent issue detail")
        old_message = ChatMessage.objects.create(user=self.user, sender="ai", message="Too old to include")
        future_message = ChatMessage.objects.create(user=self.user, sender="user", message="Sent after escalation")
        ChatMessage.objects.filter(id=included_message.id).update(created_at=ticket_created_at - timedelta(minutes=5))
        ChatMessage.objects.filter(id=old_message.id).update(created_at=ticket_created_at - timedelta(minutes=16))
        ChatMessage.objects.filter(id=future_message.id).update(created_at=ticket_created_at + timedelta(minutes=1))
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(f"/api/v1/staff/tickets/{ticket.id}/messages/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["sender"], "user")
        self.assertEqual(response.data[0]["message"], "Recent issue detail")

    @patch("api.view_admin.StaffViewSet.paginate_queryset", return_value=None)
    def test_staff_list_returns_plain_serializer_data_when_pagination_not_applied(self, _paginate_mock):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/admin/staff/")
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["username"], self.staff.username)

    @patch("api.view_staff.StaffTicketViewSet.paginate_queryset", return_value=None)
    def test_staff_ticket_list_returns_plain_serializer_data_when_pagination_not_applied(self, _paginate_mock):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/v1/staff/tickets/")
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], self.open_ticket.id)

    @patch("api.view_staff.get_staff_analytics", return_value={"resolved": 4})
    def test_staff_analytics_view_returns_service_data(self, get_staff_analytics_mock):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/v1/staff/analytics/")
        self.assertEqual(response.data["resolved"], 4)
        get_staff_analytics_mock.assert_called_once_with(self.staff)
