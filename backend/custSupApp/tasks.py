import logging
from io import BytesIO

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
from custSupApp.embeddings import embed_texts_batch
from custSupApp.models import SupportTicket, UploadedPDF
from django.template.loader import render_to_string


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


def _extract_pdf_batch(pdf_doc, start):
    pages = pdf_doc.pages[start:start + PDF_BATCH_PAGES]
    return [page_text for page in pages if (page_text := page.extract_text() or "").strip()]


def _mark_pdf_completed(pdf) -> None:
    pdf.status = "completed"
    pdf.is_indexed = True
    pdf.save(update_fields=["status", "is_indexed"])
    logger.info(f"[INDEX COMPLETE] PDF={pdf.title}")


def _process_pdf_pages(pdf, pdf_doc) -> bool:
    if not pdf.total_pages:
        pdf.total_pages = len(pdf_doc.pages)
        pdf.save(update_fields=["total_pages"])

    for page_index in range(pdf.last_processed_page, len(pdf_doc.pages), PDF_BATCH_PAGES):
        texts = _extract_pdf_batch(pdf_doc, page_index)
        if texts:
            process_text_batch_sync(texts, pdf.organization_id, pdf.id)

        pdf.last_processed_page = page_index + PDF_BATCH_PAGES
        pdf.save(update_fields=["last_processed_page"])
        return False
    return True


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def index_pdf(self, pdf_id) -> None:
    pdf = UploadedPDF.objects.get(id=pdf_id)

    logger.info(f"[INDEX START] PDF={pdf.title}")

    try:
        response = _retrying_session().get(pdf.file_url, timeout=15)
        response.raise_for_status()

        pdf_stream = BytesIO(response.content)

        with pdfplumber.open(pdf_stream) as pdf_doc:
            if not _process_pdf_pages(pdf, pdf_doc):
                index_pdf.delay(pdf.id)
                return
            _mark_pdf_completed(pdf)

    except (RuntimeError, PDFSyntaxError, OSError, ValueError) as exc:
        logger.error(f"[INDEX ERROR] {pdf.title} | {exc}", exc_info=True)
        raise self.retry(exc=exc)

def process_text_batch_sync(text_batch, org_id, pdf_id) -> None:
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
                    [text, vector_str, org_id, pdf_id],
                )
