"""Lead intelligence endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ..db import query, query_one
from ..deps import Session, get_session
from ..repository import now

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("")
def list_leads(
    search: str | None = Query(default=None, max_length=120),
    industry: str | None = Query(default=None, max_length=80),
    location: str | None = Query(default=None, max_length=80),
    tier: str | None = Query(default=None, max_length=40),
    lead_status: str | None = Query(default=None, alias="status", max_length=40),
    mission: str | None = Query(default=None, max_length=60),
    min_score: int = Query(default=0, ge=0, le=100),
    limit: int = Query(default=100, ge=1, le=500),
    session: Session = Depends(get_session),
):
    sql = [
        """SELECT l.id, l.score, l.tier, l.opportunity, l.status, l.last_activity, l.updated_at,
                  c.name AS company, c.industry, c.location, c.city, c.website, c.specialty,
                  m.id AS mission_id, m.title AS mission_title
           FROM leads l
           JOIN companies c ON c.id = l.company_id
           JOIN missions m ON m.id = l.mission_id
           WHERE l.workspace_id = ?""",
    ]
    params: list = [session.workspace_id]
    if search:
        sql.append("AND (c.name LIKE ? OR c.location LIKE ? OR c.specialty LIKE ?)")
        term = f"%{search}%"
        params.extend([term, term, term])
    if industry:
        sql.append("AND c.industry = ?")
        params.append(industry)
    if location:
        sql.append("AND c.location LIKE ?")
        params.append(f"%{location}%")
    if tier:
        sql.append("AND l.tier = ?")
        params.append(tier)
    if lead_status:
        sql.append("AND l.status = ?")
        params.append(lead_status)
    if mission:
        sql.append("AND m.title = ?")
        params.append(mission)
    if min_score:
        sql.append("AND l.score >= ?")
        params.append(min_score)
    sql.append("ORDER BY l.score DESC, c.name ASC LIMIT ?")
    params.append(limit)

    rows = query(" ".join(sql), params)
    total = query_one(
        "SELECT COUNT(*) AS n FROM leads WHERE workspace_id = ?", (session.workspace_id,)
    )["n"]
    return {"leads": rows, "total": total}


@router.get("/{lead_id}")
def lead_detail(lead_id: str, session: Session = Depends(get_session)):
    lead = query_one(
        "SELECT * FROM leads WHERE id = ? AND workspace_id = ?", (lead_id, session.workspace_id)
    )
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "This lead could not be found."},
        )
    company = query_one("SELECT * FROM companies WHERE id = ?", (lead["company_id"],))
    mission = query_one("SELECT * FROM missions WHERE id = ?", (lead["mission_id"],))
    signals = query(
        "SELECT * FROM signals WHERE lead_id = ? ORDER BY rowid", (lead_id,)
    )
    scores = query(
        "SELECT * FROM opportunity_scores WHERE lead_id = ? ORDER BY weight DESC", (lead_id,)
    )
    research = query(
        "SELECT * FROM research_records WHERE company_id = ? ORDER BY rowid", (lead["company_id"],)
    )
    messages = query(
        "SELECT * FROM outreach_messages WHERE lead_id = ? ORDER BY created_at DESC", (lead_id,)
    )
    follow_ups = query(
        "SELECT * FROM follow_ups WHERE lead_id = ? ORDER BY due_date", (lead_id,)
    )

    reasons = [s for s in signals if s["label"] == "Opportunity reason"]
    detected = [s for s in signals if s["label"] != "Opportunity reason"]

    return {
        "lead": lead,
        "company": company,
        "mission": mission,
        "why": [r["value"] for r in reasons],
        "signals": detected,
        "scores": scores,
        "research": research,
        "outreach": messages,
        "follow_ups": follow_ups,
    }


class LeadStatusUpdate(BaseModel):
    status: str


@router.patch("/{lead_id}")
def update_lead(lead_id: str, payload: LeadStatusUpdate, session: Session = Depends(get_session)):
    lead = query_one(
        "SELECT * FROM leads WHERE id = ? AND workspace_id = ?", (lead_id, session.workspace_id)
    )
    if not lead:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Lead not found."})
    stamp = now()
    query(
        "UPDATE leads SET status = ?, updated_at = ?, last_activity = ? WHERE id = ?",
        (payload.status, stamp, stamp, lead_id),
    )
    return {"lead": query_one("SELECT * FROM leads WHERE id = ?", (lead_id,))}
