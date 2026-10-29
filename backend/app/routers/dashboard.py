"""Dashboard aggregation endpoint."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends

from ..db import query, query_one
from ..deps import Session, get_session
from ..routers.missions import mission_summary
from ..services.provider_factory import provider_status

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(session: Session = Depends(get_session)):
    workspace_id = session.workspace_id

    qualified = query_one(
        "SELECT COUNT(*) AS n FROM leads WHERE workspace_id = ?", (workspace_id,)
    )["n"]
    high_intent = query_one(
        "SELECT COUNT(*) AS n FROM leads WHERE workspace_id = ? AND score >= 80", (workspace_id,)
    )["n"]
    outreach_ready = query_one(
        "SELECT COUNT(*) AS n FROM outreach_messages WHERE workspace_id = ?", (workspace_id,)
    )["n"]
    awaiting_review = query_one(
        "SELECT COUNT(*) AS n FROM outreach_messages WHERE workspace_id = ? AND status = 'ready'",
        (workspace_id,),
    )["n"]
    follow_ups_due = query_one(
        """SELECT COUNT(*) AS n FROM follow_ups
           WHERE workspace_id = ? AND status != 'completed' AND due_date <= ?""",
        (workspace_id, date.today().isoformat()),
    )["n"]

    missions = query(
        "SELECT * FROM missions WHERE workspace_id = ? ORDER BY created_at DESC", (workspace_id,)
    )
    summaries = [mission_summary(m) for m in missions]
    running = [m for m in summaries if m["status"] == "running"]
    recent = [m for m in summaries if m["status"] != "running"][:4]

    activity = query(
        """SELECT a.*, m.title AS mission_title FROM activity_logs a
           LEFT JOIN missions m ON m.id = a.mission_id
           WHERE a.workspace_id = ? ORDER BY a.created_at DESC, a.rowid DESC LIMIT 8""",
        (workspace_id,),
    )

    return {
        "snapshot": {
            "qualified_leads": qualified,
            "high_intent": high_intent,
            "outreach_ready": outreach_ready,
            "awaiting_review": awaiting_review,
            "follow_ups_due": follow_ups_due,
        },
        "active_missions": running,
        "recent_missions": recent,
        "activity": activity,
        "provider": provider_status(),
        "user": {"name": session.user["name"], "email": session.user["email"]},
        "workspace": {"name": session.workspace["name"], "plan": session.workspace["plan"]},
    }
