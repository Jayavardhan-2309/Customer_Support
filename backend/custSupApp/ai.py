import os
import requests
import json
import re

from dotenv import load_dotenv
load_dotenv()

from django.db import connection

# ── Import embed_text from the new local embeddings module (no API key needed)
from custSupApp.embeddings import embed_text          # ← changed
import logging

logger= logging.getLogger(__name__)

# CONFIG

OLLAMA_URL = "http://localhost:11434/api/generate"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

ESCALATION_CONFIDENCE_THRESHOLD = 0.4

SOFT_ESCALATION_THRESHOLD = 0.6  # AI is somewhat unsure
HARD_ESCALATION_THRESHOLD = 0.3  # AI is very unsure
CRITICAL_KEYWORDS = ["legal", "sue", "lawyer", "refund", "cancel subscription", "data breach"]

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


def evaluate_escalation_risk(query, intent, confidence, sentiment_frustrated):
    """
    Determines if a query should be escalated based on multiple factors.
    Includes bypass logic for greetings and short messages to prevent false positives.
    """
    query_lower = query.lower().strip()
    
    # 1. GREETING BYPASS: Prevent escalation for simple hellos or short messages
    # If message is shorter than 10 characters or just "hello/hey", never escalate
    greetings = {"hello", "hi", "hey", "test", "anyone there", "hello?"}
    if len(query_lower) < 10 or query_lower in greetings:
        logger.info(f"Bypassing escalation for short/greeting message: '{query_lower}'")
        return False

    # 2. Immediate triggers: Critical keywords (Keep these)
    if any(keyword in query_lower for keyword in CRITICAL_KEYWORDS):
        logger.info(f"Escalating due to critical keyword: {query[:50]}")
        return True

    # 3. Refined Sentiment/Confidence check
    # Only escalate if frustrated AND confidence is quite low (0.5 instead of 0.6)
    if sentiment_frustrated and confidence < 0.5:
        logger.info(f"Escalating: Frustrated user + low confidence ({confidence})")
        return True

    # 4. Hard confidence floor (Lowered to 0.2 to allow for AI to try more)
    # This prevents "hello" from escalating just because confidence was 0.25
    if confidence < 0.2:
        logger.warning(f"Escalating: AI confidence ({confidence}) below absolute floor.")
        return True

    # 5. Intent-based escalation
    if intent in ["billing_dispute", "account_security"]:
        logger.info(f"Escalating based on sensitive intent: {intent}")
        return True

    return False

# ---------------- VECTOR SEARCH ---------------- #

def search_similar_chunks(query, org_id, k=2):
    try:
        query_vector = embed_text(query)
    except Exception as e:
        logger.info("[EMBED ERROR QUERY] %s", e)
        return []

    with connection.cursor() as cursor:
        query_vector_str = "[" + ",".join(map(str, query_vector)) + "]"
        cursor.execute(
            """
            SELECT content
            FROM kb_chunks
            WHERE org_id = %s
            ORDER BY embedding <-> %s::vector
            LIMIT %s
            """,
            [org_id, query_vector_str, k]
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
                timeout=8,
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
                timeout=8,
            )

            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
        except Exception:
            continue

    return None


def call_ollama(prompt):
    """Only used locally — will fail silently on Render (no Ollama installed)."""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "mistral",
                "prompt": prompt,
                "stream": False,
            },
            timeout=8,
        )
        response.raise_for_status()
        return response.json()["response"]
    except Exception:
        return None


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

    assistant_msgs = [m['content'] for m in history if m['role'] == 'assistant']
    if len(assistant_msgs) >= 2:
        # If the last two answers were exactly the same, escalate immediately
        if assistant_msgs[-1].strip() == assistant_msgs[-2].strip():
            logger.warning("Repetitive AI replies detected. Forcing escalation.")
            return ("escalation", "I noticed I'm repeating myself. Let me get a human to help you.", 0.0, True)

    # Check sentiment but don't exit immediately unless it's extreme
    sentiment_frustrated = is_user_frustrated(query)
    
    docs = search_similar_chunks(query, org_id, k=2)
    context = "\n".join(docs)
    prompt = build_prompt(context, history, query)

    text = call_groq(prompt) or call_openrouter(prompt) or call_ollama(prompt)
    if not text:
        logger.error("No AI backend available for response generation")
        raise RuntimeError("No AI backend available")

    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        logger.error("[ERROR] No JSON found in LLM response: %s", text)
        return ("error", "Invalid response from AI", 0.0, False)

    json_text = match.group()
    json_text = json_text.replace("\n", " ").replace("\r", " ")

    try:
        data = json.loads(json_text)
    except json.JSONDecodeError:
        logger.error("[ERROR] Invalid JSON from LLM: %s", json_text)
        return ("error", "Sorry, something went wrong. Please try again.", 0.0, False)

    intent = data.get("intent", "unknown")
    reply = data.get("reply", "")
    confidence = float(data.get("confidence", 0.0))

    # Apply the new balanced escalation logic
    escalated = evaluate_escalation_risk(query, intent, confidence, sentiment_frustrated)

    if escalated and sentiment_frustrated:
        # Override the reply for highly frustrated users to offer immediate human help
        reply = "I'm sorry you're experiencing this. I've escalated this to our team for immediate attention."

    return intent, reply, confidence, escalated

VALID_PRIORITIES = {"low", "normal", "high"}
VALID_CATEGORIES = {"authentication", "billing", "technical", "general"}


def extract_ticket_structure_with_llm(query, history):

    history_text = "\n".join(
        f"{msg['role']}: {msg['content']}" for msg in history
    )

    prompt = f"""
You are a support ticket classification system.

Analyze the conversation and extract a structured ticket.

Rules for priority:
- high → user is frustrated, urgent, blocked
- normal → user reports a problem but not blocked
- low → informational or minor question

Conversation:
{history_text}

Latest user query:
{query}

Return ONLY valid JSON:

{{
"category": "authentication | billing | technical | general",
"priority": "low | normal | high",
"description": "short issue description",
"context_summary": "brief conversation summary"
}}
"""

    text = call_groq(prompt) or call_openrouter(prompt)

    if not text:
        try:
            text = call_ollama(prompt)
        except Exception:
            return None

    try:
        return json.loads(text)
    except Exception:
        return None


def validate_ticket_structure(data):

    if not data:
        return False

    if data.get("priority") not in VALID_PRIORITIES:
        return False

    if data.get("category") not in VALID_CATEGORIES:
        return False

    if not data.get("description"):
        return False

    return True