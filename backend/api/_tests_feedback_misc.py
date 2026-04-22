from custSupApp.models import ChatMessage, SupportTicket, TicketFeedback
from custSupApp.views import ChatMessageView, UserView

from ._tests_shared import ApiViewBaseTestCase, User

FEED_URL="/api/v1/user/resolved-tickets/"

class FeedbackAndMiscViewTests(ApiViewBaseTestCase):
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
            user=self.user, assigned_to=None, organization=self.organization, message="General question",
            description="Need account info", category="general", priority="low", status="resolved",
            resolution_note="Shared help article", resolved_at=self.resolved_ticket.resolved_at,
        )
        resolved_response = self.client.get(FEED_URL)
        self.assertEqual(len(resolved_response.data), 1)
        self.assertEqual(resolved_response.data[0]["id"], another_resolved.id)
        self.assertEqual(resolved_response.data[0]["staff_name"], "Unknown")
        self.assertFalse(resolved_response.data[0]["has_feedback"])

    def test_submit_feedback_rejects_ticket_that_already_has_feedback(self):
        feedback_ticket = SupportTicket.objects.create(
            user=self.user, assigned_to=self.staff, organization=self.organization,
            message="Need follow-up", category="general", priority="normal", status="resolved",
        )
        TicketFeedback.objects.create(ticket=feedback_ticket, staff=self.staff, user=self.user, rating=5, comment="Already reviewed")
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
            user=self.user, assigned_to=self.staff, organization=self.organization, message="Resolved with feedback",
            description="Documented issue", category="general", priority="normal", status="resolved",
        )
        TicketFeedback.objects.create(ticket=feedback_ticket, staff=self.staff, user=self.user, rating=4, comment="Solid help")
        self.client.force_authenticate(user=self.user)
        response = self.client.get(FEED_URL)
        matching = [ticket for ticket in response.data if ticket["id"] == feedback_ticket.id]
        self.assertEqual(len(matching), 1)
        self.assertTrue(matching[0]["has_feedback"])
        self.assertEqual(matching[0]["staff_name"], self.staff.username)

    def test_user_resolved_tickets_falls_back_to_message_and_default_resolution_text(self):
        fallback_ticket = SupportTicket.objects.create(
            user=self.user, assigned_to=None, organization=self.organization, message="Fallback summary",
            description="", category="general", priority="low", status="resolved", resolution_note="",
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(FEED_URL)
        matching = [ticket for ticket in response.data if ticket["id"] == fallback_ticket.id]
        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]["query"], "Fallback summary")
        self.assertEqual(matching[0]["resolution_note"], "None")
        self.assertEqual(matching[0]["staff_name"], "Unknown")

    def test_submit_feedback_rejects_non_resolved_ticket(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(
            self.client.post(
                f"/api/v1/tickets/{self.open_ticket.id}/feedback/",
                {"rating": 2, "comment": "Still open"},
                format="json",
            ).status_code,
            404,
        )

    def test_custsupapp_viewsets_expose_expected_querysets_and_serializers(self):
        user_view = UserView()
        chat_view = ChatMessageView()
        self.assertEqual(user_view.serializer_class.__name__, "UserSerializer")
        self.assertEqual(chat_view.serializer_class.__name__, "ChatMessageSerializer")
        self.assertEqual(user_view.queryset.model, User)
        self.assertEqual(chat_view.queryset.model, ChatMessage)
