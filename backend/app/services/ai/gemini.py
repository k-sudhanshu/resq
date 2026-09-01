"""Gemini provider: a plain HTTPS call to generateContent.

Uses httpx rather than a vendor SDK to keep the dependency surface small and
the request shape visible. Any failure — timeout, HTTP error, unparseable
body, wrong shape — is converted to AIUnavailableError so the pipeline has a
single failure path.
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

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_model
        self.timeout = settings.ai_timeout_seconds
        if not self.api_key:
            raise RuntimeError("AI_PROVIDER=gemini requires GEMINI_API_KEY")

    async def analyze(
        self, context: AIRequestContext, image: Optional[bytes]
    ) -> Guidance:
        registry = get_registry()
        system_prompt = build_system_prompt(
            context.language, sorted(registry.sources.keys())
        )
        parts: list[dict[str, Any]] = [{"text": build_user_data_block(context)}]
        if image is not None:
            parts.append(
                {"inline_data": {"mime_type": "image/jpeg", "data": _b64(image)}}
            )

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        url = f"{API_BASE}/{self.model}:generateContent"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    params={"key": self.api_key},
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
                "gemini_http_error",
                extra={"extra_fields": {"status": response.status_code}},
            )
            raise AIUnavailableError(f"http_{response.status_code}")

        return _parse_guidance(response.json())


def _b64(data: bytes) -> str:
    import base64

    return base64.b64encode(data).decode("ascii")


def _parse_guidance(body: dict[str, Any]) -> Guidance:
    try:
        candidate = body["candidates"][0]
        text = "".join(
            part.get("text", "") for part in candidate["content"]["parts"]
        )
    except (KeyError, IndexError, TypeError) as exc:
        raise AIUnavailableError("unexpected_response_envelope") from exc

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AIUnavailableError("response_not_json") from exc

    try:
        return Guidance(**data)
    except ValidationError as exc:
        logger.warning(
            "gemini_schema_violation",
            extra={"extra_fields": {"errors": exc.error_count()}},
        )
        raise AIUnavailableError("schema_violation") from exc
