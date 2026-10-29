"""Analytics endpoints - deliberately focused on decision-relevant numbers."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..db import query, query_one
from ..deps import Session, get_session

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _counts(mission_id: str | None, workspace_id: str) -> dict[str, int]:
    mission_clause = "AND mission_id = ?" if mission_id else ""
    params: list = [workspace_id]
    if mission_id:
        params.append(mission_id)

    researched = query_one(
        f"SELECT COUNT(*) AS n FROM companies WHERE workspace_id = ? {mission_clause}", params
    )["n"]
    qualified = query_one(
        f"SELECT COUNT(*) AS n FROM leads WHERE workspace_id = ? {mission_clause}", params
    )["n"]
    high_intent = query_one(
        f"SELECT COUNT(*) AS n FROM leads WHERE workspace_id = ? AND score >= 80 {mission_clause}",
        params,
    )["n"]
    outreach = query_one(
        f"SELECT COUNT(*) AS n FROM outreach_messages WHERE workspace_id = ? {mission_clause}", params
    )["n"]
    approved = query_one(
        f"SELECT COUNT(*) AS n FROM outreach_messages WHERE workspace_id = ? AND status = 'approved' "
        f"{mission_clause}",
        params,
    )["n"]
    avg_score = query_one(
        f"SELECT COALESCE(ROUND(AVG(score)), 0) AS n FROM leads WHERE workspace_id = ? {mission_clause}",
        params,
    )["n"]
    return {
        "researched": researched,
        "qualified": qualified,
        "high_intent": high_intent,
        "outreach": outreach,
        "approved": approved,
        "avg_score": avg_score,
    }


@router.get("")
def analytics(
    mission: str | None = Query(default=None, max_length=120),
    session: Session = Depends(get_session),
):
    workspace_id = session.workspace_id
    mission_row = None
    mission_id = None

    if mission:
        mission_row = query_one(
            "SELECT * FROM missions WHERE workspace_id = ? AND (id = ? OR title = ?)",
            (workspace_id, mission, mission),
        )
        if mission_row:
            mission_id = mission_row["id"]
    else:
        # Default to the strongest mission so the page reports mission
        # performance rather than an undifferentiated workspace total.
        best = query_one(
            """SELECT m.* FROM missions m
               WHERE m.workspace_id = ?
               ORDER BY (SELECT COUNT(*) FROM leads l WHERE l.mission_id = m.id) DESC,
                        (SELECT COUNT(*) FROM companies c WHERE c.mission_id = m.id) DESC
               LIMIT 1""",
            (workspace_id,),
        )
        if best:
            mission_row = best
            mission_id = best["id"]

    scoped = _counts(mission_id, workspace_id)
    overall = _counts(None, workspace_id)

    missions = query(
        """SELECT m.id, m.title, m.status, m.progress, m.created_at,
                  (SELECT COUNT(*) FROM leads l WHERE l.mission_id = m.id) AS qualified,
                  (SELECT COUNT(*) FROM companies c WHERE c.mission_id = m.id) AS researched
           FROM missions m WHERE m.workspace_id = ? ORDER BY m.created_at DESC""",
        (workspace_id,),
    )
    ranked = sorted(
        [m for m in missions if m["qualified"] > 0],
        key=lambda m: (m["qualified"] / max(m["researched"], 1), m["qualified"]),
        reverse=True,
    )
    top_mission = ranked[0] if ranked else None

    qualified = scoped["qualified"] or overall["qualified"]
    approved = scoped["approved"] if mission_id else overall["approved"]
    outreach = scoped["outreach"] if mission_id else overall["outreach"]
    researched = scoped["researched"] if mission_id else overall["researched"]

    return {
        "scope": "mission" if mission_id else "workspace",
        "mission": mission_row,
        "funnel": [
            {"label": "Researched", "value": researched},
            {"label": "Qualified", "value": qualified},
            {"label": "Outreach", "value": outreach},
            {"label": "Approved", "value": approved},
        ],
        "metrics": {
            "leads_researched": researched,
            "qualified": qualified,
            "high_intent": scoped["high_intent"] if mission_id else overall["high_intent"],
            "outreach_generated": outreach,
            "approved": approved,
            "conversion_rate": round((qualified / researched) * 100, 1) if researched else 0.0,
            "approval_rate": round((approved / outreach) * 100, 1) if outreach else 0.0,
            "average_opportunity_score": scoped["avg_score"] if mission_id else overall["avg_score"],
        },
        "top_mission": top_mission,
        "missions": missions,
    }
