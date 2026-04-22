from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection

from api.views import PDFViewSet
from custSupApp.models import UploadedPDF

from .shared import ApiViewBaseTestCase

UPLOAD_URL="/api/v1/admin/pdfs/upload/"

class AdminPdfViewTests(ApiViewBaseTestCase):
    def test_pdf_list_filters_to_admin_organization(self):
        UploadedPDF.objects.create(title="Internal Guide", file_url="https://files/internal.pdf", uploaded_by=self.admin, organization=self.organization)
        UploadedPDF.objects.create(title="Other Guide", file_url="https://files/other.pdf", uploaded_by=self.other_staff, organization=self.other_organization)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/admin/pdfs/")
        self.assertEqual([item["title"] for item in response.data], ["Internal Guide"])

    def test_pdf_list_marks_missing_uploader_as_unknown(self):
        UploadedPDF.objects.create(title="Unowned Guide", file_url="https://files/unowned.pdf", uploaded_by=None, organization=self.organization)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/admin/pdfs/")
        self.assertEqual(response.data[0]["uploaded_by"], "unknown")
        self.assertEqual(response.data[0]["size_kb"], 0)

    def test_pdf_upload_validates_missing_extension_and_size(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.post(UPLOAD_URL, {}, format="multipart").status_code, 400)
        not_pdf = SimpleUploadedFile("notes.txt", b"plain text", content_type="text/plain")
        self.assertEqual(self.client.post(UPLOAD_URL, {"file": not_pdf}, format="multipart").status_code, 400)
        huge_pdf = MagicMock(name="huge.pdf")
        huge_pdf.name = "huge.pdf"
        huge_pdf.size = 11 * 1024 * 1024
        request = self.factory.post(UPLOAD_URL)
        request.user = self.admin
        request.FILES["file"] = huge_pdf
        self.assertEqual(PDFViewSet().upload(request).status_code, 400)

    @patch.dict("os.environ", {"SUPABASE_URL": "https://example-supabase.test", "SUPABASE_SERVICE_KEY": "service-key"})
    @patch("api.views_folder.admin.index_pdf.delay")
    @patch("api.views_folder.admin.create_client")
    def test_pdf_upload_saves_record_and_enqueues_indexing(self, create_client_mock, index_pdf_mock):
        storage_bucket = MagicMock()
        storage = MagicMock()
        storage.from_.return_value = storage_bucket
        create_client_mock.return_value = MagicMock(storage=storage)
        self.client.force_authenticate(user=self.admin)
        pdf_file = SimpleUploadedFile("guide.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        response = self.client.post(UPLOAD_URL, {"file": pdf_file}, format="multipart")
        self.assertEqual(response.status_code, 201)
        created_pdf = UploadedPDF.objects.get(title="guide.pdf")
        self.assertEqual(created_pdf.organization, self.organization)
        self.assertIn("/storage/v1/object/public/pdfs/", created_pdf.file_url)
        storage_bucket.upload.assert_called_once()
        index_pdf_mock.assert_called_once_with(created_pdf.id)

    def test_pdf_destroy_returns_not_found_for_unknown_pdf(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete("/api/v1/admin/pdfs/9999/")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["detail"], "PDF not found")

    @patch.dict("os.environ", {"SUPABASE_URL": "https://example-supabase.test", "SUPABASE_SERVICE_KEY": "service-key"})
    @patch("api.views_folder.admin.create_client")
    def test_pdf_destroy_removes_pdf_even_when_storage_cleanup_fails(self, create_client_mock):
        storage_bucket = MagicMock()
        storage_bucket.remove.side_effect = RuntimeError("storage unavailable")
        storage = MagicMock()
        storage.from_.return_value = storage_bucket
        create_client_mock.return_value = MagicMock(storage=storage)
        pdf = UploadedPDF.objects.create(title="Policy", file_url="https://files.example/pdfs/policy.pdf", uploaded_by=self.admin, organization=self.organization)
        self.client.force_authenticate(user=self.admin)
        with connection.cursor() as cursor:
            cursor.execute("CREATE TABLE IF NOT EXISTS kb_chunks (pdf_id integer)")
        response = self.client.delete(f"/api/v1/admin/pdfs/{pdf.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(UploadedPDF.objects.filter(id=pdf.id).exists())
        storage_bucket.remove.assert_called_once_with(["policy.pdf"])

    @patch("api.views_folder.admin.get_admin_analytics", return_value={"total_tickets": 12})
    def test_admin_analytics_view_returns_service_data(self, get_admin_analytics_mock):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/admin/analytics/")
        self.assertEqual(response.data["total_tickets"], 12)
        get_admin_analytics_mock.assert_called_once_with(self.organization)

    @patch("api.views_folder.admin.get_staff_detail", return_value={"id": 7, "name": "Staff Member"})
    def test_admin_staff_detail_view_returns_service_data(self, get_staff_detail_mock):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/v1/admin/analytics/staff/{self.staff.id}/")
        self.assertEqual(response.data["name"], "Staff Member")
        get_staff_detail_mock.assert_called_once_with(self.staff.id)
