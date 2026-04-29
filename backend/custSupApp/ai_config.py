import os

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

JSON_CONTENT_TYPE = "application/json"
REQUEST_RETRY_STATUS_CODES = (429, 500, 502, 503, 504)
REQUEST_RETRY_TOTAL = 3
INVALID_JSON_RESPONSE = object()

ESCALATION_LIMIT_REPLY = (
    "You've reached the maximum of 3 escalations today. "
    "Our team will follow up on your earlier tickets. "
    "If this is urgent, please email us directly."
)

NO_CONTEXT_FIRST_REPLY = (
    "I don't have enough information in my knowledge base to answer that confidently. "
    "Could you give me a bit more detail or rephrase your question?"
)

NO_CONTEXT_SECOND_REPLY = (
    "I still don't have a good answer for that - it may be outside what I currently know. "
    "You can try asking something else, or I can escalate this to a human agent if you'd like."
)

VALID_PRIORITIES = {"low", "normal", "high"}
VALID_CATEGORIES = {"authentication", "billing", "technical", "general"}
