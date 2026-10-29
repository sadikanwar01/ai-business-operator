"""Integration catalogue endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import query, query_one
from ..deps import Session, get_session
from ..repository import now
from ..services.provider_factory import provider_status

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("")
def list_integrations(session: Session = Depends(get_session)):
    rows = query(
        "SELECT * FROM integrations WHERE workspace_id = ? ORDER BY order_index, name",
        (session.workspace_id,),
    )
    status_info = provider_status()
    for row in rows:
        if row["provider"] == "nebius":
            row["status"] = "connected" if status_info["live_configured"] else row["status"]
            row["model"] = status_info["model"]
            row["mode"] = status_info["mode"]
    return {"integrations": rows, "provider": status_info}


@router.post("/{integration_id}/{action}")
def change_integration(integration_id: str, action: str, session: Session = Depends(get_session)):
    from ..db import execute

    if action not in {"connect", "disconnect"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_action", "message": "Action must be connect or disconnect."},
        )
    row = query_one(
        "SELECT * FROM integrations WHERE id = ? AND workspace_id = ?",
        (integration_id, session.workspace_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Integration not found."})

    new_status = "connected" if action == "connect" else "available"
    execute(
        "UPDATE integrations SET status = ?, updated_at = ? WHERE id = ?",
        (new_status, now(), integration_id),
    )
    return {"integration": query_one("SELECT * FROM integrations WHERE id = ?", (integration_id,))}
