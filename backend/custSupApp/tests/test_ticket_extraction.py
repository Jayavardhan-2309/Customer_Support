# unit testing using pytest python framework

from tickets.services.ticket_extraction import extract_ticket_structure, extract_ticket_structure_smart
from unittest.mock import patch

def test_login_issue():

    query = "I cannot login to my account"

    history = [
        {"role": "user", "content": "I cannot login"},
        {"role": "ai", "content": "Try resetting password"},
        {"role": "user", "content": "Password reset failed"},
    ]

    data = extract_ticket_structure(query, history)

    assert data["category"] == "authentication"  # nosec B101
    assert "login" in data["description"].lower()  # nosec B101


def test_payment_issue():

    query = "My payment failed during checkout"

    history = []

    data = extract_ticket_structure(query, history)

    assert data["category"] == "billing"  # nosec B101
    assert "payment" in data["description"].lower()  # nosec B101


def test_error_issue():

    query = "System shows server error"

    history = []

    data = extract_ticket_structure(query, history)

    assert data["category"] == "technical"  # nosec B101
    assert "error" in data["description"].lower()  # nosec B101


def test_high_priority():

    query = "I cannot access my account urgently"

    data = extract_ticket_structure(query, [])

    assert data["priority"] == "high"  # nosec B101


def test_conversation_summary():

    query = "Login failed"

    history = [
        {"role": "user", "content": "I cannot login"},
        {"role": "ai", "content": "Try resetting password"},
        {"role": "user", "content": "Password reset failed"},
    ]

    data = extract_ticket_structure(query, history)

    assert "User : I cannot login" in data["context"]  # nosec B101
    assert "AI: Try resetting password" in data["context"]  # nosec B101


def test_description_cleaning():

    query = "Hi please help me I have a problem with login"

    data = extract_ticket_structure(query, [])

    assert "login" in data["description"].lower()  # nosec B101


def test_general_category():

    query = "I want to update my profile picture"

    data = extract_ticket_structure(query, [])

    assert data["category"] == "general"  # nosec B101


def test_empty_history():

    query = "Payment failed"

    history = []

    data = extract_ticket_structure(query, history)

    assert data["context"] == ""  # nosec B101

def test_keyword_extraction():

    query = "Login failed and password reset not working"

    data = extract_ticket_structure(query, [])

    assert "login" in data["keywords"]  # nosec B101
    assert "password" in data["keywords"]  # nosec B101

# valid llm extraction

@patch("tickets.services.ticket_extraction.extract_ticket_structure_with_llm")
def test_llm_valid_structure(mock_llm):
    mock_llm.return_value={
        "category": "authentication",
        "priority": "high",
        "description": "User cannot login",
        "context_summary": "User tried login multiple times"
    }

    query= "I cannot login"
    history=[]

    data= extract_ticket_structure_smart(query, history)

    assert data["category"]== "authentication"  # nosec B101
    assert data["priority"]== 'high'  # nosec B101
    assert "login" in data["description"].lower()  # nosec B101


# invalid llm output

@patch("tickets.services.ticket_extraction.extract_ticket_structure_with_llm")
def test_llm_invalid_structure_fallback(mock_llm):
    
    mock_llm.return_value={
        "category": "unknown",
        "priority": "high",
        "description": "User cannot login",
        "context_summary": "Conversation summary"
    }

    query= "I cannot login"
    history=[]

    data= extract_ticket_structure_smart(query, history)

    # rule-based extraction should classify this as authentication

    assert data["category"]== "authentication"  # nosec B101

# llm returns no validated structure

@patch("tickets.services.ticket_extraction.extract_ticket_structure_with_llm")
def test_llm_empty_structure_fallback(mock_llm):
    mock_llm.return_value= {}
    query= "My payment failed"
    history= []

    data= extract_ticket_structure_smart(query, history)

    assert data["category"]== "billing"  # nosec B101
