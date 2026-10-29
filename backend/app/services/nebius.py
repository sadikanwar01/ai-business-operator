"""Nebius Token Factory provider.

Nebius AI Studio exposes an OpenAI-compatible chat completions API, so this
client speaks the standard protocol and can point at any compatible endpoint
(NVIDIA Nemotron models are served through this same interface).

Credentials are read from the environment on the server and are never sent to
the browser.
"""

from __future__ import annotations

import time

import httpx

from ..config import settings
from .ai_provider import AIProvider, AIProviderError, AIRequest, AIResponse


class NebiusProvider(AIProvider):
    name = "nebius"
    mode = "live"

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.api_key = (api_key or settings.nebius_api_key).strip()
        self.base_url = (base_url or settings.nebius_base_url).rstrip("/")
        self.model = model or settings.nebius_model
        self.timeout = timeout or settings.nebius_timeout
        self.mode = "live"

    @property
    def endpoint(self) -> str:
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        return f"{self.base_url}/chat/completions"

    async def complete(self, request: AIRequest) -> AIResponse:
        if not self.api_key:
            raise AIProviderError(
                "Nebius Token Factory is not configured. Set NEBIUS_API_KEY on the server.",
                code="provider_not_configured",
                recoverable=False,
            )

        payload: dict = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": request.system},
                {"role": "user", "content": request.prompt},
            ],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens or settings.nebius_max_tokens,
            "top_p": 0.9,
            "stream": False,
        }
        if request.json_mode:
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.endpoint, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            raise AIProviderError(
                "The AI provider timed out while processing this step.",
                code="provider_timeout",
            ) from exc
        except httpx.HTTPError as exc:
            raise AIProviderError(
                f"Could not reach the AI provider: {exc.__class__.__name__}.",
                code="provider_unreachable",
            ) from exc

        latency_ms = int((time.perf_counter() - started) * 1000)

        if response.status_code == 401:
            raise AIProviderError(
                "Nebius rejected the API key. Check NEBIUS_API_KEY on the server.",
                code="provider_unauthorized",
                recoverable=False,
            )
        if response.status_code == 404:
            raise AIProviderError(
                f"Model '{self.model}' was not found on the provider endpoint.",
                code="provider_model_missing",
                recoverable=False,
            )
        if response.status_code == 429:
            raise AIProviderError(
                "The AI provider rate limit was reached. Retry this step shortly.",
                code="provider_rate_limited",
            )
        if response.status_code >= 400:
            raise AIProviderError(
                f"The AI provider returned HTTP {response.status_code}.",
                code="provider_error",
            )

        try:
            body = response.json()
        except ValueError as exc:
            raise AIProviderError(
                "The AI provider returned a non-JSON response.", code="provider_error"
            ) from exc

        try:
            text = body["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderError(
                "The AI provider response did not contain a completion.",
                code="provider_error",
            ) from exc

        usage = body.get("usage") or {}
        return AIResponse(
            text=text,
            provider=self.name,
            model=self.model,
            mode=self.mode,
            latency_ms=latency_ms,
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
            raw=body,
        )

    async def health(self) -> dict:
        return {
            "provider": self.name,
            "mode": self.mode,
            "model": self.model,
            "endpoint": self.endpoint,
            "configured": bool(self.api_key),
            "ok": bool(self.api_key),
        }
