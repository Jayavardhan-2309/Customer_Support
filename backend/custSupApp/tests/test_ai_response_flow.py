import unittest
from unittest.mock import MagicMock, Mock, patch

import requests

from custSupApp import ai


class TestAIResponseFlow(unittest.TestCase):
    @patch("custSupApp.ai.handle_escalation", return_value=None)
    @patch("custSupApp.ai.extract_repetition", return_value=None)
    @patch("custSupApp.ai.is_user_frustrated", return_value=False)
    @patch("custSupApp.ai.search_similar_chunks", return_value=["doc"])
    @patch("custSupApp.ai.call_groq", return_value='{"intent":"general","reply":"answer","confidence":0.8}')
    @patch("custSupApp.ai.evaluate_escalation_risk", return_value=False)
    def test_get_ai_response_defaults_history_when_none(
        self,
        _mock_risk,
        _mock_call_groq,
        _mock_search,
        _mock_frustrated,
        _mock_repetition,
        _mock_escalation,
    ):
        result = ai.get_ai_response("normal question", history=None, org_id=1, escalation_count=0)
        self.assertEqual(result, ("general", "answer", 0.8, False))

    @patch("custSupApp.ai.handle_escalation")
    def test_get_ai_response_returns_explicit_escalation_result(self, mock_handle_escalation):
        mock_handle_escalation.return_value = ("escalation", "connecting", 1.0, True)

        result = ai.get_ai_response("need human", [])

        self.assertEqual(result, ("escalation", "connecting", 1.0, True))

    @patch("custSupApp.ai.handle_escalation", return_value=None)
    @patch("custSupApp.ai.extract_repetition", return_value=None)
    @patch("custSupApp.ai.is_user_frustrated", return_value=False)
    @patch("custSupApp.ai.search_similar_chunks", return_value=[])
    @patch("custSupApp.ai.call_groq", return_value='{"intent":"unknown","reply":"no answer","confidence":0.2}')
    def test_get_ai_response_handles_no_context(
        self,
        _mock_call_groq,
        _mock_search,
        _mock_frustrated,
        _mock_repetition,
        _mock_escalation,
    ):
        result = ai.get_ai_response("Where is the legal refund form?", history=[], org_id=1, escalation_count=0)
        self.assertEqual(result, ("no_context", ai.NO_CONTEXT_FIRST_REPLY, 0.2, False))

    @patch("custSupApp.ai.handle_escalation", return_value=None)
    @patch("custSupApp.ai.extract_repetition", return_value=None)
    @patch("custSupApp.ai.is_user_frustrated", return_value=False)
    @patch("custSupApp.ai.search_similar_chunks", return_value=["doc"])
    @patch("custSupApp.ai.call_groq", return_value='{"intent":"general","reply":"answer","confidence":0.8}')
    @patch("custSupApp.ai.evaluate_escalation_risk", return_value=False)
    def test_get_ai_response_returns_normal_llm_result(
        self,
        _mock_risk,
        _mock_call_groq,
        _mock_search,
        _mock_frustrated,
        _mock_repetition,
        _mock_escalation,
    ):
        result = ai.get_ai_response("normal question", history=[], org_id=1, escalation_count=0)
        self.assertEqual(result, ("general", "answer", 0.8, False))

    @patch("custSupApp.ai.handle_escalation", return_value=None)
    @patch("custSupApp.ai.extract_repetition", return_value=("escalation", "repeat", 0.0, True))
    def test_get_ai_response_returns_repetition_result(self, _mock_repetition, _mock_escalation):
        result = ai.get_ai_response("same question", history=[], org_id=1, escalation_count=0)

        self.assertEqual(result, ("escalation", "repeat", 0.0, True))

    @patch("custSupApp.ai.handle_escalation", return_value=None)
    @patch("custSupApp.ai.extract_repetition", return_value=None)
    @patch("custSupApp.ai.is_user_frustrated", return_value=False)
    @patch("custSupApp.ai.search_similar_chunks", return_value=["doc"])
    @patch("custSupApp.ai.call_groq", return_value='{"intent":"billing","reply":"needs help","confidence":0.4}')
    @patch("custSupApp.ai.evaluate_escalation_risk", return_value=True)
    def test_get_ai_response_returns_escalated_result(
        self,
        _mock_risk,
        _mock_call_groq,
        _mock_search,
        _mock_frustrated,
        _mock_repetition,
        _mock_escalation,
    ):
        result = ai.get_ai_response("billing issue", history=[], org_id=1, escalation_count=0)
        self.assertEqual(result[0], "billing")
        self.assertTrue(result[3])

    @patch("custSupApp.ai.handle_escalation", return_value=None)
    @patch("custSupApp.ai.extract_repetition", return_value=None)
    @patch("custSupApp.ai.is_user_frustrated", return_value=False)
    @patch("custSupApp.ai.search_similar_chunks", return_value=[])
    @patch("custSupApp.ai.call_groq", return_value='{"intent":"general","reply":"hello there","confidence":0.9}')
    def test_get_ai_response_skips_no_context_ladder_for_greetings(
        self,
        _mock_call_groq,
        _mock_search,
        _mock_frustrated,
        _mock_repetition,
        _mock_escalation,
    ):
        result = ai.get_ai_response("hello", history=[], org_id=1, escalation_count=0)
        self.assertEqual(result, ("general", "hello there", 0.9, False))

    @patch("custSupApp.ai.handle_escalation", return_value=None)
    @patch("custSupApp.ai.extract_repetition", return_value=None)
    @patch("custSupApp.ai.is_user_frustrated", return_value=False)
    @patch("custSupApp.ai.search_similar_chunks", return_value=["doc"])
    @patch("custSupApp.ai.call_groq", return_value="not json")
    def test_get_ai_response_handles_missing_json(
        self,
        _mock_call_groq,
        _mock_search,
        _mock_frustrated,
        _mock_repetition,
        _mock_escalation,
    ):
        result = ai.get_ai_response("normal question", history=[], org_id=1, escalation_count=0)
        self.assertEqual(result, ("error", "Invalid response from AI", 0.0, False))

    @patch("custSupApp.ai.handle_escalation", return_value=None)
    @patch("custSupApp.ai.extract_repetition", return_value=None)
    @patch("custSupApp.ai.is_user_frustrated", return_value=False)
    @patch("custSupApp.ai.search_similar_chunks", return_value=["doc"])
    @patch("custSupApp.ai.call_groq", return_value="{bad json}")
    def test_get_ai_response_handles_invalid_json(
        self,
        _mock_call_groq,
        _mock_search,
        _mock_frustrated,
        _mock_repetition,
        _mock_escalation,
    ):
        result = ai.get_ai_response("normal question", history=[], org_id=1, escalation_count=0)
        self.assertEqual(result, ("error", "Sorry, something went wrong. Please try again.", 0.0, False))

    @patch("custSupApp.ai.handle_escalation", return_value=None)
    @patch("custSupApp.ai.extract_repetition", return_value=None)
    @patch("custSupApp.ai.is_user_frustrated", return_value=False)
    @patch("custSupApp.ai.search_similar_chunks", return_value=["doc"])
    @patch("custSupApp.ai.call_groq", return_value=None)
    @patch("custSupApp.ai.call_openrouter", return_value=None)
    @patch("custSupApp.ai.call_ollama", return_value=None)
    def test_get_ai_response_raises_when_no_backend_available(
        self,
        _mock_ollama,
        _mock_openrouter,
        _mock_groq,
        _mock_search,
        _mock_frustrated,
        _mock_repetition,
        _mock_escalation,
    ):
        with self.assertRaises(RuntimeError):
            ai.get_ai_response("normal question", history=[], org_id=1, escalation_count=0)
