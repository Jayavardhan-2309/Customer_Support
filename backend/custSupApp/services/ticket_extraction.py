import re
from custSupApp.ai import extract_ticket_structure_with_llm, validate_ticket_structure

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

def classify_category(text: str):
    text= text.lower()
    for category, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in text:
                return category
    return "general"

def classify_priority(text: str):
    text= text.lower()
    for priority, keywords in PRIORITY_RULES.items():
        for keyword in keywords:
            if keyword in text:
                return priority
    return "normal"

def summarize_conversation(messages):
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
    llm_data= extract_ticket_structure_with_llm(query, history)

    if validate_ticket_structure(llm_data):
        return {
            "category": llm_data.get("category", "general"),
            "priority": llm_data.get("priority", "normal"),
            "description": llm_data.get("description", query),
            "context": llm_data.get("context_summary", "")
        }
    
    # fallback to rule-based extraction
    return extract_ticket_structure(query, history)


def extract_ticket_structure(query, history):
    # extract structured ticket fields from conversation history

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

    text = query.lower().strip()

    # remove filler phrases
    for phrase in FILLER_WORDS:
        text = text.replace(phrase, "")

    # remove extra spaces
    text = re.sub(r"\s+", " ", text)
    text = text.strip().capitalize()

    return text

def extract_keywords(text: str):

    text = text.lower()
    found = []

    for keyword in KEYWORD_RULES:
        if keyword in text:
            found.append(keyword)

    return list(set(found))[:5]
