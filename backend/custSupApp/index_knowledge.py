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
    from custSupApp.tasks import embed_and_store
    import time

    start_time = time.time()
    logger.info(f"[INDEX START] org_id={org_id}")

    all_texts = []

    # knowledge.txt
    knowledge_path = os.path.join(BASE_DIR, "knowledge.txt")
    if os.path.exists(knowledge_path):
        logger.info("[INDEX] Reading knowledge.txt")
        with open(knowledge_path, "r", encoding="utf-8") as f:
            all_texts.append(f.read())

    # PDFs
    from custSupApp.models import UploadedPDF
    pdfs = UploadedPDF.objects.filter(organization_id=org_id)

    logger.info(f"[INDEX] Found {pdfs.count()} PDFs")

    for pdf in pdfs:
        try:
            logger.info(f"[INDEX] Reading PDF: {pdf.title}")

            with pdfplumber.open(pdf.file.path) as pdf_doc:
                text = "\n".join(page.extract_text() or "" for page in pdf_doc.pages)

                if text.strip():
                    all_texts.append(text)
                    logger.info(f"[INDEX] Extracted text from {pdf.title}")
                else:
                    logger.warning(f"[INDEX] Empty text in {pdf.title}")

        except Exception as e:
            logger.error(f"[INDEX ERROR] PDF read failed: {pdf.title} | {e}", exc_info=True)

    if not all_texts:
        logger.warning(f"[INDEX] No content found for org {org_id}")
        return

    splitter = CharacterTextSplitter(chunk_size=300, chunk_overlap=50)

    docs = []
    for text in all_texts:
        docs.extend(splitter.split_text(text))

    logger.info(f"[INDEX] Total chunks created: {len(docs)}")

    # Clear old data
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM kb_chunks WHERE org_id = %s", [org_id])

    logger.info("[INDEX] Old embeddings cleared")

    # Batch dispatch
    batch_size = 20
    total_batches = (len(docs) // batch_size) + 1

    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]
        batch_number = (i // batch_size) + 1

        logger.info(f"[INDEX] Dispatching batch {batch_number}/{total_batches}")

        embed_and_store.delay(batch, org_id, batch_number, total_batches)

    end_time = time.time()
    logger.info(f"[INDEX COMPLETE] org_id={org_id} | time={end_time - start_time:.2f}s")
