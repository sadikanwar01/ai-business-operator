"""Infrastructure metadata endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from ..services.provider_factory import provider_status

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/provider")
def provider():
    """Lightweight provider status used by the top bar."""
    return provider_status()
