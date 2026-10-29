"""Research workspace endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..db import query, query_one
from ..deps import Session, get_session

router = APIRouter(prefix="/api/research", tags=["research"])

STAGES = [
    ("discovery", "Company Discovery", "research"),
    ("information", "Business Information", "research"),
    ("website", "Website Analysis", "analyze"),
    ("opportunity", "Opportunity Detection", "analyze"),
    ("qualification", "Lead Qualification", "qualify"),
]


@router.get("")
def list_research(session: Session = Depends(get_session)):
    missions = query(
        "SELECT * FROM missions WHERE workspace_id = ? ORDER BY created_at DESC", (session.workspace_id,)
    )
    jobs = []
    for mission in missions:
        researched = query_one(
            "SELECT COUNT(*) AS n FROM companies WHERE mission_id = ?", (mission["id"],)
        )["n"]
        fields = query_one(
            """SELECT COUNT(*) AS n FROM research_records
               WHERE mission_id = ? AND field != 'Analysis'""",
            (mission["id"],),
        )["n"]
        qualified = query_one(
            "SELECT COUNT(*) AS n FROM leads WHERE mission_id = ?", (mission["id"],)
        )["n"]
        steps = {s["key"]: s for s in query(
            "SELECT * FROM mission_steps WHERE mission_id = ?", (mission["id"],)
        )}
        stages = []
        for key, label, step_key in STAGES:
            step = steps.get(step_key)
            state = (step["status"] if step else "waiting")
            if state == "complete" and mission["status"] != "completed":
                state = "complete"
            stages.append({"key": key, "label": label, "status": state})
        jobs.append(
            {
                "mission": mission,
                "companies_researched": researched,
                "fields_collected": fields,
                "qualified": qualified,
                "stages": stages,
            }
        )
    return {"jobs": jobs}


@router.get("/{mission_id}")
def research_detail(
    mission_id: str,
    limit: int = Query(default=200, ge=1, le=500),
    session: Session = Depends(get_session),
):
    mission = query_one(
        "SELECT * FROM missions WHERE id = ? AND workspace_id = ?",
        (mission_id, session.workspace_id),
    )
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "This research job could not be found."},
        )
    evidence = query(
        """SELECT r.*, c.name AS company FROM research_records r
           JOIN companies c ON c.id = r.company_id
           WHERE r.mission_id = ? AND r.field != 'Analysis'
           ORDER BY c.name, r.rowid LIMIT ?""",
        (mission_id, limit),
    )
    companies = query(
        "SELECT * FROM companies WHERE mission_id = ? ORDER BY name LIMIT 100", (mission_id,)
    )
    return {"mission": mission, "evidence": evidence, "companies": companies}
