import os
import sys
import django

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
    all_texts = []

    # knowledge.txt
    knowledge_path = os.path.join(BASE_DIR, "knowledge.txt")
    if os.path.exists(knowledge_path):
        with open(knowledge_path, "r", encoding="utf-8") as f:
            all_texts.append(f.read())

    # PDFs from DB
    from custSupApp.models import UploadedPDF

    pdfs = UploadedPDF.objects.filter(organization_id=org_id)

    for pdf in pdfs:
        try:
            print(f"[INDEX] Opening: {pdf.file.path} — exists: {os.path.exists(pdf.file.path)}")
            with pdfplumber.open(pdf.file.path) as pdf_doc:
                text = "\n".join(page.extract_text() or "" for page in pdf_doc.pages)
                if text.strip():
                    all_texts.append(text)
        except Exception as e:
            print(f"[INDEX] Failed to read {pdf.title}: {e}")

    if not all_texts:
        print(f"[INDEX] No content found for org {org_id}, skipping.")
        return

    splitter = CharacterTextSplitter(chunk_size=300, chunk_overlap=50)
    docs = []
    for text in all_texts:
        docs.extend(splitter.split_text(text))

    print(f"[INDEX] Embedding {len(docs)} chunks in one batch call...")

    try:
        vectors = embed_texts_batch(docs)
    except Exception as e:
        print(f"[EMBED ERROR BATCH] {e}")
        return

    pairs = list(zip(docs, vectors))

    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM kb_chunks WHERE org_id = %s", [org_id])

        for text, vector in pairs:
            vector_str = "[" + ",".join(map(str, vector)) + "]"
            cursor.execute(
                """
                INSERT INTO kb_chunks (content, embedding, org_id)
                VALUES (%s, %s::vector, %s)
                """,
                [text, vector_str, org_id],
            )

    print(f"[INDEX] Org {org_id} indexed ({len(docs)} chunks)")
