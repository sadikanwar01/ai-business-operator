"""Provider-agnostic AI interface.

Everything above this layer (agents, orchestrator, API) depends only on these
types. Swapping the Demo provider for Nebius Token Factory - or any other
OpenAI-compatible endpoint - happens in exactly one place.
"""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Literal

Mode = Literal["live", "demo"]


class AIProviderError(RuntimeError):
    """Raised when the upstream model call fails in a way we can explain."""

    def __init__(self, message: str, *, code: str = "ai_request_failed", recoverable: bool = True):
        super().__init__(message)
        self.code = code
        self.recoverable = recoverable


@dataclass
class AIRequest:
    task: str
    system: str
    prompt: str
    json_mode: bool = True
    temperature: float = 0.4
    max_tokens: int | None = None
    seed: int = 0
    context: dict[str, Any] = field(default_factory=dict)


@dataclass
class AIResponse:
    text: str
    provider: str
    model: str
    mode: Mode
    latency_ms: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    raw: dict[str, Any] = field(default_factory=dict)

    def json(self) -> Any:
        """Parse the model output as JSON, tolerating markdown fences."""
        candidate = self.text.strip()
        if candidate.startswith("```"):
            candidate = re.sub(r"^```[a-zA-Z]*\n?", "", candidate)
            candidate = re.sub(r"```$", "", candidate).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            start = min(
                [i for i in (candidate.find("{"), candidate.find("[")) if i != -1] or [-1]
            )
            if start == -1:
                raise AIProviderError(
                    "The model returned a response that was not valid JSON.",
                    code="invalid_model_output",
                )
            end = max(candidate.rfind("}"), candidate.rfind("]"))
            try:
                return json.loads(candidate[start : end + 1])
            except json.JSONDecodeError as exc:
                raise AIProviderError(
                    f"The model returned malformed JSON: {exc.args[0]}",
                    code="invalid_model_output",
                ) from exc


class AIProvider(ABC):
    """Base contract implemented by every provider."""

    name: str = "base"
    mode: Mode = "demo"
    model: str = "unknown"

    @abstractmethod
    async def complete(self, request: AIRequest) -> AIResponse:  # pragma: no cover - interface
        ...

    async def health(self) -> dict[str, Any]:
        return {"provider": self.name, "mode": self.mode, "model": self.model, "ok": True}
