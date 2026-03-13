import os
import requests
import json
import re

from dotenv import load_dotenv
load_dotenv()

from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# CONFIG

OLLAMA_URL = "http://localhost:11434/api/generate"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Confidence threshold — below this the query is escalated to support staff
ESCALATION_CONFIDENCE_THRESHOLD = 0.4

# Email address of the support personnel who receives escalated queries
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

# VECTOR STORE

_vectorstores = {}


def get_vectorstore(org_id):
    global _vectorstores

    if org_id not in _vectorstores:
        base_dir = os.path.dirname(os.path.abspath(__file__))

        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        index_path = os.path.join(base_dir, "faiss_index", str(org_id))

        _vectorstores[org_id] = FAISS.load_local(
            index_path,
            embeddings,
            allow_dangerous_deserialization=True,
        )

    return _vectorstores[org_id]

# PROMPT

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


# SENTIMENT DETECTION PROMPT
# Separate small prompt just to detect frustration/negativity in a message.
# We ask for a single word answer to keep it fast and cheap.

def build_sentiment_prompt(message: str) -> str:
    return f"""Analyze the sentiment of this customer support message.
Reply with ONLY one word: "frustrated", "negative", or "neutral".

Message: "{message}"

Reply:"""


# GROQ

def call_groq(prompt, max_tokens=300, system_prompt=None):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None

    # default system prompt forces JSON — but sentiment detection needs plain text
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
            continue # fails silently and at the end None is returned back

    return None

# OPENROUTER (FALLBACK 1)

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
                    "User-Agent": "customer-support-ai/1.0",
                    "HTTP-Referer": "http://localhost",
                    "X-Title": "customer-support-ai",
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


# OLLAMA (FALLBACK 2)

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


# SENTIMENT DETECTION
# Returns True if the user's message is frustrated or negative.
# Uses a tiny prompt with max_tokens=5 so it's near-instant.


def is_user_frustrated(message: str) -> bool:
    sentiment_prompt = build_sentiment_prompt(message)

    result = call_groq(
        sentiment_prompt,
        max_tokens=10,
        system_prompt="You are a sentiment classifier. Reply with exactly one word only: frustrated, negative, or neutral. No JSON, no explanation."
    )

    if not result:
        return False

    result = result.strip().lower()
    print(f"[SENTIMENT] Detected: {result}")

    return any(word in result for word in ["frustrated", "negative", "angry", "upset", "not satisfied", "dissatisfied"]) # returns true if any of the word is contained by the result generated


# MAIN ENTRY

def get_ai_response(query: str, history: list[dict] | None = None, user_email: str | None = None, org_id: int | None = None):
    if history is None:
        history = []

    # --- Step 1: Sentiment check — signal escalation immediately if frustrated ---
    user_is_frustrated = is_user_frustrated(query)

    if user_is_frustrated:
        reply = (
            "I'm sorry you're not satisfied with the support so far. "
            "Your query has been escalated to our support team. "
            "They will reach out to you at your registered email address shortly."
        )
        return ("escalation", reply, 0.0, True)  # True = escalated, view handles the email

    # --- Step 2: Normal AI response flow ---
    vectorstore = get_vectorstore(org_id)
    docs = vectorstore.similarity_search(query, k=2)
    context = "\n".join(d.page_content for d in docs)
    prompt = build_prompt(context, history, query)

    text = None

    text = call_groq(prompt)
    if not text:
        text = call_openrouter(prompt)
    if not text:
        try:
            text = call_ollama(prompt)
        except Exception:
            pass

    if not text:
        raise RuntimeError("No AI backend available")

    text = text.strip()

    match = re.search(r"\{[\s\S]*", text)
    if not match:
        raise ValueError(f"Invalid LLM response:\n{text}")

    json_text = match.group().strip()
    if json_text.count("{") > json_text.count("}"):
        json_text += "}"

    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON parse failed:\n{json_text}") from e

    intent = data.get("intent", "unknown")
    reply = data.get("reply", "No reply generated")
    confidence = float(data.get("confidence", 0.0))

    # --- Step 3: Low confidence — signal escalation, view handles email ---
    escalated = False
    if confidence < ESCALATION_CONFIDENCE_THRESHOLD:
        reply += (
            "\n\nI wasn't fully confident in this answer, so I've also forwarded "
            "your query to our support team. They will follow up with you shortly."
        )
        escalated = True  # view will create ticket and send email

    return (intent, reply, confidence, escalated)

def extract_ticket_structure_with_llm(query, history):

    history_text= "\n".join(
        f"{msg['role']}: {msg['content']}" for msg in history
    )

    prompt = f"""
        You are a support ticket classification system.

        Analyze the conversation and extract a structured ticket.

        Rules for priority:
        - high → user is frustrated, urgent, blocked, demands immediate help
        - normal → user reports a problem but is not blocked
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

    text= call_groq(prompt)

    if not text:
        text= call_openrouter(prompt)
    if not text:
        try:
            text= call_ollama(prompt)
        except Exception:
            return None
    text= text.strip()
    try:
        data= json.loads(text)
        return data
    except Exception:
        return None

VALID_PRIORITIES={"low", "normal", "high"}
VALID_CATEGORIES= {"authentication", "billing", "technical", "general"}


# to prevent llm hallucination issues

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