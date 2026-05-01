import re
from pydantic import ValidationError

from ai_assistant.ai import extract_ticket_structure_with_llm, validate_ticket_structure
from ai_assistant.schemas import ChatHistoryMessage

# rule based extraction of ticket structure

CATEGORY_RULES= {
    "authentication": ["login", "password", "signin", "sign in", "otp", "reset"],
    "billing": ["payment", "billing", "bill", "pay", "fund", "refund", "charges", "charge", "invoice", "cash"],
    "technical": ["crash", "app", "website", "web site", "web app", "webpage", "web page", "settings", "issue", "bug", "not working", "error", "failed", "performance"],
}

KEYWORD_RULES = [
    "login",
    "password",
    "reset",
    "payment",
    "refund",
    "error",
    "failed",
    "bug",
    "crash",
    "invoice",
]

PRIORITY_RULES= {
    "high":["urgent", "immediately", "asap", "cannot access", "blocked"],
    "normal":["problem", "issue"]
}

FILLER_WORDS = [
    "hi",
    "hello",
    "hey",
    "please",
    "can you help",
    "i need help",
    "i have a problem",
    "i am facing an issue",
    "there is a problem",
    "help me",
]


def _normalize_query(query) -> str:
    if query is None:
        raise ValueError("query is required")
    normalized = str(query).strip()
    if not normalized:
        raise ValueError("query cannot be empty")
    return normalized


def _normalize_history(history) -> list[dict[str, str]]:
    if history is None:
        return []
    try:
        return [ChatHistoryMessage.model_validate(message).model_dump() for message in history]
    except (TypeError, ValidationError) as exc:
        raise ValueError("history must contain role/content messages") from exc


def _fallback_ticket_structure(query: str, history: list[dict[str, str]]):
    return extract_ticket_structure(query, history)


def _format_valid_llm_ticket(llm_data: dict, query: str):
    return {
        "category": llm_data["category"],
        "priority": llm_data["priority"],
        "description": llm_data["description"] or query,
        "context": llm_data.get("context_summary", ""),
    }


def classify_category(text: str):
    text = _normalize_query(text)
    text= text.lower()
    for category, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in text:
                return category
    return "general"

def classify_priority(text: str):
    text = _normalize_query(text)
    text= text.lower()
    for priority, keywords in PRIORITY_RULES.items():
        for keyword in keywords:
            if keyword in text:
                return priority
    return "normal"

def summarize_conversation(messages):
    messages = _normalize_history(messages)
    summary_lines=[]

    for msg in messages:
        role= msg["role"]
        content= msg["content"]

        if role == "user":
            summary_lines.append(f"User : {content}")
        else:
            summary_lines.append(f"AI: {content}")
    return "\n".join(summary_lines)

def extract_ticket_structure_smart(query, history):
    query = _normalize_query(query)
    history = _normalize_history(history)
    llm_data= extract_ticket_structure_with_llm(query, history)

    if validate_ticket_structure(llm_data):
        return _format_valid_llm_ticket(llm_data, query)
    
    return _fallback_ticket_structure(query, history)


def extract_ticket_structure(query, history):
    query = _normalize_query(query)
    history = _normalize_history(history)

    category= classify_category(query)
    priority= classify_priority(query)

    description = clean_description(query).strip()

    context= summarize_conversation(history)
    combined_text = query + " " + " ".join(
        msg["content"] for msg in history
    )

    keywords = extract_keywords(combined_text)
    return {
        "category": category, 
        "priority": priority,
        "description": description, 
        "context": context,
        "keywords": keywords,
    }

def clean_description(query: str):
    query = _normalize_query(query)

    text = query.lower().strip()

    # remove filler phrases
    for phrase in FILLER_WORDS:
        text = text.replace(phrase, "")

    # remove extra spaces
    text = re.sub(r"\s+", " ", text)
    text = text.strip().capitalize()

    return text

def extract_keywords(text: str):
    text = _normalize_query(text)

    text = text.lower()
    found = []

    for keyword in KEYWORD_RULES:
        if keyword in text:
            found.append(keyword)

    return list(set(found))[:5]
