from rest_framework import serializers

from custSupApp.models import SupportTicket


class SupportTicketListSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source="user.username", read_only=True)
    customer_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "message",
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
            "message",
            "status",
            "customer",
            "customer_email",
            "created_at",
            "resolved_at",
            "resolution_note",
        ]
