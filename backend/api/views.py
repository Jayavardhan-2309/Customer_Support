# django
from django.contrib.auth import authenticate
from django.utils import timezone
from django.conf import settings
from django.shortcuts import get_object_or_404
from supabase import create_client
import os
import logging

logger= logging.getLogger(__name__)

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
from custSupApp.services.analytics.admin_analytics import get_admin_analytics
from custSupApp.services.analytics.staff_detail_service import get_staff_detail

# ── Celery tasks (replaces threading.Thread)
from custSupApp.tasks import send_ticket_email, index_pdf

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
                "role": user.role,   # frontend uses this to redirect admin vs user
            }
        })

        response.set_cookie(
            key="access",
            value=str(refresh.access_token),
            httponly=True,
            secure=True,
            samesite="Lax",
            path="/",
            max_age=60 * 500,
        )
        response.set_cookie(
            key="refresh",
            value=str(refresh),
            httponly=True,
            secure=True,
            samesite="Lax",
            path="/",
            max_age=60 * 60 * 24,
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
        ).order_by("-created_at")[:10].values("sender", "message") # for most recent we only take recent 10 msgs, -created_at takes care of recent messages

        history = [{"role": msg["sender"], "content": msg["message"]} for msg in previous][::-1] # chronological ordering for oldest to newest chats

        ChatMessage.objects.create(user=request.user, sender="user", message=query)

        try:
            intent, reply, confidence, escalated = get_ai_response(
                query=query,
                history=history,
                user_email=request.user.email,
                org_id=request.user.organization_id
            )
        except Exception as e:
            logger.error("[AI ERROR]: %s", e)
            return Response({
                "intent": "error",
                "reply": "Sorry, something went wrong. Please try again.",
                "confidence": 0.0,
                "escalated": False,
            }, status=200)

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
                logger.warning("[ESCALATION] No available staff found.")

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
            "organization_name": user.organization.name if user.organization else None,
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
        data = []
        for pdf in pdfs:
            try:
                size_kb = 0  # file is now remote (Supabase)
            except Exception:
                size_kb = 0  # file deleted from Render's ephemeral disk
            data.append({
                "id": pdf.id,
                "title": pdf.title,
                "uploaded_at": pdf.uploaded_at,
                "uploaded_by": pdf.uploaded_by.username if pdf.uploaded_by else "unknown",
                "size_kb": size_kb,
            })
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

        supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"]
        )

        file_bytes = file.read()
        file_name = f"{request.user.id}_{file.name}"

        # Upload to Supabase Storage
        supabase.storage.from_("pdfs").upload(
            file_name,
            file_bytes
        )

        # Public URL
        file_url = f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/pdfs/{file_name}"

        # Save ONLY URL
        pdf = UploadedPDF.objects.create(
            title=file.name,
            file_url=file_url,
            uploaded_by=request.user,
            organization=request.user.organization,
            status="queued"
        )

        # trigger indexing
        index_pdf.delay(pdf.id)

        return Response({
            "id": pdf.id,
            "title": pdf.title,
            "uploaded_at": pdf.uploaded_at,
            "message": "PDF uploaded. Knowledge base is being re-indexed.",
        }, status=201)

    # DELETE — DELETE /admin/pdfs/{id}/
    def destroy(self, request, pk=None):
        logger.info(f"[DELETE]: pdf deleted")
        try:
            pdf = UploadedPDF.objects.get(
                id=pk,
                organization=request.user.organization
            )
        except UploadedPDF.DoesNotExist:
            logger.info("[PDF]: not found")
            return Response({"detail": "PDF not found"}, status=404)

        supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"]
        )

        try:
            file_name = pdf.file_url.split("/")[-1]
            supabase.storage.from_("pdfs").remove([file_name])
        except Exception as e:
            logger.error(f"[DELETE ERROR] {e}")

        # DELETE ONLY THIS PDF’s embeddings
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM kb_chunks WHERE pdf_id = %s",
                [pdf.id]
            )

        pdf.delete()

        return Response({"message": "PDF deleted and cleaned"})

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

    # CREATE STAFF USER
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

    # DELETE STAFF
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

    # TOGGLE AVAILABILITY
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

    def get_serializer_class(self): # generic api viewset contains this method and we are overriding it
        if self.action == "retrieve": # variable of viewsetmixin, this is automatically set by it, based on the action performed
            return SupportTicketDetailSerializer
        return SupportTicketListSerializer

    def list(self, request): # similar to http get method but it is drf mapped function and not http method
        queryset = self.get_queryset()

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None): # similar to get/{id} method, but it is also a mapped drf mapped function
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
        try:
            orgs = Organization.objects.all().values("id", "name")
            return Response(list(orgs))
        except Exception as e:
            import traceback
            return Response({
                "error": str(e),
                "trace": traceback.format_exc()
            }, status=500)


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

        # Create feedback
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
        data = get_admin_analytics(request.user.organization)
        return Response(data)


class AdminStaffDetailView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, staff_id):
        data = get_staff_detail(staff_id)
        return Response(data)
