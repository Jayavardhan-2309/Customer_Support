import json
import logging
from io import BytesIO
from pathlib import Path

import pdfplumber
import requests
from celery import shared_task
from celery.utils.log import get_task_logger
from django.db import connection
from pdfminer.pdfparser import PDFSyntaxError
from langchain_text_splitters import CharacterTextSplitter
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from custSupApp.config import ConfigurationError, required_env
from knowledge_base.embeddings import embed_texts_batch
from custSupApp.models import SupportTicket, UploadedDocument, UploadedPDF
from django.template.loader import render_to_string
from knowledge_base.document_processor import (
    get_document_processor,
    process_document_from_url,
    DocumentResult,
)


logger = get_task_logger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"
REQUEST_RETRY_TOTAL = 3
REQUEST_RETRY_BACKOFF = 0.5
PDF_BATCH_PAGES = 2
TEXT_CHUNK_SIZE = 300
TEXT_CHUNK_OVERLAP = 50
EMBEDDING_BATCH_SIZE = 5


def _get_brevo_config() -> tuple[str, str]:
    return required_env("BREVO_API_KEY"), required_env("BREVO_SENDER_EMAIL")


def _retrying_session() -> requests.Session:
    retry = Retry(
        total=REQUEST_RETRY_TOTAL,
        backoff_factor=REQUEST_RETRY_BACKOFF,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "POST"),
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session


def _render_ticket_email(ticket, conversation_text, query) -> str:
    return render_to_string(
        "emails/support_ticket.html",
        {"ticket": ticket, "conversation_text": conversation_text, "query": query},
    )


def _send_brevo_email(staff_email: str, subject: str, html_content: str) -> requests.Response:
    brevo_api_key, brevo_sender_email = _get_brevo_config()
    return _retrying_session().post(
        BREVO_URL,
        headers={"api-key": brevo_api_key, "Content-Type": "application/json"},
        json={
            "sender": {"name": "Support System", "email": brevo_sender_email},
            "to": [{"email": staff_email}],
            "subject": subject,
            "htmlContent": html_content,
        },
        timeout=15,
    )


def _raise_for_brevo_error(response: requests.Response) -> None:
    if response.status_code in (200, 201):
        return
    logger.error("Brevo API error")
    raise requests.HTTPError(
        f"Brevo API error {response.status_code}: {response.text}",
        response=response,
    )


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_ticket_email(self, ticket_id, staff_email, conversation_text, query) -> None:
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        response = _send_brevo_email(
            staff_email,
            f"[Ticket #{ticket.id}] New Support Ticket",
            _render_ticket_email(ticket, conversation_text, query),
        )
        _raise_for_brevo_error(response)
        logger.info(f"[send_ticket_email] Email sent for ticket #{ticket_id} to {staff_email}")

    except SupportTicket.DoesNotExist:
        logger.warning(f"[send_ticket_email] Ticket #{ticket_id} not found, skipping.")

    except ConfigurationError as exc:
        logger.error("[send_ticket_email] Email configuration error: %s", exc)
        raise

    except (RuntimeError, requests.RequestException) as exc:
        logger.error(
            f"[send_ticket_email] Failed for ticket #{ticket_id} "
            f"(attempt {self.request.retries + 1}/{self.max_retries + 1}): {exc}",
            exc_info=True,
        )
        raise self.retry(exc=exc)


def _mark_document_completed(doc) -> None:
    doc.status = "completed"
    doc.is_indexed = True
    doc.save(update_fields=["status", "is_indexed"])
    logger.info(f"[INDEX COMPLETE] Document={doc.title} (type: {doc.file_type})")


def _process_pdf_legacy(pdf, pdf_doc) -> bool:
    """Legacy PDF processing using pdfplumber (for backward compatibility)"""
    if not pdf.total_pages:
        pdf.total_pages = len(pdf_doc.pages)
        pdf.save(update_fields=["total_pages"])

    for page_index in range(pdf.last_processed_page, len(pdf_doc.pages), PDF_BATCH_PAGES):
        pages = pdf_doc.pages[page_index:page_index + PDF_BATCH_PAGES]
        texts = [page_text for page in pages if (page_text := page.extract_text() or "").strip()]
        if texts:
            process_text_batch_sync(texts, pdf.organization_id, pdf.id)

        pdf.last_processed_page = page_index + PDF_BATCH_PAGES
        pdf.save(update_fields=["last_processed_page"])
        return False
    return True


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def index_pdf(self, pdf_id) -> None:
    """
    Legacy task for indexing PDFs. 
    Now delegates to index_document for unified processing.
    """
    try:
        pdf = UploadedPDF.objects.get(id=pdf_id)
        # Delegate to the new unified document indexing
        index_document.delay(pdf.id)
    except UploadedPDF.DoesNotExist:
        logger.warning(f"[INDEX ERROR] PDF #{pdf_id} not found")


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def index_document(self, doc_id) -> None:
    """
    Unified task for indexing documents (PDF, Excel, CSV, Word).
    Uses the document_processor module for multi-format support.
    """
    doc = UploadedDocument.objects.get(id=doc_id)

    logger.info(f"[INDEX START] Document={doc.title} (type: {doc.file_type})")

    try:
        # Use the new document processor for all file types
        result = process_document_from_url(doc.file_url)
        
        # Split and index the extracted text and extracted chart data
        texts = _split_document_text(result.text, result.chart_data)
        
        for i in range(0, len(texts), EMBEDDING_BATCH_SIZE):
            batch = texts[i:i + EMBEDDING_BATCH_SIZE]
            vectors = embed_texts_batch(batch)

            with connection.cursor() as cursor:
                for text, vector in zip(batch, vectors):
                    vector_str = "[" + ",".join(map(str, vector)) + "]"
                    cursor.execute(
                        """
                        INSERT INTO kb_chunks (content, embedding, org_id, pdf_id)
                        VALUES (%s, %s::vector, %s, %s)
                        """,
                        [text, vector_str, doc.organization_id, doc.id],
                    )

        _mark_document_completed(doc)

    except (RuntimeError, PDFSyntaxError, OSError, ValueError) as exc:
        logger.error(f"[INDEX ERROR] {doc.title} | {exc}", exc_info=True)
        raise self.retry(exc=exc)


def _split_document_text(text: str, chart_data: Optional[list[dict]] = None) -> list[str]:
    """Split document text into chunks for embedding"""
    splitter = CharacterTextSplitter(
        chunk_size=TEXT_CHUNK_SIZE,
        chunk_overlap=TEXT_CHUNK_OVERLAP
    )
    chunks = splitter.split_text(text)
    if chart_data:
        for entry in chart_data:
            if not isinstance(entry, dict):
                continue
            if entry.get("chart_type") == "none":
                continue
            chart_json = json.dumps(entry, ensure_ascii=False, indent=None)
            chunks.append(f"--- Chart Data ---\n{chart_json}")
    return chunks


def process_text_batch_sync(text_batch, org_id, doc_id) -> None:
    """Process a batch of text chunks and embed them"""
    splitter = CharacterTextSplitter(chunk_size=TEXT_CHUNK_SIZE, chunk_overlap=TEXT_CHUNK_OVERLAP)

    docs = []
    for text in text_batch:
        docs.extend(splitter.split_text(text))

    for i in range(0, len(docs), EMBEDDING_BATCH_SIZE):
        mini_batch = docs[i:i + EMBEDDING_BATCH_SIZE]

        vectors = embed_texts_batch(mini_batch)

        with connection.cursor() as cursor:
            for text, vector in zip(mini_batch, vectors):
                vector_str = "[" + ",".join(map(str, vector)) + "]"

                cursor.execute(
                    """
                    INSERT INTO kb_chunks (content, embedding, org_id, pdf_id)
                    VALUES (%s, %s::vector, %s, %s)
                    """,
                    [text, vector_str, org_id, doc_id],
                )


def detect_file_type(file_url: str) -> str:
    """Detect file type from URL"""
    url_lower = file_url.lower()
    if '.pdf' in url_lower:
        return 'pdf'
    elif '.xlsx' in url_lower or '.xlsm' in url_lower or '.xls' in url_lower:
        return 'excel'
    elif '.csv' in url_lower:
        return 'csv'
    elif '.docx' in url_lower:
        return 'word'
    return 'pdf'  # Default to PDF


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def index_document_auto(self, doc_id, file_type=None) -> None:
    """
    Auto-detect file type and index document.
    This is the recommended entry point for new document uploads.
    """
    doc = UploadedDocument.objects.get(id=doc_id)
    
    # Auto-detect file type if not provided
    if file_type is None:
        file_type = detect_file_type(doc.file_url)
        doc.file_type = file_type
        doc.save(update_fields=["file_type"])
    
    # Delegate to the appropriate processor
    index_document.delay(doc_id)