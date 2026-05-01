import unittest
from unittest.mock import MagicMock, Mock, patch

import requests
from pydantic import ValidationError

import ai_assistant.ai as ai
from ai_assistant.schemas import AIRequestInput, ChatHistoryMessage, ChatLLMResponse, TicketStructure


class TestAITicketStructure(unittest.TestCase):
    def test_validate_ticket_structure_checks_required_fields(self):
        valid = {
            "priority": "high",
            "category": "billing",
            "description": "Payment failed",
        }
        invalid = {"priority": "urgent", "category": "billing", "description": ""}
        self.assertTrue(ai.validate_ticket_structure(valid))
        self.assertFalse(ai.validate_ticket_structure(invalid))

    def test_validate_ticket_structure_requires_description_even_when_other_fields_are_valid(self):
        self.assertFalse(ai.validate_ticket_structure({"priority": "high", "category": "billing"}))

    @patch("ai_assistant.ai.call_openrouter", return_value='{"priority": "high", "category": "billing", "description": "Issue", "context_summary": "Summary"}')
    @patch("ai_assistant.ai.call_groq", return_value=None)
    def test_extract_ticket_structure_with_llm_falls_back_to_openrouter(self, _mock_groq, _mock_openrouter):
        result = ai.extract_ticket_structure_with_llm("Billing issue", [{"role": "user", "content": "Help"}])

        self.assertEqual(result["priority"], "high")
        self.assertEqual(result["category"], "billing")

    @patch("ai_assistant.ai.call_ollama", side_effect=RuntimeError("offline"))
    @patch("ai_assistant.ai.call_openrouter", return_value=None)
    @patch("ai_assistant.ai.call_groq", return_value=None)
    def test_extract_ticket_structure_with_llm_returns_empty_dict_when_backends_fail(
        self,
        _mock_groq,
        _mock_openrouter,
        _mock_ollama,
    ):
        self.assertEqual(ai.extract_ticket_structure_with_llm("Billing issue", []), {})

    @patch("ai_assistant.ai.call_openrouter", return_value="not-json")
    @patch("ai_assistant.ai.call_groq", return_value=None)
    def test_extract_ticket_structure_with_llm_returns_empty_dict_for_invalid_json(self, _mock_groq, _mock_openrouter):
        self.assertEqual(ai.extract_ticket_structure_with_llm("Billing issue", []), {})

    def test_ai_schema_validators_handle_missing_and_optional_text(self):
        with self.assertRaises(ValidationError):
            ChatHistoryMessage(role="user", content=None)
        with self.assertRaises(ValidationError):
            AIRequestInput(query=None)
        with self.assertRaises(ValidationError):
            ChatLLMResponse(intent=None, reply="answer", confidence=0.5)

        ticket = TicketStructure(
            category="billing",
            priority="high",
            description="Payment failed",
            context_summary=None,
        )
        self.assertEqual(ticket.context_summary, "")


