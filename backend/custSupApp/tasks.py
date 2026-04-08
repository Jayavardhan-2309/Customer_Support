import logging
import os
import requests
from celery import shared_task
from celery.utils.log import get_task_logger
from django.template.loader import render_to_string
from django.conf import settings
from custSupApp.models import SupportTicket
from custSupApp.models import Organization

from django.core.cache import cache



logger = get_task_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_ticket_email(self, ticket_id, staff_email, conversation_text, query):
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)

        html_content = render_to_string(
            "emails/support_ticket.html",
            {"ticket": ticket, "conversation_text": conversation_text, "query": query},
        )

        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": os.environ["BREVO_API_KEY"],
                "Content-Type": "application/json",
            },
            json={
                "sender": {"name": "Support System", "email": os.environ["BREVO_SENDER_EMAIL"]},
                "to": [{"email": staff_email}],
                "subject": f"[Ticket #{ticket.id}] New Support Ticket",
                "htmlContent": html_content,
            },
            timeout=15,
        )

        if response.status_code not in (200, 201):
            raise Exception(f"Brevo API error {response.status_code}: {response.text}")

        logger.info(f"[send_ticket_email] Email sent for ticket #{ticket_id} to {staff_email}")

    except SupportTicket.DoesNotExist:
        logger.warning(f"[send_ticket_email] Ticket #{ticket_id} not found, skipping.")

    except Exception as exc:
        logger.error(
            f"[send_ticket_email] Failed for ticket #{ticket_id} "
            f"(attempt {self.request.retries + 1}/{self.max_retries + 1}): {exc}",
            exc_info=True,
        )
        raise self.retry(exc=exc)

@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def index_pdf(self, pdf_id):
    from custSupApp.models import UploadedPDF
    import requests
    from io import BytesIO
    import pdfplumber

    pdf = UploadedPDF.objects.get(id=pdf_id)

    logger.info(f"[INDEX START] PDF={pdf.title}")

    try:
        response = requests.get(pdf.file_url, timeout=15)
        response.raise_for_status()

        pdf_stream = BytesIO(response.content)

        with pdfplumber.open(pdf_stream) as pdf_doc:

            if not pdf.total_pages:
                pdf.total_pages = len(pdf_doc.pages)
                pdf.save(update_fields=["total_pages"])

            start = pdf.last_processed_page
            BATCH_PAGES = 2

            for i in range(start, len(pdf_doc.pages), BATCH_PAGES):

                pages = pdf_doc.pages[i:i+BATCH_PAGES]

                texts = [
                    p.extract_text() or ""
                    for p in pages if (p.extract_text() or "").strip()
                ]

                if texts:
                    process_text_batch_sync(texts, pdf.organization_id, pdf.id)

                # SAVE PROGRESS
                pdf.last_processed_page = i + BATCH_PAGES
                pdf.save(update_fields=["last_processed_page"])

                # continue later
                index_pdf.delay(pdf.id)
                return

            # DONE
            pdf.status = "completed"
            pdf.is_indexed = True
            pdf.save(update_fields=["status", "is_indexed"])

            logger.info(f"[INDEX COMPLETE] PDF={pdf.title}")

    except Exception as exc:
        logger.error(f"[INDEX ERROR] {pdf.title} | {exc}", exc_info=True)
        raise self.retry(exc=exc)

def process_text_batch_sync(text_batch, org_id, pdf_id):
    from custSupApp.embeddings import embed_texts_batch
    from django.db import connection
    from langchain_text_splitters import CharacterTextSplitter

    splitter = CharacterTextSplitter(chunk_size=300, chunk_overlap=50)

    docs = []
    for text in text_batch:
        docs.extend(splitter.split_text(text))

    BATCH_SIZE = 5

    for i in range(0, len(docs), BATCH_SIZE):
        mini_batch = docs[i:i+BATCH_SIZE]

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
