from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone

from api.models import Sample
from api.views import get_escalation_count_today

from ._tests_shared import ApiViewBaseTestCase, DEFAULT_SECRET, SECRET_FIELD, User, create_test_user


class ApiGeneralViewTests(ApiViewBaseTestCase):
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
        self.assertEqual(self.client.post("/").status_code, 405)

    def test_sample_view_can_create_and_list_samples(self):
        self.client.force_authenticate(user=self.user)
        create_response = self.client.post(
            "/api/v1/samples/",
            {"text": "hello sample", "s_id": "sample-123"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertTrue(Sample.objects.filter(s_id="sample-123").exists())
        self.assertEqual(self.client.get("/api/v1/samples/").data[0]["text"], "hello sample")

    def test_get_escalation_count_today_counts_recent_tickets_only(self):
        old_ticket = self.open_ticket.__class__.objects.create(
            user=self.user, organization=self.organization, message="Old issue"
        )
        self.open_ticket.__class__.objects.filter(id=old_ticket.id).update(created_at=timezone.now() - timedelta(days=2))
        self.assertEqual(get_escalation_count_today(self.user), 2)

    def test_login_logout_and_me_views(self):
        response = self.client.post("/api/v1/login/", {"username": self.user.username, SECRET_FIELD: DEFAULT_SECRET}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], "user")
        self.assertIn("access", response.cookies)
        self.assertIn("refresh", response.cookies)
        self.assertEqual(
            self.client.post("/api/v1/login/", {"username": self.user.username, SECRET_FIELD: "wrong"}, format="json").status_code,
            401,
        )
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get("/api/v1/me/").data["organization_name"], self.organization.name)
        self.assertEqual(self.client.post("/api/v1/logout/").data["message"], "Logged out")

    def test_signup_and_admin_signup_endpoints_create_accounts(self):
        signup_response = self.client.post("/api/v1/signup/", {
            "username": "fresh-user",
            "email": "fresh@example.com",
            SECRET_FIELD: DEFAULT_SECRET,
            "organization": self.organization.id,
        }, format="json")
        self.assertEqual(signup_response.status_code, 201)
        self.assertEqual(User.objects.get(username="fresh-user").organization, self.organization)
        admin_signup_response = self.client.post("/api/v1/admin-signup/", {
            "username": "fresh-admin",
            "email": "fresh-admin@example.com",
            SECRET_FIELD: DEFAULT_SECRET,
            "organization_name": "Brand New Org",
        }, format="json")
        self.assertEqual(admin_signup_response.status_code, 201)
        self.assertEqual(User.objects.get(username="fresh-admin").organization.name, "Brand New Org")

    def test_me_view_returns_none_for_users_without_organization(self):
        orgless_user = create_test_user(
            username=f"orgless-{self.test_id}",
            email=f"orgless-{self.test_id}@example.com",
        )
        self.client.force_authenticate(user=orgless_user)
        self.assertIsNone(self.client.get("/api/v1/me/").data["organization_name"])

    def test_chat_history_and_organization_list_views(self):
        self.client.force_authenticate(user=self.user)
        history_response = self.client.get("/api/v1/chat/history/")
        self.assertEqual(history_response.status_code, 200)
        self.assertEqual(len(history_response.data), 2)
        self.assertEqual(history_response.data[0]["sender"], "user")
        self.client.force_authenticate(user=None)
        orgs_response = self.client.get("/api/v1/organizations/")
        self.assertEqual([org["name"] for org in orgs_response.data], [self.organization.name, self.other_organization.name])

    @patch("api.view_feedback.Organization.objects")
    def test_organization_list_handles_errors(self, organization_objects):
        organization_objects.all.side_effect = RuntimeError("db down")
        response = self.client.get("/api/v1/organizations/")
        self.assertEqual(response.status_code, 500)
        self.assertIn("db down", response.data["error"])
