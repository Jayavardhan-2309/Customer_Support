import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "custSupport.settings")

if not os.environ.get("DJANGO_ALREADY_SETUP"):
    django.setup()

from langchain_text_splitters import CharacterTextSplitter
# from langchain_huggingface import HuggingFaceEmbeddings
from django.db import connection
import pdfplumber

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

import requests

HF_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"

def embed_text(text):
    if not os.getenv("HF_TOKEN"):
        print("[WARNING] HF_TOKEN missing")
    headers = {
        "Authorization": f"Bearer {os.getenv('HF_TOKEN')}"
    }

    response = requests.post(
        HF_URL,
        headers=headers,
        json={"inputs": text},
        timeout=8
    )

    if response.status_code != 200:
        raise Exception(f"HF API error: {response.text}")

    data = response.json()

    # fix nested list
    if isinstance(data[0], list):
        data = data[0]

    return data

# EMBEDDINGS = HuggingFaceEmbeddings(
#     model_name="sentence-transformers/all-MiniLM-L6-v2"
# )


def run_indexing(org_id):
    all_texts = []

    # knowledge.txt
    knowledge_path = os.path.join(BASE_DIR, "knowledge.txt")
    if os.path.exists(knowledge_path):
        with open(knowledge_path, "r", encoding="utf-8") as f:
            all_texts.append(f.read())

    # PDFs
    from custSupApp.models import UploadedPDF

    pdfs = UploadedPDF.objects.filter(organization_id=org_id)

    for pdf in pdfs:
        try:
            with pdfplumber.open(pdf.file.path) as pdf_doc:
                text = "\n".join(page.extract_text() or "" for page in pdf_doc.pages)
                if text.strip():
                    all_texts.append(text)
        except Exception as e:
            print(f"[INDEX] Failed {pdf.title}: {e}")

    if not all_texts:
        return

    splitter = CharacterTextSplitter(chunk_size=300, chunk_overlap=50)
    docs = []

    for text in all_texts:
        docs.extend(splitter.split_text(text))

    with connection.cursor() as cursor:

        # delete old org data
        cursor.execute("DELETE FROM kb_chunks WHERE org_id = %s", [org_id])
        pairs = []

        for doc in docs:
            try:
                vec = embed_text(doc)
                pairs.append((doc, vec))
            except Exception as e:
                print(f"[EMBED ERROR] {e}")

        for text, vector in pairs:
            vector_str = "[" + ",".join(map(str, vector)) + "]"

            cursor.execute(
                """
                INSERT INTO kb_chunks (content, embedding, org_id)
                VALUES (%s, %s::vector, %s)
                """,
                [text, vector_str, org_id]
            )

    print(f"[INDEX] Org {org_id} indexed ({len(docs)} chunks)")
    