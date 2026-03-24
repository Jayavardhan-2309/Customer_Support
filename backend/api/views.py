# django
from django.contrib.auth import authenticate
from django.utils import timezone
from django.conf import settings
from django.shortcuts import get_object_or_404

# drf
from rest_framework.viewsets import ModelViewSet, GenericViewSet
from rest_framework.mixins import CreateModelMixin, ListModelMixin, DestroyModelMixin
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action

# simple jwt
from rest_framework_simplejwt.tokens import RefreshToken

# models, serializers
from .models import Sample
from .serializers import SampleSerializer, SignupSerializer, ChatMessageSerializer, SupportTicketListSerializer, SupportTicketDetailSerializer, StaffSerializer
from custSupApp.models import User, ChatMessage, UploadedPDF, SupportTicket, Organization
from custSupApp.serializers import AdminSignupSerializer
from custSupApp.models import TicketFeedback

# functions
from custSupApp.ai import get_ai_response
from custSupApp.authentication import CookieJWTAuthentication
from custSupApp.services.ticket_extraction import extract_ticket_structure_smart
from custSupApp.services.ticket_service import create_structured_ticket, notify_staff
from custSupApp.services.analytics.analytics_service import get_staff_analytics
from custSupApp.services.analytics.admin_analytics import get_admin_staff_performance

# ── Celery tasks (replaces threading.Thread)
from custSupApp.tasks import reindex_org, send_ticket_email

# general
import os
from datetime import timedelta

# database
from .pagination import TicketCursorPagination, StaffCursorPagination


# ─── Custom Permissions

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "admin"
        )


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "staff"
        )


# ─── Sample CRUD

class SampleView(ModelViewSet):
    queryset = Sample.objects.all()
    serializer_class = SampleSerializer


# ─── Signup (PUBLIC)

class SignupView(CreateModelMixin, GenericViewSet):
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]


# ─── Admin Signup

class AdminSignupView(CreateModelMixin, GenericViewSet):
    queryset = User.objects.all()
    serializer_class = AdminSignupSerializer
    permission_classes = [AllowAny]


# ─── Login

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
            }
        })

        response.set_cookie(
            key="access",
            value=str(refresh.access_token),
            httponly=True,
            secure=not settings.DEBUG,   # True on Render (HTTPS), False locally
            samesite="Lax",
        )
        response.set_cookie(
            key="refresh",
            value=str(refresh),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
        )

        return response


# ─── Support AI

class SupportAIView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get("prompt")

        if not query:
            return Response({"detail": "Prompt is required"}, status=400)

        previous = ChatMessage.objects.filter(
            user=request.user
        ).order_by("-created_at")[:10].values("sender", "message")

        history = [{"role": msg["sender"], "content": msg["message"]} for msg in previous][::-1]

        ChatMessage.objects.create(user=request.user, sender="user", message=query)

        intent, reply, confidence, escalated = get_ai_response(
            query=query,
            history=history,
            user_email=request.user.email,
            org_id=request.user.organization_id
        )

        if escalated:
            structured_data = extract_ticket_structure_smart(query, history)

            ticket, staff_member = create_structured_ticket(
                request.user,
                query,
                structured_data
            )

            recent_messages = ChatMessage.objects.filter(
                user=request.user,
                created_at__gte=timezone.now() - timedelta(minutes=15)
            ).order_by("created_at")

            conversation_lines = []
            for msg in recent_messages:
                if msg.sender == "user":
                    conversation_lines.append(f"User: {msg.message}")
                else:
                    conversation_lines.append(f"AI: {msg.message}")
            conversation_text = "\n".join(conversation_lines)

            if staff_member:
                # ── Fire-and-forget via Celery — web worker returns immediately
                send_ticket_email.delay(
                    ticket_id=ticket.id,
                    staff_email=staff_member.email,
                    conversation_text=conversation_text,
                    query=query,
                )
            else:
                print("[ESCALATION] No available staff found.")

        ChatMessage.objects.create(user=request.user, sender="ai", message=reply)
        return Response({
            "intent": intent,
            "reply": reply,
            "confidence": confidence,
            "escalated": escalated,
        })


# ─── Logout

class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"message": "Logged out"})
        response.delete_cookie("access")
        response.delete_cookie("refresh")
        return response


# ─── Me

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
        })


# ─── Chat History

class ChatHistoryView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        messages = ChatMessage.objects.filter(
            user=request.user
        ).order_by("created_at")
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)


# ─── Admin: PDF Upload

class PDFViewSet(ListModelMixin, DestroyModelMixin, GenericViewSet):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return UploadedPDF.objects.filter(
            organization=self.request.user.organization
        ).order_by("-uploaded_at")

    def list(self, request):
        pdfs = self.get_queryset()
        data = [
            {
                "id": pdf.id,
                "title": pdf.title,
                "uploaded_at": pdf.uploaded_at,
                "uploaded_by": pdf.uploaded_by.username if pdf.uploaded_by else "unknown",
                "size_kb": round(pdf.file.size / 1024, 1) if pdf.file else 0,
            }
            for pdf in pdfs
        ]
        return Response(data)

    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request):
        file = request.FILES.get("file")

        if not file:
            return Response({"detail": "No file provided"}, status=400)
        if not file.name.endswith(".pdf"):
            return Response({"detail": "Only PDF files are allowed"}, status=400)
        if file.size > 10 * 1024 * 1024:
            return Response({"detail": "File too large. Max size is 10MB"}, status=400)

        pdf = UploadedPDF.objects.create(
            title=file.name,
            file=file,
            uploaded_by=request.user,
            organization=request.user.organization
        )

        # ── Queue reindex as a Celery task — returns immediately to the user
        reindex_org.delay(request.user.organization_id)

        return Response({
            "id": pdf.id,
            "title": pdf.title,
            "uploaded_at": pdf.uploaded_at,
            "message": "PDF uploaded. Knowledge base is being re-indexed.",
        }, status=201)

    def destroy(self, request, pk=None):
        try:
            pdf = UploadedPDF.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except UploadedPDF.DoesNotExist:
            return Response({"detail": "PDF not found"}, status=404)

        if pdf.file and os.path.exists(pdf.file.path):
            os.remove(pdf.file.path)

        pdf.delete()

        # ── Queue reindex as a Celery task
        reindex_org.delay(request.user.organization_id)

        return Response({"message": "PDF deleted. Knowledge base is being re-indexed."})


class StaffViewSet(ListModelMixin, CreateModelMixin, DestroyModelMixin, GenericViewSet):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]
    serializer_class = StaffSerializer
    pagination_class = StaffCursorPagination

    def get_queryset(self):
        return User.objects.filter(
            role="staff",
            organization=self.request.user.organization
        ).order_by("username")

    def list(self, request):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()

        if not username or not email or not password:
            return Response(
                {"detail": "Username, email and password are required"},
                status=400
            )

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username already exists"}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({"detail": "Email already exists"}, status=400)

        staff = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role="staff",
            organization=request.user.organization
        )

        return Response({
            "id": staff.id,
            "username": staff.username,
            "email": staff.email,
            "is_available": staff.is_available,
            "active_tickets": staff.active_tickets,
        }, status=201)

    def destroy(self, request, pk=None):
        try:
            staff = User.objects.get(
                id=pk,
                role="staff",
                organization=request.user.organization
            )
        except User.DoesNotExist:
            return Response({"detail": "Staff not found"}, status=404)

        staff.delete()
        return Response({"message": "Staff user removed"})

    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle(self, request, pk=None):
        try:
            staff = User.objects.get(
                id=pk,
                role="staff",
                organization=request.user.organization
            )
        except User.DoesNotExist:
            return Response({"detail": "Staff not found"}, status=404)

        staff.is_available = not staff.is_available
        staff.save()

        return Response({
            "id": staff.id,
            "username": staff.username,
            "email": staff.email,
            "is_available": staff.is_available,
            "active_tickets": staff.active_tickets,
        })


class StaffTicketViewSet(GenericViewSet, ListModelMixin):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsStaff]
    pagination_class = TicketCursorPagination

    def get_queryset(self):
        return SupportTicket.objects.select_related("user").filter(
            assigned_to=self.request.user,
            status__in=["open", "in_progress"]
        ).order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SupportTicketDetailSerializer
        return SupportTicketListSerializer

    def list(self, request):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        ticket = get_object_or_404(
            SupportTicket,
            id=pk,
            assigned_to=request.user
        )
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="resolve")
    def resolve(self, request, pk=None):
        note = request.data.get("resolution_note", "")
        ticket = get_object_or_404(
            SupportTicket,
            id=pk,
            assigned_to=request.user
        )
        ticket.status = "resolved"
        ticket.resolution_note = note
        ticket.resolved_at = timezone.now()
        ticket.save(update_fields=["status", "resolution_note", "resolved_at"])

        return Response({"message": "Ticket resolved", "ticket_id": ticket.id})

    @action(detail=True, methods=["patch"], url_path="start")
    def start_progress(self, request, pk=None):
        ticket = get_object_or_404(
            SupportTicket,
            id=pk,
            assigned_to=request.user
        )
        ticket.status = "in_progress"
        ticket.save(update_fields=["status"])

        return Response({"message": "Ticket marked as in progress", "ticket_id": ticket.id})

    @action(detail=True, methods=["get"], url_path="messages")
    def messages(self, request, pk=None):
        ticket = get_object_or_404(
            SupportTicket,
            id=pk,
            assigned_to=request.user
        )
        cutoff = ticket.created_at - timedelta(minutes=15)
        messages = ChatMessage.objects.filter(
            user=ticket.user,
            created_at__gte=cutoff,
            created_at__lte=ticket.created_at
        ).order_by("created_at")

        data = [{"sender": m.sender, "message": m.message, "created_at": m.created_at} for m in messages]
        return Response(data)


class StaffAnalyticsView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsStaff]

    def get(self, request):
        data = get_staff_analytics(request.user)
        return Response(data)


class OrganizationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        orgs = Organization.objects.all().values("id", "name")
        return Response(orgs)


class SubmitFeedbackView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, ticket_id):
        ticket = get_object_or_404(
            SupportTicket,
            id=ticket_id,
            user=request.user,
            status="resolved"
        )

        if hasattr(ticket, "feedback"):
            return Response({"detail": "Feedback already submitted"}, status=400)

        rating = request.data.get("rating")
        comment = request.data.get("comment", "")

        TicketFeedback.objects.create(
            ticket=ticket,
            staff=ticket.assigned_to,
            user=request.user,
            rating=rating,
            comment=comment
        )

        ticket.status = "closed"
        ticket.closed_at = timezone.now()
        ticket.save(update_fields=["status"])

        return Response({"message": "Feedback submitted and ticket closed"})


class UserResolvedTicketsView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = SupportTicket.objects.filter(
            user=request.user,
            status="resolved"
        ).select_related("assigned_to")

        data = []
        for t in tickets:
            data.append({
                "id": t.id,
                "query": t.description or t.message,
                "resolution_note": t.resolution_note or "None",
                "staff_name": t.assigned_to.username if t.assigned_to else "Unknown",
                "has_feedback": hasattr(t, "feedback")
            })

        return Response(data)


class AdminAnalyticsView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        data = get_admin_staff_performance(request.user.organization)
        return Response({"staff_performance": data})