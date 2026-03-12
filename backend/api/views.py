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
from custSupApp.models import User, ChatMessage, UploadedPDF, SupportTicket

# functions
from custSupApp.ai import get_ai_response
from custSupApp.authentication import CookieJWTAuthentication
from custSupApp.index_knowledge import run_indexing
from custSupApp.services.ticket_extraction import extract_ticket_structure_smart
from django.core.mail import send_mail
from custSupApp.services.ticket_service import create_structured_ticket, notify_staff
from custSupApp.services.analytics.analytics_service import get_staff_analytics

# general
import threading
import os
from datetime import timedelta

# database
from .pagination import TicketCursorPagination, StaffCursorPagination


# ─── Custom Permissions

class IsAdmin(BasePermission):
    """Only allows users with role='admin'."""
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
    


# ─── Helper: re-index in background 

def trigger_reindex():
    """Runs index_knowledge.py in a background thread so the API responds immediately."""
    def _run():
        try:
            # Reset the cached vectorstore so next query loads the fresh index
            import custSupApp.ai as ai_module
            ai_module._vectorstore = None

            run_indexing()
            print("[REINDEX] Done.")
        except Exception as e:
            print(f"[REINDEX] Failed: {e}")

    threading.Thread(target=_run, daemon=True).start()


# ─── Sample CRUD

class SampleView(ModelViewSet):
    queryset = Sample.objects.all()
    serializer_class = SampleSerializer


# ─── Signup (PUBLIC) 

class SignupView(CreateModelMixin, GenericViewSet):
    queryset = User.objects.all()
    serializer_class = SignupSerializer
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
            secure=False,
            samesite="Lax",
        )
        response.set_cookie(
            key="refresh",
            value=str(refresh),
            httponly=True,
            secure=False,
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
        ).order_by("-created_at")[:10].values("sender", "message") # for most recent we only take recent 10 msgs, -created_at takes care of recent messages

        history = [{"role": msg["sender"], "content": msg["message"]} for msg in previous][::-1] # chronological ordering for oldest to newest chats

        ChatMessage.objects.create(user=request.user, sender="user", message=query)

        intent, reply, confidence, escalated = get_ai_response(
            query=query,
            history=history,
            user_email=request.user.email,
        )

        if escalated:

            # Assign staff safely (inside service uses select_for_update + atomic)

            structured_data= extract_ticket_structure_smart(query, history)

            ticket, staff_member = create_structured_ticket(
                request.user,
                query,
                structured_data
            )
            # print(f"getting in {ticket_data}") # testing the ticket_data


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
                notify_staff(ticket, staff_member, conversation_text, query)

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
        return UploadedPDF.objects.all().order_by("-uploaded_at")

    # LIST — GET /admin/pdfs/
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

    # UPLOAD — POST /admin/pdfs/upload/
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
        )
        trigger_reindex()

        return Response({
            "id": pdf.id,
            "title": pdf.title,
            "uploaded_at": pdf.uploaded_at,
            "message": "PDF uploaded. Knowledge base is being re-indexed.",
        }, status=201)

    # DELETE — DELETE /admin/pdfs/{id}/
    def destroy(self, request, pk=None):
        try:
            pdf = UploadedPDF.objects.get(id=pk)
        except UploadedPDF.DoesNotExist:
            return Response({"detail": "PDF not found"}, status=404)

        if pdf.file and os.path.exists(pdf.file.path):
            os.remove(pdf.file.path)

        pdf.delete()
        trigger_reindex()

        return Response({"message": "PDF deleted. Knowledge base is being re-indexed."})
    




class StaffViewSet(ListModelMixin, CreateModelMixin, DestroyModelMixin, GenericViewSet):
    """
    Admin-only ViewSet to manage staff users.
    GET    /admin/staff/           → list all staff
    POST   /admin/staff/           → create staff user
    DELETE /admin/staff/{id}/      → remove staff user
    PATCH  /admin/staff/{id}/toggle/ → toggle availability
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]
    serializer_class = StaffSerializer
    pagination_class = StaffCursorPagination

    def get_queryset(self):
        return User.objects.filter(role="staff").order_by("username")

    # LIST
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
            staff = User.objects.get(id=pk, role="staff")
        except User.DoesNotExist:
            return Response({"detail": "Staff not found"}, status=404)

        staff.delete()
        return Response({"message": "Staff user removed"})

    # TOGGLE AVAILABILITY
    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle(self, request, pk=None):
        try:
            staff = User.objects.get(id=pk, role="staff")
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
    pagination_class= TicketCursorPagination

    def get_queryset(self):
        return SupportTicket.objects.select_related("user").filter( # select_related prevents N+1 queries
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

        return Response({
            "message": "Ticket resolved",
            "ticket_id": ticket.id
        })
    @action(detail=True, methods=["patch"], url_path="start")
    def start_progress(self, request, pk=None):

        ticket = get_object_or_404(
            SupportTicket,
            id=pk,
            assigned_to=request.user
        )

        ticket.status = "in_progress"
        ticket.save(update_fields=["status"])

        return Response({
            "message": "Ticket marked as in progress",
            "ticket_id": ticket.id
        })
    
    @action(detail=True, methods=["get"], url_path="messages")
    def messages(self, request, pk=None):
        ticket = get_object_or_404(
            SupportTicket,
            id=pk,
            assigned_to=request.user
        )
        
        from datetime import timedelta
        cutoff = ticket.created_at - timedelta(minutes=15)
        
        messages = ChatMessage.objects.filter(
            user=ticket.user,
            created_at__gte=cutoff,
            created_at__lte=ticket.created_at
        ).order_by("created_at")
        
        data = [{"sender": m.sender, "message": m.message, "created_at": m.created_at} for m in messages]
        return Response(data)

class StaffAnalyticsView(APIView):
    authentication_classes=[CookieJWTAuthentication]
    permission_classes=[IsStaff]

    def get(self, request):

        data= get_staff_analytics(request.user)
        return Response(data)
