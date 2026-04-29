"""
Tests for serializers and model serialization.
"""
from rest_framework.test import APITestCase
from rest_framework import status
from custSupApp.models import User, Organization, ChatMessage, TicketFeedback, SupportTicket
from custSupApp.serializers import (
    UserSerializer,
    ChatMessageSerializer,
    AdminSignupSerializer,
    TicketFeedbackSerializer
)
# Test credentials - used only for unit testing
TEST_VALUE_1 = "testjay123"
TEST_VALUE_2 = "newjay123"
TEST_VALUE_3 = "securejay123"
TEST_VALUE_4 = "jay123"
class UserSerializerTests(APITestCase):
    """Test UserSerializer."""
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org")
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password=TEST_VALUE_1,
            role="staff",
            organization=self.org
        )
    def test_serialize_user(self):
        """Test serializing a user instance."""
        serializer = UserSerializer(self.user)
        data = serializer.data
        self.assertEqual(data['username'], 'testuser')
        self.assertEqual(data['email'], 'test@test.com')
        self.assertEqual(data['role'], 'staff')
    def test_deserialize_user_data(self):
        """Test deserializing user data."""
        user_data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': TEST_VALUE_2,
            'role': 'user',
            'organization': self.org.id
        }
        serializer = UserSerializer(data=user_data)
        self.assertTrue(serializer.is_valid())
    def test_user_serializer_includes_all_fields(self):
        """Test that serializer includes all model fields."""
        serializer = UserSerializer(self.user)
        expected_fields = {'id', 'username', 'email', 'role', 'organization'}
        serialized_fields = set(serializer.data.keys())
        for field in expected_fields:
            self.assertIn(field, serialized_fields)
class ChatMessageSerializerTests(APITestCase):
    """Test ChatMessageSerializer."""
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org")
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password=TEST_VALUE_1,
            organization=self.org
        )
        self.message = ChatMessage.objects.create(
            user=self.user,
            sender='user',
            message='Test message'
        )
    def test_serialize_chat_message(self):
        """Test serializing a chat message."""
        serializer = ChatMessageSerializer(self.message)
        data = serializer.data
        self.assertEqual(data['sender'], 'user')
        self.assertEqual(data['message'], 'Test message')
        self.assertEqual(data['user'], self.user.id)
    def test_deserialize_chat_message(self):
        """Test deserializing chat message data."""
        message_data = {
            'user': self.user.id,
            'sender': 'ai',
            'message': 'AI response'
        }
        serializer = ChatMessageSerializer(data=message_data)
        self.assertTrue(serializer.is_valid())
    def test_chat_message_timestamp_included(self):
        """Test that created_at timestamp is included."""
        serializer = ChatMessageSerializer(self.message)
        self.assertIn('created_at', serializer.data)
class AdminSignupSerializerTests(APITestCase):
    """Test AdminSignupSerializer."""
    def test_create_admin_with_organization(self):
        """Test creating an admin user with a new organization."""
        signup_data = {
            'username': 'newadmin',
            'email': 'admin@test.com',
            'password': TEST_VALUE_3,
            'organization_name': 'New Company'
        }
        serializer = AdminSignupSerializer(data=signup_data)
        self.assertTrue(serializer.is_valid())
        user = serializer.save()
        self.assertEqual(user.username, 'newadmin')
        self.assertEqual(user.email, 'admin@test.com')
        self.assertEqual(user.role, 'admin')
        self.assertEqual(user.organization.name, 'New Company')
    def test_password_not_returned_in_response(self):
        """Test that password is write-only and not in response."""
        signup_data = {
            'username': 'newadmin',
            'email': 'admin@test.com',
            'password': TEST_VALUE_3,
            'organization_name': 'New Company'
        }
        serializer = AdminSignupSerializer(data=signup_data)
        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.assertNotIn('password', serializer.data)
    def test_organization_name_is_write_only(self):
        """Test that organization_name is write-only."""
        signup_data = {
            'username': 'newadmin',
            'email': 'admin@test.com',
            'password': TEST_VALUE_3,
            'organization_name': 'New Company'
        }
        serializer = AdminSignupSerializer(data=signup_data)
        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.assertNotIn('organization_name', serializer.data)
class TicketFeedbackSerializerTests(APITestCase):
    """Test TicketFeedbackSerializer."""
    def setUp(self):
        self.org = Organization.objects.create(name="Test Org")
        self.user = User.objects.create_user(
            username="user1",
            email="user@test.com",
            password=TEST_VALUE_4,
            organization=self.org
        )
        self.staff = User.objects.create_user(
            username="staff1",
            email="staff@test.com",
            password=TEST_VALUE_4,
            role="staff",
            organization=self.org
        )
        self.ticket = SupportTicket.objects.create(
            user=self.user,
            organization=self.org,
            message="Test ticket",
            status="resolved",
            assigned_to=self.staff
        )
        self.feedback = TicketFeedback.objects.create(
            user=self.user,
            staff=self.staff,
            ticket=self.ticket,
            rating=5,
            comment="Great service"
        )
    def test_serialize_ticket_feedback(self):
        serializer = TicketFeedbackSerializer(self.feedback)
        data = serializer.data
        self.assertEqual(data['rating'], 5)
        self.assertEqual(data['comment'], 'Great service')
    def test_read_only_fields_not_writable(self):
        feedback_data = {
            'rating': 4,
            'comment': 'Good service',
            'user': 999,
            'staff': 999,
            'ticket': 999
        }
        serializer = TicketFeedbackSerializer(data=feedback_data)
        self.assertTrue(serializer.is_valid())
        self.assertTrue(serializer.fields['user'].read_only)
        self.assertTrue(serializer.fields['staff'].read_only)
        self.assertTrue(serializer.fields['ticket'].read_only)
