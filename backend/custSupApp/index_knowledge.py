"""
index_knowledge.py

Indexes knowledge.txt + all uploaded PDFs in media/pdfs/ into a single FAISS vector store.
Run manually: python index_knowledge.py
Called automatically by Django after PDF upload or delete.
"""

"""
custSupApp/index_knowledge.py

Indexes knowledge.txt + all uploaded PDFs in media/pdfs/ into a single FAISS vector store.
Run manually:   python -m custSupApp.index_knowledge   (from backend/)
             or python custSupApp/index_knowledge.py   (from backend/)
Called automatically by Django after PDF upload or delete via trigger_reindex().
"""

import os
import sys
import django

# Makes this script runnable from anywhere by ensuring backend/ is in Python's path
# os.path.abspath(__file__)              → .../backend/custSupApp/index_knowledge.py
# os.path.dirname(...) once             → .../backend/custSupApp
# os.path.dirname(...) twice            → .../backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "custSupport.settings")

# Only call django.setup() when running as a standalone script.
# When imported by Django (via trigger_reindex), Django is already set up.
if not os.environ.get("DJANGO_ALREADY_SETUP"):
    try:
        django.setup()
    except RuntimeError:
        pass  # already set up, safe to ignore


from langchain_text_splitters import CharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
import pdfplumber

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def run_indexing():
    all_texts = []

    # 1. Load knowledge.txt (static base knowledge)
    knowledge_path = os.path.join(BASE_DIR, "knowledge.txt")
    if os.path.exists(knowledge_path):
        with open(knowledge_path, "r", encoding="utf-8") as f:
            all_texts.append(f.read())
        print("[INDEX] Loaded knowledge.txt")
    else:
        print(f"[INDEX] Warning: knowledge.txt not found at {knowledge_path}")

    # 2. Load all uploaded PDFs from media/pdfs/ (one level up from custSupApp/)
    pdf_dir = os.path.join(BASE_DIR, "..", "media", "pdfs")
    if os.path.exists(pdf_dir):
        pdf_files = [f for f in os.listdir(pdf_dir) if f.endswith(".pdf")]
        if pdf_files:
            for pdf_file in pdf_files:
                pdf_path = os.path.join(pdf_dir, pdf_file)
                try:
                    with pdfplumber.open(pdf_path) as pdf:
                        text = "\n".join(
                            page.extract_text() or "" for page in pdf.pages
                        )
                    if text.strip():
                        all_texts.append(text)
                        print(f"[INDEX] Loaded PDF: {pdf_file}")
                    else:
                        print(f"[INDEX] Warning: {pdf_file} had no extractable text")
                except Exception as e:
                    print(f"[INDEX] Failed to read {pdf_file}: {e}")
        else:
            print("[INDEX] No PDFs found in media/pdfs/")
    else:
        print("[INDEX] media/pdfs/ directory does not exist yet — skipping PDFs")

    if not all_texts:
        print("[INDEX] No content to index. Aborting.")
        return

    # 3. Split all text into chunks
    splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=300,
        chunk_overlap=50,
    )
    docs = []
    for text in all_texts:
        docs.extend(splitter.split_text(text))

    print(f"[INDEX] Total chunks to index: {len(docs)}")

    # 4. Build and save FAISS index
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    vectorstore = FAISS.from_texts(docs, embeddings)

    index_path = os.path.join(BASE_DIR, "faiss_index")
    vectorstore.save_local(index_path)

    print(f"[INDEX] Knowledge base re-indexed successfully! ({len(docs)} chunks)")


if __name__ == "__main__":
    run_indexing()
