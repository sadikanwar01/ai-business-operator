"""Follow-up workspace endpoints."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..db import query
from ..deps import Session, get_session
from ..repository import now

router = APIRouter(prefix="/api/follow-ups", tags=["follow-ups"])


@router.get("")
def list_follow_ups(
    limit: int = Query(default=100, ge=1, le=300),
    session: Session = Depends(get_session),
):
    rows = query(
        """SELECT f.*, c.name AS company, c.city, l.score, l.tier, l.id AS lead_id,
                  o.subject, o.status AS outreach_status
           FROM follow_ups f
           JOIN leads l ON l.id = f.lead_id
           JOIN companies c ON c.id = l.company_id
           LEFT JOIN outreach_messages o ON o.id = f.outreach_id
           WHERE f.workspace_id = ?
           ORDER BY f.due_date ASC, f.rowid ASC LIMIT ?""",
        (session.workspace_id, limit),
    )
    today = date.today().isoformat()
    overdue, due_today, upcoming, completed = [], [], [], []
    for row in rows:
        row["label"] = _label(row["due_date"], today)
        if row["status"] == "completed":
            completed.append(row)
        elif row["due_date"] < today:
            overdue.append(row)
        elif row["due_date"] == today:
            due_today.append(row)
        else:
            upcoming.append(row)
    return {
        "overdue": overdue,
        "today": due_today,
        "upcoming": upcoming,
        "completed": completed,
        "total": len(rows),
    }


def _label(due_date: str, today: str) -> str:
    if due_date == today:
        return "Due today"
    try:
        delta = (date.fromisoformat(due_date) - date.fromisoformat(today)).days
    except ValueError:
        return due_date
    if delta == 1:
        return "Tomorrow"
    if delta < 0:
        return f"{-delta} days overdue"
    return f"In {delta} days"


class FollowUpUpdate(BaseModel):
    status: str


@router.patch("/{follow_up_id}")
def update_follow_up(follow_up_id: str, payload: FollowUpUpdate, session: Session = Depends(get_session)):
    from ..db import execute

    execute(
        "UPDATE follow_ups SET status = ? WHERE id = ? AND workspace_id = ?",
        (payload.status, follow_up_id, session.workspace_id),
    )
    return {"updated_at": now(), "id": follow_up_id, "status": payload.status}
