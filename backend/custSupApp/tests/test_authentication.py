from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError

from custSupApp.authentication import CookieJWTAuthentication


class CookieJwtAuthenticationTests(SimpleTestCase):
    def setUp(self):
        self.authentication = CookieJWTAuthentication()
        self.request = MagicMock()

    def test_returns_none_when_access_cookie_is_missing(self):
        self.request.COOKIES.get.return_value = None

        result = self.authentication.authenticate(self.request)

        self.assertIsNone(result)

    def test_returns_user_and_token_when_cookie_is_valid(self):
        self.request.COOKIES.get.return_value = "token-value"

        with patch.object(self.authentication, "get_validated_token", return_value="validated-token") as validate_mock:
            with patch.object(self.authentication, "get_user", return_value="user-object") as user_mock:
                result = self.authentication.authenticate(self.request)

        self.assertEqual(result, ("user-object", "validated-token"))
        validate_mock.assert_called_once_with("token-value")
        user_mock.assert_called_once_with("validated-token")

    def test_raises_authentication_failed_for_invalid_token(self):
        self.request.COOKIES.get.return_value = "bad-token"

        with patch.object(self.authentication, "get_validated_token", side_effect=TokenError("expired")):
            with self.assertRaises(AuthenticationFailed) as error:
                self.authentication.authenticate(self.request)

        self.assertEqual(str(error.exception), "Invalid or expired token")
