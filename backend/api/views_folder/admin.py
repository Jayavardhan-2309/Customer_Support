import logging
from typing import Any

from django.db import connection
from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin, DestroyModelMixin, ListModelMixin
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.views import APIView
from supabase import create_client

from api.pagination import StaffCursorPagination
from api.serializers import StaffSerializer
from custSupApp.authentication import CookieJWTAuthentication
from custSupApp.config import ConfigurationError, required_env
from custSupApp.models import UploadedPDF, User
from custSupApp.services.analytics.admin_analytics import get_admin_analytics
from custSupApp.services.analytics.staff_detail_service import get_staff_detail
from custSupApp.tasks import index_pdf

from .permissions import IsAdmin

logger = logging.getLogger(__name__)


def _get_supabase_client() -> Any:
    return create_client(required_env("SUPABASE_URL"), required_env("SUPABASE_SERVICE_KEY"))


class PDFViewSet(ListModelMixin, DestroyModelMixin, GenericViewSet):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return UploadedPDF.objects.filter(
            organization=self.request.user.organization
        ).order_by("-uploaded_at")

    def list(self, request):
        data = [{
            "id": pdf.id,
            "title": pdf.title,
            "uploaded_at": pdf.uploaded_at,
            "uploaded_by": pdf.uploaded_by.username if pdf.uploaded_by else "unknown",
            "size_kb": 0,
        } for pdf in self.get_queryset()]
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

        try:
            supabase = _get_supabase_client()
            supabase_url = required_env("SUPABASE_URL")
        except ConfigurationError as exc:
            logger.error("PDF upload configuration error: %s", exc)
            return Response({"detail": "PDF storage is not configured"}, status=503)

        file_name = f"{request.user.id}_{file.name}"
        supabase.storage.from_("pdfs").upload(file_name, file.read())
        file_url = f"{supabase_url}/storage/v1/object/public/pdfs/{file_name}"

        pdf = UploadedPDF.objects.create(
            title=file.name,
            file_url=file_url,
            uploaded_by=request.user,
            organization=request.user.organization,
            status="queued",
        )
        index_pdf.delay(pdf.id)
        return Response({
            "id": pdf.id,
            "title": pdf.title,
            "uploaded_at": pdf.uploaded_at,
            "message": "PDF uploaded. Knowledge base is being re-indexed.",
        }, status=201)

    def destroy(self, request, pk=None):
        logger.info("[DELETE]: pdf deleted")
        try:
            pdf = UploadedPDF.objects.get(id=pk, organization=request.user.organization)
        except UploadedPDF.DoesNotExist:
            return Response({"detail": "PDF not found"}, status=404)

        try:
            supabase = _get_supabase_client()
        except ConfigurationError as exc:
            logger.error("PDF delete configuration error: %s", exc)
            return Response({"detail": "PDF storage is not configured"}, status=503)

        try:
            supabase.storage.from_("pdfs").remove([pdf.file_url.split("/")[-1]])
        except (RuntimeError, ValueError) as exc:
            logger.error("[DELETE ERROR] %s", exc)

        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM kb_chunks WHERE pdf_id = %s", [pdf.id])

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
            organization=self.request.user.organization,
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
            return Response({"detail": "Username, email and password are required"}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username already exists"}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({"detail": "Email already exists"}, status=400)

        staff = User.objects.create_user(
            username=username, email=email, password=password,
            role="staff", organization=request.user.organization,
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
            staff = User.objects.get(id=pk, role="staff", organization=request.user.organization)
        except User.DoesNotExist:
            return Response({"detail": "Staff not found"}, status=404)
        staff.delete()
        return Response({"message": "Staff user removed"})

    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle(self, request, pk=None):
        try:
            staff = User.objects.get(id=pk, role="staff", organization=request.user.organization)
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


class AdminAnalyticsView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(get_admin_analytics(request.user.organization))


class AdminStaffDetailView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request, staff_id):
        return Response(get_staff_detail(staff_id))
