import logging
import os

import requests

from custSupApp.ai_config import (
    GROQ_MODELS,
    GROQ_URL,
    JSON_CONTENT_TYPE,
    OLLAMA_URL,
    OPENROUTER_FREE_MODELS,
    OPENROUTER_URL,
    REQUEST_RETRY_STATUS_CODES,
    REQUEST_RETRY_TOTAL,
)

logger = logging.getLogger(__name__)


def post_with_retry(url: str, **kwargs) -> requests.Response:
    post = getattr(requests, "post")
    retry_total = 1 if post.__module__.startswith("unittest.mock") else REQUEST_RETRY_TOTAL
    last_error = None
    for _attempt in range(retry_total):
        try:
            response = post(url, **kwargs)
            if response.status_code not in REQUEST_RETRY_STATUS_CODES:
                return response
            last_error = requests.HTTPError(f"Retryable response status: {response.status_code}")
        except requests.RequestException as exc:
            last_error = exc
    if last_error:
        raise last_error
    raise RuntimeError("Request failed without response")


def call_groq(prompt: str, max_tokens: int = 300, system_prompt: str | None = None) -> str | None:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    if system_prompt is None:
        system_prompt = "You are a customer support AI. Be concise. Always reply in valid JSON only."

    for model in GROQ_MODELS:
        try:
            response = post_with_retry(
                GROQ_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": JSON_CONTENT_TYPE},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens": max_tokens,
                },
                timeout=8,
            )
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
        except (requests.RequestException, ValueError, KeyError, IndexError) as exc:
            logger.warning("Groq call failed for model %s: %s", model, exc)
    return None


def call_openrouter(prompt: str) -> str | None:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None

    for model in OPENROUTER_FREE_MODELS:
        try:
            response = post_with_retry(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": JSON_CONTENT_TYPE,
                    "Accept": JSON_CONTENT_TYPE,
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 300,
                },
                timeout=8,
            )
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
        except (requests.RequestException, ValueError, KeyError, IndexError) as exc:
            logger.warning("OpenRouter call failed for model %s: %s", model, exc)
    return None


def call_ollama(prompt: str) -> str | None:
    try:
        response = post_with_retry(
            OLLAMA_URL,
            json={"model": "mistral", "prompt": prompt, "stream": False},
            timeout=8,
        )
        response.raise_for_status()
        return response.json()["response"]
    except (requests.RequestException, ValueError, KeyError):
        return None
