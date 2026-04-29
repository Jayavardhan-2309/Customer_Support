import json

import requests

from custSupApp.ai_config import VALID_CATEGORIES, VALID_PRIORITIES


def build_ticket_prompt(query: str, history: list[dict]) -> str:
    history_text = "\n".join(f"{msg['role']}: {msg['content']}" for msg in history)
    return f"""
You are a support ticket classification system.

Analyze the conversation and extract a structured ticket.

Rules for priority:
- high -> user is frustrated, urgent, blocked
- normal -> user reports a problem but not blocked
- low -> informational or minor question

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


def extract_ticket_structure_with_llm(query: str, history: list[dict], call_groq, call_openrouter, call_ollama):
    text = call_groq(build_ticket_prompt(query, history)) or call_openrouter(build_ticket_prompt(query, history))

    if not text:
        try:
            text = call_ollama(build_ticket_prompt(query, history))
        except (RuntimeError, requests.RequestException, ValueError, KeyError):
            return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def validate_ticket_structure(data: dict | None) -> bool:
    if not data:
        return False
    if data.get("priority") not in VALID_PRIORITIES:
        return False
    if data.get("category") not in VALID_CATEGORIES:
        return False
    if not data.get("description"):
        return False
    return True
