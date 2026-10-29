"""Workspace settings endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..db import execute, query
from ..deps import Session, get_session
from ..repository import now

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULTS = {
    "profile": {
        "name": "Sadik",
        "role": "Founder & Growth Lead",
        "email": "sadik@myagency.in",
        "company": "My Agency",
        "timezone": "Asia/Kolkata",
    },
    "security": {
        "two_factor": False,
        "session_timeout": "12 hours",
        "password_rotated": "2026-08-14",
    },
    "notifications": {
        "mission_complete": True,
        "lead_high_intent": True,
        "outreach_review": True,
        "weekly_digest": False,
        "channel": "Email",
    },
    "ai_preferences": {
        "auto_approve_high_confidence": False,
        "minimum_confidence": 0.8,
        "research_depth": "Deep",
        "tone": "Consultative",
    },
}


@router.get("")
def get_settings(session: Session = Depends(get_session)):
    rows = query(
        "SELECT key, value FROM workspace_settings WHERE workspace_id = ?", (session.workspace_id,)
    )
    stored = {row["key"]: row["value"] for row in rows}
    merged = {section: {**values, **stored.get(section, {})} for section, values in DEFAULTS.items()}
    return {
        "settings": merged,
        "workspace": session.workspace,
        "user": {
            "id": session.user["id"],
            "name": session.user["name"],
            "email": session.user["email"],
            "role": session.user["role"],
        },
    }


class SettingsUpdate(BaseModel):
    section: str = Field(min_length=2, max_length=40)
    values: dict = Field(default_factory=dict)


@router.patch("")
def update_settings(payload: SettingsUpdate, session: Session = Depends(get_session)):
    from ..security import new_id

    existing = {
        row["key"]: row["value"]
        for row in query(
            "SELECT key, value FROM workspace_settings WHERE workspace_id = ?", (session.workspace_id,)
        )
    }
    current = {**DEFAULTS.get(payload.section, {}), **existing.get(payload.section, {})}
    current.update(payload.values)
    execute(
        """INSERT INTO workspace_settings (id, workspace_id, key, value, updated_at) VALUES (?,?,?,?,?)
           ON CONFLICT(workspace_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at""",
        (new_id("set"), session.workspace_id, payload.section, __import__("json").dumps(current), now()),
    )
    return {"section": payload.section, "values": current}
