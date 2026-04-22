from django.contrib.auth import authenticate
from rest_framework.mixins import CreateModelMixin
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet, ModelViewSet
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import Sample
from api.serializers import ChatMessageSerializer, SampleSerializer, SignupSerializer
from custSupApp.authentication import CookieJWTAuthentication
from custSupApp.models import ChatMessage, User
from custSupApp.serializers import AdminSignupSerializer


class SampleView(ModelViewSet):
    queryset = Sample.objects.all()
    serializer_class = SampleSerializer


class SignupView(CreateModelMixin, GenericViewSet):
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]


class AdminSignupView(CreateModelMixin, GenericViewSet):
    queryset = User.objects.all()
    serializer_class = AdminSignupSerializer
    permission_classes = [AllowAny]


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials"}, status=401)

        refresh = RefreshToken.for_user(user)
        response = Response({
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            },
        })
        response.set_cookie(
            key="access", value=str(refresh.access_token),
            httponly=True, secure=True, samesite="Lax", path="/", max_age=60 * 500,
        )
        response.set_cookie(
            key="refresh", value=str(refresh),
            httponly=True, secure=True, samesite="Lax", path="/", max_age=60 * 60 * 24,
        )
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"message": "Logged out"})
        response.delete_cookie("access")
        response.delete_cookie("refresh")
        return response


class MeView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "organization_name": user.organization.name if user.organization else None,
        })


class ChatHistoryView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        messages = ChatMessage.objects.filter(user=request.user).order_by("created_at")
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)
