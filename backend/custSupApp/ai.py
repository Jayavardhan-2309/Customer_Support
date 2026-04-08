import os
import requests
import json
import re

from dotenv import load_dotenv
load_dotenv()

from django.db import connection

from custSupApp.embeddings import embed_text
import logging

logger = logging.getLogger(__name__)

# ── CONFIG ──────────────────────────────────────────────────────────────────

OLLAMA_URL = "http://localhost:11434/api/generate"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

MAX_DAILY_ESCALATIONS = 3
NO_CONTEXT_CONFIDENCE = 0.35
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

# ── ESCALATION LIMIT REPLY ───────────────────────────────────────────────────

ESCALATION_LIMIT_REPLY = (
    "You've reached the maximum of 3 escalations today. "
    "Our team will follow up on your earlier tickets. "
    "If this is urgent, please email us directly."
)

# ── NO-CONTEXT REPLIES ───────────────────────────────────────────────────────

NO_CONTEXT_FIRST_REPLY = (
    "I don't have enough information in my knowledge base to answer that confidently. "
    "Could you give me a bit more detail or rephrase your question?"
)

NO_CONTEXT_SECOND_REPLY = (
    "I still don't have a good answer for that — it may be outside what I currently know. "
    "You can try asking something else, or I can escalate this to a human agent if you'd like."
)

# ── HELPERS ──────────────────────────────────────────────────────────────────

def _escalation_limit_reached(escalation_count: int) -> bool:
    return escalation_count >= MAX_DAILY_ESCALATIONS


def _count_no_context_turns(history: list[dict]) -> int:
    """Count consecutive trailing AI replies that were no-context responses."""
    no_context_markers = [NO_CONTEXT_FIRST_REPLY[:40], NO_CONTEXT_SECOND_REPLY[:40]]
    count = 0
    for msg in reversed(history):
        if msg["role"] != "assistant":
            continue
        if any(msg["content"].startswith(marker) for marker in no_context_markers):
            count += 1
        else:
            break
    return count


def _user_wants_escalation(query: str) -> bool:
    triggers = [
        "escalate", "human agent", "talk to someone", "speak to agent",
        "real person", "transfer me", "get support", "yes please",
        "yes escalate", "connect me",
    ]
    return any(t in query.lower() for t in triggers)

# ── ESCALATION RISK ──────────────────────────────────────────────────────────

def evaluate_escalation_risk(query, intent, confidence, sentiment_frustrated):
    query_lower = query.lower().strip()

    greetings = {"hello", "hi", "hey", "test", "anyone there", "hello?"}
    if len(query_lower) < 10 or query_lower in greetings:
        return False

    if any(keyword in query_lower for keyword in CRITICAL_KEYWORDS):
        logger.info("Escalating due to critical keyword: %s", query[:50])
        return True

    if sentiment_frustrated and confidence < 0.5:
        logger.info("Escalating: frustrated user + confidence %.2f", confidence)
        return True

    if confidence < 0.2:
        logger.warning("Escalating: confidence %.2f below absolute floor", confidence)
        return True

    if intent in ["billing_dispute", "account_security"]:
        logger.info("Escalating: sensitive intent '%s'", intent)
        return True

    return False

# ── VECTOR SEARCH ────────────────────────────────────────────────────────────

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
            [org_id, query_vector_str, k],
        )
        return [row[0] for row in cursor.fetchall()]

# ── PROMPT BUILDER ───────────────────────────────────────────────────────────

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

    return f"""You are a customer support AI. Be concise and honest.

STRICT RULES:
1. Answer ONLY using the Knowledge Context below. Do NOT infer, assume, or make up information.
2. If the Knowledge Context does not contain a direct answer to the question, you MUST set confidence below 0.35 and reply that you don't have that specific information.
3. Pay close attention to WHAT the user is asking. "why" and "where" are different questions — do not answer a different question than what was asked.
4. Use conversation history only to understand follow-up context, NOT as a source of facts.

Knowledge Context:
{context}

Conversation History:
{history_block}

Current User Query:
{query}

Return ONLY valid JSON:
{{"intent": "...", "reply": "...", "confidence": 0.0}}"""


def build_sentiment_prompt(message: str) -> str:
    return f"""Analyze the sentiment of this customer support message.
Reply with ONLY one word: "frustrated", "negative", or "neutral".

Message: "{message}"

Reply:"""

# ── LLM CALLERS ─────────────────────────────────────────────────────────────

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
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
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
    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": "mistral", "prompt": prompt, "stream": False},
            timeout=8,
        )
        response.raise_for_status()
        return response.json()["response"]
    except Exception:
        return None


def is_user_frustrated(message: str) -> bool:
    result = call_groq(
        build_sentiment_prompt(message),
        max_tokens=10,
        system_prompt="Reply with exactly one word: frustrated, negative, or neutral.",
    )
    if not result:
        return False
    return any(word in result.strip().lower() for word in ["frustrated", "negative", "angry", "upset"])

# ── MAIN ─────────────────────────────────────────────────────────────────────

def get_ai_response(query, history=None, user_email=None, org_id=None, escalation_count=0):
    """
    Returns: (intent, reply, confidence, escalated)

    escalation_count – number of support tickets the user has already
                       created in the last 24 hours (passed in from the view).
    """
    if history is None:
        history = []

    # ── 1. Explicit user escalation request ──────────────────────────────────
    if _user_wants_escalation(query):
        if _escalation_limit_reached(escalation_count):
            logger.info("User requested escalation but daily limit reached.")
            return ("escalation_limit", ESCALATION_LIMIT_REPLY, 1.0, False)
        return ("escalation", "Sure, let me connect you with a human agent right away.", 1.0, True)

    # ── 2. Repetitive AI reply detection ─────────────────────────────────────
    # Scan ALL assistant messages in history, not just the last two positional
    # slots — the 10-message window means the pair could appear anywhere.
    # We flag it if any substantive reply (>60 chars) has appeared 2+ times.
    assistant_msgs = [m["content"].strip() for m in history if m["role"] == "assistant"]
    substantive = [m for m in assistant_msgs if len(m) > 60]
    if len(substantive) >= 2:
        # Count occurrences of the most recent substantive reply
        most_recent = substantive[-1]
        repeat_count = substantive.count(most_recent)
        if repeat_count >= 2:
            logger.warning(
                "AI repeated the same reply %d times — forcing escalation.", repeat_count
            )
            if _escalation_limit_reached(escalation_count):
                return ("escalation_limit", ESCALATION_LIMIT_REPLY, 0.0, False)
            return (
                "escalation",
                "I noticed I'm giving you the same answer repeatedly, which means "
                "I don't have better information on this. Let me get a human agent "
                "to help you properly.",
                0.0,
                True,
            )

    # ── 3. No-context turn counter ────────────────────────────────────────────
    no_context_turns = _count_no_context_turns(history)

    # ── 4. Sentiment ──────────────────────────────────────────────────────────
    sentiment_frustrated = is_user_frustrated(query)

    # ── 5. Vector search ──────────────────────────────────────────────────────
    docs = search_similar_chunks(query, org_id, k=2)
    context = "\n".join(docs)

    # ── 6. Call LLM ───────────────────────────────────────────────────────────
    prompt = build_prompt(context, history, query)
    text = call_groq(prompt) or call_openrouter(prompt) or call_ollama(prompt)

    if not text:
        logger.error("No AI backend available for response generation")
        raise RuntimeError("No AI backend available")

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        logger.error("[ERROR] No JSON found in LLM response: %s", text)
        return ("error", "Invalid response from AI", 0.0, False)

    json_text = match.group().replace("\n", " ").replace("\r", " ")
    try:
        data = json.loads(json_text)
    except json.JSONDecodeError:
        logger.error("[ERROR] Invalid JSON from LLM: %s", json_text)
        return ("error", "Sorry, something went wrong. Please try again.", 0.0, False)

    intent = data.get("intent", "unknown")
    reply = data.get("reply", "")
    confidence = float(data.get("confidence", 0.0))

    # ── 7. No-context ladder ──────────────────────────────────────────────────
    # Greetings and very short messages are conversational — the AI can reply
    # without any KB docs, so skip the no-context ladder entirely for them.
    _query_lower = query.lower().strip()
    _greeting_words = {
        "hello", "hi", "hey", "sup", "yo", "howdy", "greetings",
        "good morning", "good afternoon", "good evening",
    }
    _is_greeting = _query_lower in _greeting_words or len(_query_lower) < 10

    has_no_context = (not _is_greeting) and (not docs or confidence < NO_CONTEXT_CONFIDENCE)

    if has_no_context:
        if no_context_turns == 0:
            logger.info("No context — asking user to elaborate (turn 1).")
            return ("no_context", NO_CONTEXT_FIRST_REPLY, confidence, False)
        elif no_context_turns == 1:
            logger.info("No context again — offering escalation choice (turn 2).")
            return ("no_context", NO_CONTEXT_SECOND_REPLY, confidence, False)
        else:
            logger.info("Persistent no-context after %d turns — escalating.", no_context_turns)
            if _escalation_limit_reached(escalation_count):
                return ("escalation_limit", ESCALATION_LIMIT_REPLY, confidence, False)
            return (
                "escalation",
                "I've tried my best but I don't have a good answer for this. "
                "I'm escalating this to our support team who can help you further.",
                confidence,
                True,
            )

    # ── 8. Normal escalation risk evaluation ─────────────────────────────────
    escalated = evaluate_escalation_risk(query, intent, confidence, sentiment_frustrated)

    if escalated:
        if _escalation_limit_reached(escalation_count):
            logger.info("Escalation warranted but daily limit reached.")
            return ("escalation_limit", ESCALATION_LIMIT_REPLY, confidence, False)
        if sentiment_frustrated:
            reply = (
                "I'm sorry you're experiencing this. "
                "I've escalated this to our team for immediate attention."
            )

    return intent, reply, confidence, escalated

# ── TICKET STRUCTURE ──────────────────────────────────────────────────────────

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