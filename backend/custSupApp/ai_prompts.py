def build_prompt(context: str, history: list[dict], query: str) -> str:
    recent_history = history[-10:] if len(history) > 10 else history
    if recent_history:
        history_lines = []
        for msg in recent_history:
            role_label = "User" if msg["role"] == "user" else "assistant"
            history_lines.append(f"{role_label}: {msg['content']}")
        history_block = "\n".join(history_lines)
    else:
        history_block = "No previous conversation."

    return f"""You are a customer support AI. Be concise and honest.

STRICT RULES:
1. Answer ONLY using the Knowledge Context below. Do NOT infer, assume, or make up information.
2. If the Knowledge Context does not contain a direct answer to the question, you MUST set confidence below 0.35 and reply that you don't have that specific information.
3. Pay close attention to WHAT the user is asking. "why" and "where" are different questions - do not answer a different question than what was asked.
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
