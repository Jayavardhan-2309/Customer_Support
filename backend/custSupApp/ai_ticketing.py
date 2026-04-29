import requests
from pydantic import ValidationError

from custSupApp.ai_config import VALID_CATEGORIES, VALID_PRIORITIES
from custSupApp.ai_schemas import ChatHistoryMessage, TicketStructure


def build_ticket_prompt(query: str, history: list[dict]) -> str:
    safe_query = str(query).strip()
    safe_history = [ChatHistoryMessage.model_validate(msg).model_dump() for msg in history]
    history_text = "\n".join(f"{msg['role']}: {msg['content']}" for msg in safe_history)
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
{safe_query}

Return ONLY valid JSON:

{{
"category": "authentication | billing | technical | general",
"priority": "low | normal | high",
"description": "short issue description",
"context_summary": "brief conversation summary"
}}
"""


def extract_ticket_structure_with_llm(query: str, history: list[dict], call_groq, call_openrouter, call_ollama):
    prompt = build_ticket_prompt(query, history)
    text = call_groq(prompt) or call_openrouter(prompt)

    if not text:
        try:
            text = call_ollama(prompt)
        except (RuntimeError, requests.RequestException, ValueError, KeyError):
            return {}

    try:
        return TicketStructure.model_validate_json(text).model_dump()
    except ValidationError:
        return {}


def validate_ticket_structure(data: dict) -> bool:
    if not data:
        return False
    try:
        ticket = TicketStructure.model_validate(data)
    except ValidationError:
        return False
    return ticket.priority in VALID_PRIORITIES and ticket.category in VALID_CATEGORIES
