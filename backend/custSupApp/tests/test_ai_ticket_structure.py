import unittest
from unittest.mock import MagicMock, Mock, patch

import requests

from custSupApp import ai


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

    @patch("custSupApp.ai.call_openrouter", return_value='{"priority": "high", "category": "billing", "description": "Issue", "context_summary": "Summary"}')
    @patch("custSupApp.ai.call_groq", return_value=None)
    def test_extract_ticket_structure_with_llm_falls_back_to_openrouter(self, _mock_groq, _mock_openrouter):
        result = ai.extract_ticket_structure_with_llm("Billing issue", [{"role": "user", "content": "Help"}])

        self.assertEqual(result["priority"], "high")
        self.assertEqual(result["category"], "billing")

    @patch("custSupApp.ai.call_ollama", side_effect=RuntimeError("offline"))
    @patch("custSupApp.ai.call_openrouter", return_value=None)
    @patch("custSupApp.ai.call_groq", return_value=None)
    def test_extract_ticket_structure_with_llm_returns_none_when_backends_fail(
        self,
        _mock_groq,
        _mock_openrouter,
        _mock_ollama,
    ):
        self.assertIsNone(ai.extract_ticket_structure_with_llm("Billing issue", []))

    @patch("custSupApp.ai.call_openrouter", return_value="not-json")
    @patch("custSupApp.ai.call_groq", return_value=None)
    def test_extract_ticket_structure_with_llm_returns_none_for_invalid_json(self, _mock_groq, _mock_openrouter):
        self.assertIsNone(ai.extract_ticket_structure_with_llm("Billing issue", []))


