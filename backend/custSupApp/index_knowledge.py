import os
import sys
import django
import logging

logger= logging.getLogger("custSupApp.indexing")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "custSupport.settings")

if not os.environ.get("DJANGO_ALREADY_SETUP"):
    django.setup()

from langchain_text_splitters import CharacterTextSplitter
from django.db import connection
import pdfplumber

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

from custSupApp.embeddings import embed_texts_batch


def run_indexing(org_id):
    from custSupApp.models import UploadedPDF
    import time

    logger.info(f"[INDEX START] org_id={org_id}")

    pdfs = UploadedPDF.objects.filter(organization_id=org_id)
    logger.info(f"[INDEX] Found {pdfs.count()} PDFs")

    # ❗ Clear DB ONCE
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM kb_chunks WHERE org_id = %s", [org_id])

    for pdf in pdfs:
        try:
            logger.info(f"[INDEX] Processing PDF: {pdf.title}")

            with pdfplumber.open(pdf.file.path) as pdf_doc:

                batch_size_pages = 2
                current_batch = []

                for i, page in enumerate(pdf_doc.pages):
                    page_text = page.extract_text() or ""

                    if page_text.strip():
                        current_batch.append(page_text)

                    if len(current_batch) >= batch_size_pages:
                        process_text_batch(current_batch, org_id)
                        current_batch = []

                        time.sleep(0.5)  # 👈 backpressure

                if current_batch:
                    process_text_batch(current_batch, org_id)

        except Exception as e:
            logger.error(f"[INDEX ERROR] {pdf.title} | {e}", exc_info=True)

    logger.info(f"[INDEX COMPLETE] org_id={org_id}")

def process_text_batch(text_batch, org_id):
    from custSupApp.tasks import embed_and_store

    splitter = CharacterTextSplitter(chunk_size=300, chunk_overlap=50)

    docs = []
    for text in text_batch:
        docs.extend(splitter.split_text(text))

    batch_size = 10  # smaller

    for i in range(0, len(docs), batch_size):
        embed_and_store.delay(
            docs[i:i+batch_size],
            org_id,
            i // batch_size,
            len(docs) // batch_size + 1
        )
