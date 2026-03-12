from rest_framework import serializers
from .models import Sample
from rest_framework import serializers
from custSupApp.models import User, ChatMessage
from custSupApp.models import SupportTicket
from custSupApp.models import User


class StaffSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_available",
            "active_tickets"
        ]

class SupportTicketListSerializer(serializers.ModelSerializer):

    customer = serializers.CharField(source="user.username", read_only=True)
    customer_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "message", # descriptoin removes this in structured tickets
            "category",
            "priority",
            "description",
            "status",
            "customer",
            "customer_email",
            "created_at",
            "resolved_at",
        ]


class SupportTicketDetailSerializer(serializers.ModelSerializer):

    customer = serializers.CharField(source="user.username", read_only=True)
    customer_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "category",
            "priority",
            "description",
            "context",
            "message", # description replaces the message
            "status",
            "customer",
            "customer_email",
            "created_at",
            "resolved_at",
            "resolution_note",
        ]

class SampleSerializer(serializers.ModelSerializer):
    class Meta:
        model= Sample
        fields= '__all__'



class SignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True} # this ensures that the password is written to the db but not returned to frontend as json res
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model= ChatMessage
        fields= '__all__'
