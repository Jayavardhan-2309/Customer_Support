import logging

from custSupApp.ai_config import (
    CRITICAL_KEYWORDS,
    ESCALATION_LIMIT_REPLY,
    MAX_DAILY_ESCALATIONS,
    NO_CONTEXT_FIRST_REPLY,
    NO_CONTEXT_SECOND_REPLY,
)

logger = logging.getLogger(__name__)


def escalation_limit_reached(escalation_count: int) -> bool:
    return escalation_count >= MAX_DAILY_ESCALATIONS


def count_no_context_turns(history: list[dict]) -> int:
    no_context_markers = [NO_CONTEXT_FIRST_REPLY[:40], NO_CONTEXT_SECOND_REPLY[:40]]
    count = 0
    for msg in reversed(history):
        if msg["role"] not in ("assistant", "ai"):
            continue
        if any(msg["content"].startswith(marker) for marker in no_context_markers):
            count += 1
        else:
            break
    return count


def user_wants_escalation(query: str) -> bool:
    triggers = [
        "escalate", "human agent", "talk to someone", "speak to agent",
        "real person", "transfer me", "get support", "yes please",
        "yes escalate", "connect me",
    ]
    return any(trigger in query.lower() for trigger in triggers)


def evaluate_escalation_risk(query: str, intent: str, confidence: float, sentiment_frustrated: bool) -> bool:
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


def handle_escalated(intent: str, escalation_count: int, confidence: float, escalated: bool, frustrated: bool):
    if escalation_limit_reached(escalation_count):
        logger.info("Escalation warranted but daily limit reached.")
        return ("escalation_limit", ESCALATION_LIMIT_REPLY, confidence, False)
    if frustrated:
        reply = "I'm sorry you're experiencing this. I've escalated this to our team for immediate attention."
        return intent, reply, confidence, escalated
    return (
        intent,
        "This issue needs human attention, so I've escalated it to our support team.",
        confidence,
        escalated,
    )


def handle_escalation(query: str, escalation_count: int):
    if not user_wants_escalation(query):
        return None
    if escalation_limit_reached(escalation_count):
        logger.info("User requested escalation but daily limit reached.")
        return ("escalation_limit", ESCALATION_LIMIT_REPLY, 1.0, False)
    return ("escalation", "Sure, let me connect you with a human agent right away.", 1.0, True)


def extract_repetition(history: list[dict], escalation_count: int):
    assistant_msgs = [m["content"].strip() for m in history if m["role"] in ("assistant", "ai")]
    no_context_markers = [NO_CONTEXT_FIRST_REPLY[:40], NO_CONTEXT_SECOND_REPLY[:40]]
    substantive = [
        msg for msg in assistant_msgs
        if len(msg) > 60 and not any(msg.startswith(marker) for marker in no_context_markers)
    ]
    if not substantive:
        return None

    most_recent = substantive[-1]
    escalation_phrase = "I noticed I'm giving you the same answer repeatedly"
    if escalation_phrase in most_recent or substantive.count(most_recent) < 2:
        return None
    logger.warning("AI repeated factual reply %d times.", substantive.count(most_recent))
    if escalation_limit_reached(escalation_count):
        return ("escalation_limit", ESCALATION_LIMIT_REPLY, 0.0, False)
    return (
        "escalation",
        "I noticed I'm giving you the same answer repeatedly, which means "
        "I don't have better information on this. Let me get a human agent "
        "to help you properly.",
        0.0,
        True,
    )


def handle_no_context(no_context_turns: int, escalation_count: int, confidence: float):
    if no_context_turns == 0:
        logger.info("No context - asking user to elaborate (turn 1).")
        return ("no_context", NO_CONTEXT_FIRST_REPLY, confidence, False)
    if no_context_turns == 1:
        logger.info("No context again - offering escalation choice (turn 2).")
        return ("no_context", NO_CONTEXT_SECOND_REPLY, confidence, False)

    logger.info("Persistent no-context after %d turns - auto-escalating.", no_context_turns)
    if escalation_limit_reached(escalation_count):
        return ("escalation_limit", ESCALATION_LIMIT_REPLY, confidence, False)
    return (
        "escalation",
        "I've asked a couple of times but I still don't have a good answer for this. "
        "I'm escalating this to our support team now so they can help you directly.",
        confidence,
        True,
    )
