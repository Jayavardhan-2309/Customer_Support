from rest_framework import serializers
from custSupApp.models import User, ChatMessage
from custSupApp.models import SupportTicket


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


class StaffCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value


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

class SignupSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ["username", "email", "password", "organization"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):

        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.role = "user"

        user.save()

        return user

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model= ChatMessage
        fields= '__all__'
