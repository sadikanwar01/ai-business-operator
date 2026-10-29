"""Provider selection.

One place decides which AI backend the Operator talks to. The rest of the
application only ever sees the `AIProvider` interface.
"""

from __future__ import annotations

from ..config import settings
from .ai_provider import AIProvider
from .demo import DemoProvider
from .nebius import NebiusProvider


def build_provider() -> AIProvider:
    if settings.nebius_configured:
        return NebiusProvider()
    return DemoProvider()


def provider_status() -> dict:
    provider = build_provider()
    return {
        "provider": provider.name,
        "mode": provider.mode,
        "model": provider.model,
        "live_configured": settings.nebius_configured,
        "base_url": settings.nebius_base_url if provider.mode == "live" else None,
    }
