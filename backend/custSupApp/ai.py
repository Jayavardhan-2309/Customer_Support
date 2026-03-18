import os
import requests
import json
import re

from dotenv import load_dotenv
load_dotenv()

from langchain_huggingface import HuggingFaceEmbeddings
from django.db import connection

# CONFIG

OLLAMA_URL = "http://localhost:11434/api/generate"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

ESCALATION_CONFIDENCE_THRESHOLD = 0.4

SUPPORT_STAFF_EMAIL = os.environ.get("SUPPORT_STAFF_EMAIL", "support@yourcompany.com")

OPENROUTER_FREE_MODELS = [
    "meta-llama/llama-3-8b-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free",
    "google/gemma-7b-it:free",
    "microsoft/phi-2:free",
    "nousresearch/hermes-2-pro-llama-3-8b:free",
    "openchat/openchat-7b:free",
]

GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]

# GLOBAL EMBEDDINGS (important for performance)
EMBEDDINGS = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# ---------------- VECTOR SEARCH ---------------- #

def search_similar_chunks(query, org_id, k=2):
    query_vector = EMBEDDINGS.embed_query(query)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT content
            FROM kb_chunks
            WHERE org_id = %s
            ORDER BY embedding <-> %s
            LIMIT %s
            """,
            [org_id, query_vector, k]
        )

        return [row[0] for row in cursor.fetchall()]


# ---------------- PROMPT ---------------- #

def build_prompt(context: str, history: list[dict], query: str) -> str:
    recent_history = history[-6:] if len(history) > 6 else history

    if recent_history:
        history_lines = []
        for msg in recent_history:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            history_lines.append(f"{role_label}: {msg['content']}")
        history_block = "\n".join(history_lines)
    else:
        history_block = "No previous conversation."

    return f"""You are a customer support AI. Be concise.

Use ONLY the knowledge context below to answer. Use conversation history for follow-up questions.

Knowledge Context:
{context}

Conversation History:
{history_block}

Current User Query:
{query}

Return ONLY valid JSON:
{{"intent": "...", "reply": "...", "confidence": 0.0}}"""


# ---------------- SENTIMENT ---------------- #

def build_sentiment_prompt(message: str) -> str:
    return f"""Analyze the sentiment of this customer support message.
Reply with ONLY one word: "frustrated", "negative", or "neutral".

Message: "{message}"

Reply:"""


def call_groq(prompt, max_tokens=300, system_prompt=None):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None

    if system_prompt is None:
        system_prompt = "You are a customer support AI. Be concise. Always reply in valid JSON only."

    for model in GROQ_MODELS:
        try:
            response = requests.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens": max_tokens,
                },
                timeout=15,
            )
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
        except Exception:
            continue

    return None


def call_openrouter(prompt):
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None

    for model in OPENROUTER_FREE_MODELS:
        try:
            response = requests.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 300,
                },
                timeout=20,
            )

            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
        except Exception:
            continue

    return None


def call_ollama(prompt):
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "mistral",
            "prompt": prompt,
            "stream": False,
        },
        timeout=30,
    )

    response.raise_for_status()
    return response.json()["response"]


def is_user_frustrated(message: str) -> bool:
    sentiment_prompt = build_sentiment_prompt(message)

    result = call_groq(
        sentiment_prompt,
        max_tokens=10,
        system_prompt="Reply with exactly one word: frustrated, negative, or neutral.",
    )

    if not result:
        return False

    result = result.strip().lower()
    return any(word in result for word in ["frustrated", "negative", "angry", "upset"])


# ---------------- MAIN ---------------- #

def get_ai_response(query, history=None, user_email=None, org_id=None):
    if history is None:
        history = []

    if is_user_frustrated(query):
        return (
            "escalation",
            "Your query has been escalated to support.",
            0.0,
            True,
        )

    docs = search_similar_chunks(query, org_id, k=2)
    context = "\n".join(docs)

    prompt = build_prompt(context, history, query)

    text = call_groq(prompt) or call_openrouter(prompt) or call_ollama(prompt)

    if not text:
        raise RuntimeError("No AI backend available")

    match = re.search(r"\{[\s\S]*", text)
    json_text = match.group().strip()

    data = json.loads(json_text)

    intent = data.get("intent", "unknown")
    reply = data.get("reply", "")
    confidence = float(data.get("confidence", 0.0))

    escalated = confidence < ESCALATION_CONFIDENCE_THRESHOLD

    return intent, reply, confidence, escalated
