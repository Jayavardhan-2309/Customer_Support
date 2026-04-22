from unittest.mock import MagicMock, patch

from custSupApp.models import ChatMessage, SupportTicket

from ._tests_shared import ApiViewBaseTestCase

SUPPORT_URL="/api/v1/support-ai/"

class SupportAIViewTests(ApiViewBaseTestCase):
    def test_support_ai_requires_prompt(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(SUPPORT_URL, {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Prompt is required")

    @patch("api.view_support.get_escalation_count_today", return_value=0)
    @patch("api.view_support.get_ai_response", return_value=("general", "Helpful answer", 0.91, False))
    def test_support_ai_returns_reply_and_persists_messages(self, get_ai_response_mock, _count_mock):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(SUPPORT_URL, {"prompt": "How do I reset my password?"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["intent"], "general")
        self.assertEqual(response.data["reply"], "Helpful answer")
        self.assertEqual(response.data["escalations_remaining"], 3)
        self.assertEqual(get_ai_response_mock.call_args.kwargs["history"], [
            {"role": "user", "content": "First message"},
            {"role": "ai", "content": "Reply message"},
        ])
        self.assertEqual(list(ChatMessage.objects.filter(user=self.user).values_list("sender", "message")), [
            ("user", "First message"),
            ("ai", "Reply message"),
            ("user", "How do I reset my password?"),
            ("ai", "Helpful answer"),
        ])

    @patch("api.view_support.get_escalation_count_today", return_value=0)
    @patch("api.view_support.get_ai_response", side_effect=RuntimeError("backend offline"))
    def test_support_ai_returns_safe_error_when_backend_fails(self, _get_ai_response_mock, _count_mock):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(SUPPORT_URL, {"prompt": "Please help"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["intent"], "error")
        self.assertEqual(response.data["reply"], "Sorry, something went wrong. Please try again.")
        self.assertEqual(ChatMessage.objects.filter(user=self.user).count(), 3)
        self.assertEqual(ChatMessage.objects.filter(user=self.user).order_by("-created_at").first().sender, "user")

    @patch("api.view_support.logger.warning")
    @patch("api.view_support.send_ticket_email.delay")
    @patch("api.view_support.async_to_sync")
    @patch("api.view_support.get_channel_layer")
    @patch("api.view_support.create_structured_ticket")
    @patch("api.view_support.extract_ticket_structure_smart", return_value={"priority": "normal"})
    @patch("api.view_support.get_ai_response", return_value=("billing", "Escalating now", 0.3, True))
    @patch("api.view_support.get_escalation_count_today", return_value=2)
    def test_support_ai_escalation_without_staff_skips_email(self, _count_mock, _get_ai_response_mock, _extract_ticket_mock, create_ticket_mock, get_channel_layer_mock, async_to_sync_mock, send_ticket_email_mock, logger_warning_mock):
        escalated_ticket = SupportTicket.objects.create(
            user=self.user, organization=self.organization, message="Escalated without staff",
            description="Escalated by AI", category="billing", priority="normal", status="open",
        )
        sender_mock = MagicMock()
        async_to_sync_mock.side_effect = lambda fn: sender_mock
        get_channel_layer_mock.return_value = MagicMock(group_send=MagicMock())
        create_ticket_mock.return_value = (escalated_ticket, None)
        self.client.force_authenticate(user=self.user)
        response = self.client.post(SUPPORT_URL, {"prompt": "Please escalate this"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["escalated"])
        self.assertEqual(response.data["escalations_remaining"], 0)
        sender_mock.assert_called_once()
        send_ticket_email_mock.assert_not_called()
        logger_warning_mock.assert_called_once()

    @patch("api.view_support.send_ticket_email.delay")
    @patch("api.view_support.async_to_sync")
    @patch("api.view_support.get_channel_layer")
    @patch("api.view_support.create_structured_ticket")
    @patch("api.view_support.extract_ticket_structure_smart", return_value={"priority": "high"})
    @patch("api.view_support.get_ai_response", return_value=("billing", "Escalating now", 0.2, True))
    @patch("api.view_support.get_escalation_count_today", return_value=1)
    def test_support_ai_escalation_creates_ticket_and_notifies_staff(self, _count_mock, _get_ai_response_mock, _extract_ticket_mock, create_ticket_mock, get_channel_layer_mock, async_to_sync_mock, send_ticket_email_mock):
        escalated_ticket = SupportTicket.objects.create(
            user=self.user, assigned_to=self.staff, organization=self.organization, message="Escalated ticket",
            description="Escalated by AI", category="billing", priority="high", status="open",
        )
        sender_mock = MagicMock()
        async_to_sync_mock.side_effect = lambda fn: sender_mock
        get_channel_layer_mock.return_value = MagicMock(group_send=MagicMock())
        create_ticket_mock.return_value = (escalated_ticket, self.staff)
        self.client.force_authenticate(user=self.user)
        response = self.client.post(SUPPORT_URL, {"prompt": "I need a real person"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["escalated"])
        self.assertEqual(response.data["escalations_remaining"], 1)
        create_ticket_mock.assert_called_once()
        sender_mock.assert_called_once()
        send_ticket_email_mock.assert_called_once()
