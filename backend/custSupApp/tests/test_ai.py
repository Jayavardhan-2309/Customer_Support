import unittest
from unittest.mock import MagicMock, Mock, patch

import requests

from custSupApp import ai


class TestAIHelpers(unittest.TestCase):
    def test_escalation_limit_reached(self):
        self.assertFalse(ai._escalation_limit_reached(2))
        self.assertTrue(ai._escalation_limit_reached(3))

    def test_count_no_context_turns_only_counts_current_streak(self):
        history = [
            {"role": "ai", "content": "Normal answer"},
            {"role": "user", "content": "help"},
            {"role": "assistant", "content": ai.NO_CONTEXT_FIRST_REPLY},
            {"role": "user", "content": "more"},
            {"role": "ai", "content": ai.NO_CONTEXT_SECOND_REPLY},
        ]
        self.assertEqual(ai._count_no_context_turns(history), 2)

    def test_user_wants_escalation_detects_trigger_phrase(self):
        self.assertTrue(ai._user_wants_escalation("Please connect me to a human agent"))
        self.assertFalse(ai._user_wants_escalation("Just checking my ticket"))

    def test_evaluate_escalation_risk_for_greeting_is_false(self):
        self.assertFalse(ai.evaluate_escalation_risk("hello", "general", 0.9, False))

    def test_evaluate_escalation_risk_for_critical_keyword_is_true(self):
        self.assertTrue(ai.evaluate_escalation_risk("I want a refund now", "general", 0.8, False))

    def test_evaluate_escalation_risk_for_low_confidence_and_sensitive_intents(self):
        self.assertTrue(ai.evaluate_escalation_risk("My account is locked", "general", 0.1, False))
        self.assertTrue(ai.evaluate_escalation_risk("Please help", "account_security", 0.8, False))
        self.assertTrue(ai.evaluate_escalation_risk("Please help", "general", 0.4, True))

    def test_evaluate_escalation_risk_returns_false_when_no_rules_match(self):
        self.assertFalse(ai.evaluate_escalation_risk("order status update please", "general", 0.8, False))

    def test_build_prompt_includes_recent_history_and_context(self):
        prompt = ai.build_prompt(
            "KB details",
            [{"role": "user", "content": "Hi"}, {"role": "ai", "content": "Hello"}],
            "Where is my refund?",
        )
        self.assertIn("KB details", prompt)
        self.assertIn("User: Hi", prompt)
        self.assertIn("assistant: Hello", prompt)
        self.assertIn("Where is my refund?", prompt)

    def test_build_prompt_uses_fallback_text_when_history_is_empty(self):
        prompt = ai.build_prompt("KB details", [], "Question")

        self.assertIn("No previous conversation.", prompt)

    def test_build_sentiment_prompt_contains_message(self):
        prompt = ai.build_sentiment_prompt("I am upset")
        self.assertIn("I am upset", prompt)
        self.assertIn("frustrated", prompt)

    @patch("custSupApp.ai.call_groq")
    def test_is_user_frustrated_detects_negative_sentiment(self, mock_call_groq):
        mock_call_groq.return_value = "frustrated"
        self.assertTrue(ai.is_user_frustrated("This is terrible"))

    @patch("custSupApp.ai.call_groq")
    def test_is_user_frustrated_returns_false_when_no_result(self, mock_call_groq):
        mock_call_groq.return_value = None
        self.assertFalse(ai.is_user_frustrated("This is terrible"))

    @patch("custSupApp.ai.embed_text")
    def test_search_similar_chunks_returns_cursor_rows(self, mock_embed_text):
        mock_embed_text.return_value = [0.1, 0.2]
        cursor = MagicMock()
        cursor.fetchall.return_value = [("doc one",), ("doc two",)]
        fake_connection = MagicMock()
        fake_connection.cursor.return_value.__enter__.return_value = cursor

        with patch.object(ai, "connection", fake_connection):
            result = ai.search_similar_chunks("query", 10, k=2)

        self.assertEqual(result, ["doc one", "doc two"])
        cursor.execute.assert_called_once()

    @patch("custSupApp.ai.embed_text")
    def test_search_similar_chunks_returns_empty_list_when_embedding_fails(self, mock_embed_text):
        mock_embed_text.side_effect = RuntimeError("embed failed")
        self.assertEqual(ai.search_similar_chunks("query", 10), [])

    @patch("custSupApp.ai.requests.post")
    @patch.dict("os.environ", {"GROQ_API_KEY": "token"})
    def test_call_groq_returns_message_content(self, mock_post):
        response = Mock(status_code=200)
        response.json.return_value = {"choices": [{"message": {"content": "groq answer"}}]}
        mock_post.return_value = response

        result = ai.call_groq("hello")

        self.assertEqual(result, "groq answer")

    @patch.dict("os.environ", {}, clear=True)
    def test_call_groq_returns_none_without_api_key(self):
        self.assertIsNone(ai.call_groq("hello"))

    @patch("custSupApp.ai.requests.post")
    @patch.dict("os.environ", {"GROQ_API_KEY": "token"})
    def test_call_groq_retries_models_and_returns_none_after_failures(self, mock_post):
        mock_post.side_effect = [
            Mock(status_code=500),
            requests.RequestException("network"),
        ]

        self.assertIsNone(ai.call_groq("hello"))

    @patch("custSupApp.ai.requests.post")
    @patch.dict("os.environ", {"OPENROUTER_API_KEY": "token"})
    def test_call_openrouter_returns_message_content(self, mock_post):
        response = Mock(status_code=200)
        response.json.return_value = {"choices": [{"message": {"content": "openrouter answer"}}]}
        mock_post.return_value = response

        result = ai.call_openrouter("hello")

        self.assertEqual(result, "openrouter answer")

    @patch.dict("os.environ", {}, clear=True)
    def test_call_openrouter_returns_none_without_api_key(self):
        self.assertIsNone(ai.call_openrouter("hello"))

    @patch("custSupApp.ai.requests.post")
    @patch.dict("os.environ", {"OPENROUTER_API_KEY": "token"})
    def test_call_openrouter_returns_none_after_model_failures(self, mock_post):
        mock_post.side_effect = [
            Mock(status_code=429),
            ValueError("bad json"),
            KeyError("choices"),
            IndexError("missing"),
            requests.RequestException("network"),
            Mock(status_code=500),
        ]

        self.assertIsNone(ai.call_openrouter("hello"))

    @patch("custSupApp.ai.requests.post")
    def test_call_ollama_returns_response_text(self, mock_post):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {"response": "ollama answer"}
        mock_post.return_value = response

        result = ai.call_ollama("hello")

        self.assertEqual(result, "ollama answer")

    @patch("custSupApp.ai.requests.post", side_effect=requests.RequestException("offline"))
    def test_call_ollama_returns_none_when_request_fails(self, _mock_post):
        self.assertIsNone(ai.call_ollama("hello"))

    def test_handle_escalated_returns_default_reply_when_not_frustrated(self):
        result = ai.handle_escalated("billing", 0, 0.2, True, False)
        self.assertEqual(
            result,
            (
                "billing",
                "This issue needs human attention, so I've escalated it to our support team.",
                0.2,
                True,
            ),
        )

    def test_handle_escalation_respects_limit(self):
        result = ai.handle_escalation("please escalate this", 3)
        self.assertEqual(result, ("escalation_limit", ai.ESCALATION_LIMIT_REPLY, 1.0, False))

    def test_handle_escalated_returns_limit_and_frustrated_variants(self):
        limited = ai.handle_escalated("billing", 3, 0.2, True, False)
        frustrated = ai.handle_escalated("billing", 0, 0.2, True, True)

        self.assertEqual(limited, ("escalation_limit", ai.ESCALATION_LIMIT_REPLY, 0.2, False))
        self.assertEqual(
            frustrated,
            (
                "billing",
                "I'm sorry you're experiencing this. I've escalated this to our team for immediate attention.",
                0.2,
                True,
            ),
        )

    def test_handle_escalation_returns_none_for_non_escalation_queries(self):
        self.assertIsNone(ai.handle_escalation("just checking on my order", 0))

    def test_handle_escalation_returns_successful_escalation_response(self):
        self.assertEqual(
            ai.handle_escalation("yes escalate please", 0),
            ("escalation", "Sure, let me connect you with a human agent right away.", 1.0, True),
        )

    def test_extract_repetition_returns_escalation_when_same_reply_repeats(self):
        repeated = "This is a repeated answer that is definitely longer than sixty characters for the detector."
        history = [
            {"role": "ai", "content": repeated},
            {"role": "assistant", "content": repeated},
        ]

        result = ai.extract_repetition(history, 0)

        self.assertEqual(result[0], "escalation")
        self.assertTrue(result[3])

    def test_extract_repetition_skips_no_context_and_respects_limit(self):
        history = [
            {"role": "ai", "content": ai.NO_CONTEXT_FIRST_REPLY},
            {"role": "assistant", "content": ai.NO_CONTEXT_FIRST_REPLY},
        ]
        self.assertIsNone(ai.extract_repetition(history, 0))

        repeated = "This is a repeated answer that is definitely longer than sixty characters for the detector."
        limited = ai.extract_repetition(
            [{"role": "ai", "content": repeated}, {"role": "assistant", "content": repeated}],
            3,
        )
        self.assertEqual(limited, ("escalation_limit", ai.ESCALATION_LIMIT_REPLY, 0.0, False))

    def test_handle_no_context_progression(self):
        self.assertEqual(ai.handle_no_context(0, 0, 0.2), ("no_context", ai.NO_CONTEXT_FIRST_REPLY, 0.2, False))
        self.assertEqual(ai.handle_no_context(1, 0, 0.2), ("no_context", ai.NO_CONTEXT_SECOND_REPLY, 0.2, False))
        self.assertEqual(ai.handle_no_context(2, 0, 0.2)[0], "escalation")

    def test_handle_no_context_respects_escalation_limit(self):
        self.assertEqual(
            ai.handle_no_context(4, 3, 0.2),
            ("escalation_limit", ai.ESCALATION_LIMIT_REPLY, 0.2, False),
        )

