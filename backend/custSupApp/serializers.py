from rest_framework import serializers
from .models import User, ChatMessage, Organization, TicketFeedback
from django.contrib.auth.hashers import make_password

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model= User
        fields= '__all__'

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model= ChatMessage
        fields= '__all__'

class AdminSignupSerializer(serializers.ModelSerializer):

    organization_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "organization_name"]
        extra_kwargs = {
            "password": {"write_only": True}
        }

    def create(self, validated_data):
        org_name = validated_data.pop("organization_name")

        organization = Organization.objects.create(name=org_name)

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role="admin",
            organization=organization
        )

        return user
    
class TicketFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketFeedback
        fields = "__all__"
        read_only_fields = ["user", "staff", "ticket"]
