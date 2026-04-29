import json
import logging
import re
from typing import Any

from dotenv import load_dotenv

from custSupApp.ai_config import (
    ESCALATION_LIMIT_REPLY,
    INVALID_JSON_RESPONSE,
    NO_CONTEXT_CONFIDENCE,
    NO_CONTEXT_FIRST_REPLY,
    NO_CONTEXT_SECOND_REPLY,
    VALID_CATEGORIES,
    VALID_PRIORITIES,
)
from custSupApp.ai_escalation import (
    count_no_context_turns,
    escalation_limit_reached,
    evaluate_escalation_risk,
    extract_repetition,
    handle_escalated,
    handle_escalation,
    handle_no_context,
    user_wants_escalation,
)
from custSupApp.ai_http import call_groq, call_ollama, call_openrouter, post_with_retry
from custSupApp.ai_knowledge import search_similar_chunks
from custSupApp.ai_prompts import build_prompt, build_sentiment_prompt
from custSupApp.ai_ticketing import (
    extract_ticket_structure_with_llm as extract_ticket_structure_with_llm_impl,
    validate_ticket_structure,
)

load_dotenv()
logger = logging.getLogger(__name__)

_escalation_limit_reached = escalation_limit_reached
_count_no_context_turns = count_no_context_turns
_user_wants_escalation = user_wants_escalation
_post_with_retry = post_with_retry


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _get_history(history: list[dict] | None) -> list[dict]:
    return history if history is not None else []


def _get_context(query: str, org_id: int | None) -> tuple[list[str], str]:
    docs = search_similar_chunks(query, org_id, k=2)
    return docs, "\n".join(docs)


def _call_response_backend(prompt: str) -> str | None:
    return call_groq(prompt) or call_openrouter(prompt) or call_ollama(prompt)


def _early_escalation_response(query: str, history: list[dict], escalation_count: int):
    return handle_escalation(query, escalation_count) or extract_repetition(history, escalation_count)


def _parse_ai_json(text: str) -> dict | object | None:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        logger.error("[ERROR] No JSON found in LLM response: %s", text)
        return None

    json_text = match.group().replace("\n", " ").replace("\r", " ")
    try:
        return json.loads(json_text)
    except json.JSONDecodeError:
        logger.error("[ERROR] Invalid JSON from LLM: %s", json_text)
        return INVALID_JSON_RESPONSE


def _is_greeting_or_short_message(query: str) -> bool:
    query_lower = query.lower().strip()
    greeting_words = {
        "hello", "hi", "hey", "sup", "yo", "howdy", "greetings",
        "good morning", "good afternoon", "good evening",
    }
    return query_lower in greeting_words or len(query_lower) < 10


def _has_no_context(query: str, docs: list[str], confidence: float) -> bool:
    return (
        not _is_greeting_or_short_message(query)
        and (not docs or confidence < NO_CONTEXT_CONFIDENCE)
    )


def _build_response_tuple(data: dict) -> tuple[str, str, float]:
    return (
        data.get("intent", "unknown"),
        data.get("reply", ""),
        _safe_float(data.get("confidence", 0.0)),
    )


def is_user_frustrated(message: str) -> bool:
    result = call_groq(
        build_sentiment_prompt(message),
        max_tokens=10,
        system_prompt="Reply with exactly one word: frustrated, negative, or neutral.",
    )
    if not result:
        return False
    return any(word in result.strip().lower() for word in ["frustrated", "negative", "angry", "upset"])


def get_ai_response(query: str, history: list[dict] | None = None, org_id: int | None = None, escalation_count: int = 0):
    history = _get_history(history)
    result = _early_escalation_response(query, history, escalation_count)
    if result:
        return result

    no_context_turns = _count_no_context_turns(history)
    sentiment_frustrated = is_user_frustrated(query)
    docs, context = _get_context(query, org_id)
    text = _call_response_backend(build_prompt(context, history, query))

    if not text:
        logger.error("No AI backend available for response generation")
        raise RuntimeError("No AI backend available")

    data = _parse_ai_json(text)
    if data is None:
        return ("error", "Invalid response from AI", 0.0, False)
    if data is INVALID_JSON_RESPONSE:
        return ("error", "Sorry, something went wrong. Please try again.", 0.0, False)

    intent, reply, confidence = _build_response_tuple(data)
    if _has_no_context(query, docs, confidence):
        return handle_no_context(no_context_turns, escalation_count, confidence)

    escalated = evaluate_escalation_risk(query, intent, confidence, sentiment_frustrated)
    if escalated:
        return handle_escalated(intent, escalation_count, confidence, escalated, sentiment_frustrated)
    return intent, reply, confidence, escalated


def extract_ticket_structure_with_llm(query: str, history: list[dict]) -> dict | None:
    return extract_ticket_structure_with_llm_impl(query, history, call_groq, call_openrouter, call_ollama)


__all__ = [
    "ESCALATION_LIMIT_REPLY",
    "NO_CONTEXT_FIRST_REPLY",
    "NO_CONTEXT_SECOND_REPLY",
    "VALID_CATEGORIES",
    "VALID_PRIORITIES",
    "_count_no_context_turns",
    "_escalation_limit_reached",
    "_post_with_retry",
    "_user_wants_escalation",
    "build_prompt",
    "build_sentiment_prompt",
    "call_groq",
    "call_ollama",
    "call_openrouter",
    "evaluate_escalation_risk",
    "extract_repetition",
    "extract_ticket_structure_with_llm",
    "get_ai_response",
    "handle_escalated",
    "handle_escalation",
    "handle_no_context",
    "is_user_frustrated",
    "search_similar_chunks",
    "validate_ticket_structure",
]
