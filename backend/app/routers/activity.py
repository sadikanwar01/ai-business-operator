"""Activity log endpoints."""

from __future__ import annotations

from collections import OrderedDict

from fastapi import APIRouter, Depends, Query

from ..db import query
from ..deps import Session, get_session

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("")
def list_activity(
    limit: int = Query(default=200, ge=1, le=500),
    mission: str | None = Query(default=None, max_length=120),
    session: Session = Depends(get_session),
):
    sql = [
        """SELECT a.*, m.title AS mission_title FROM activity_logs a
           LEFT JOIN missions m ON m.id = a.mission_id
           WHERE a.workspace_id = ?""",
    ]
    params: list = [session.workspace_id]
    if mission:
        sql.append("AND (m.id = ? OR m.title = ?)")
        params.extend([mission, mission])
    sql.append("ORDER BY a.created_at DESC, a.rowid DESC LIMIT ?")
    params.append(limit)

    rows = query(" ".join(sql), params)
    groups: OrderedDict[str, list] = OrderedDict()
    for row in rows:
        day = str(row["created_at"])[:10]
        groups.setdefault(day, []).append(row)
    return {
        "groups": [{"date": day, "entries": entries} for day, entries in groups.items()],
        "entries": rows,
    }
