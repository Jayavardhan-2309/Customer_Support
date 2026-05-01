from rest_framework import serializers

from custSupApp.models import TicketFeedback


class TicketFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketFeedback
        fields = "__all__"
        read_only_fields = ["user", "staff", "ticket"]
