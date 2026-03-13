from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from .models import User, ChatMessage
from .serializers import UserSerializer, ChatMessageSerializer, SignupSerializer
# Create your views here.

class UserView(ModelViewSet):
    queryset= User.objects.all()
    serializer_class= UserSerializer


class ChatMessageView(ModelViewSet):
    queryset= ChatMessage.objects.all()
    serializer_class= ChatMessageSerializer

