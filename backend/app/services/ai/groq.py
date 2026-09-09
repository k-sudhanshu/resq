"""Groq provider: a plain HTTPS call to the OpenAI-compatible chat API.

Second provider in the failover chain, chosen for latency: Groq serves open
models at hundreds of tokens per second, so the fallback is faster than the
primary it covers for. It reuses the exact prompts built for Gemini, so a
Groq answer goes through the same output guard and risk merge.

Text-only on purpose: Groq's current production models do not accept images
(vision models are preview-only there). When a request carries an image, the
context is rewritten with has_image=false so the prompt never claims an image
the model cannot see; guidance then rests on the structured answers, which
drive the triage anyway.
"""
import json
import logging
from typing import Any, Optional

import httpx
from pydantic import ValidationError

from app.content.registry import get_registry
from app.core.settings import get_settings
from app.schemas.ai import AIRequestContext
from app.schemas.guidance import Guidance
from app.services.ai.provider import (
    AIProvider,
    AIQuotaExceededError,
    AIUnavailableError,
)
from app.services.prompt_builder import build_system_prompt, build_user_data_block

logger = logging.getLogger(__name__)

API_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqProvider(AIProvider):
    name = "groq"

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.groq_api_key
        self.model = settings.groq_model
        self.timeout = settings.ai_timeout_seconds
        if not self.api_key:
            raise RuntimeError("GroqProvider requires GROQ_API_KEY")

    async def analyze(
        self, context: AIRequestContext, image: Optional[bytes]
    ) -> Guidance:
        registry = get_registry()
        if image is not None:
            context = context.model_copy(update={"has_image": False})
        system_prompt = build_system_prompt(
            context.language, sorted(registry.sources.keys())
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": build_user_data_block(context)},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    API_URL,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=payload,
                )
        except httpx.TimeoutException as exc:
            raise AIUnavailableError("timeout") from exc
        except httpx.HTTPError as exc:
            raise AIUnavailableError("transport_error") from exc

        if response.status_code == 429:
            raise AIQuotaExceededError("provider_quota")
        if response.status_code >= 400:
            logger.warning(
                "groq_http_error",
                extra={"extra_fields": {"status": response.status_code}},
            )
            raise AIUnavailableError(f"http_{response.status_code}")

        return _parse_guidance(response.json())


def _parse_guidance(body: dict[str, Any]) -> Guidance:
    try:
        text = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AIUnavailableError("unexpected_response_envelope") from exc
    if not text:
        raise AIUnavailableError("unexpected_response_envelope")

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AIUnavailableError("response_not_json") from exc

    try:
        return Guidance(**data)
    except ValidationError as exc:
        logger.warning(
            "groq_schema_violation",
            extra={"extra_fields": {"errors": exc.error_count()}},
        )
        raise AIUnavailableError("schema_violation") from exc
