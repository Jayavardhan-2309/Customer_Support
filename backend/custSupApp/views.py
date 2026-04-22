from rest_framework.viewsets import ModelViewSet
from .models import User, ChatMessage
from .serializers import UserSerializer, ChatMessageSerializer

class UserView(ModelViewSet):
    queryset= User.objects.all()
    serializer_class= UserSerializer


class ChatMessageView(ModelViewSet):
    queryset= ChatMessage.objects.all()
    serializer_class= ChatMessageSerializer

