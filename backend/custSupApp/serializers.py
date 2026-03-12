from rest_framework import serializers
from .models import User, ChatMessage
from django.contrib.auth.hashers import make_password

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model= User
        fields= '__all__'

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model= ChatMessage
        fields= '__all__'
