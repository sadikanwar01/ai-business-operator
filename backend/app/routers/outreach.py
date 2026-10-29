"""Outreach review endpoints.

Sending is never automatic: a message must be approved by a human from this
workspace before it counts as approved.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..db import query, query_one
from ..deps import Session, get_session
from ..repository import days_from_now, insert_follow_up, log_activity, now

router = APIRouter(prefix="/api/outreach", tags=["outreach"])


def _decorate(message: dict) -> dict:
    try:
        flags = json.loads(message.get("flags") or "[]")
    except (TypeError, ValueError):
        flags = []
    try:
        notes = json.loads(message.get("review_notes") or "[]")
    except (TypeError, ValueError):
        notes = []
    return {**message, "flags": flags, "review_notes": notes}


@router.get("")
def list_outreach(
    message_status: str | None = Query(default=None, alias="status", max_length=40),
    mission: str | None = Query(default=None, max_length=60),
    session: Session = Depends(get_session),
):
    sql = [
        """SELECT o.*, c.name AS company, c.city, c.website, l.score, l.tier, l.id AS lead_id
           FROM outreach_messages o
           JOIN companies c ON c.id = o.company_id
           JOIN leads l ON l.id = o.lead_id
           JOIN missions m ON m.id = o.mission_id
           WHERE o.workspace_id = ?""",
    ]
    params: list = [session.workspace_id]
    if message_status:
        sql.append("AND o.status = ?")
        params.append(message_status)
    if mission:
        sql.append("AND m.title = ?")
        params.append(mission)
    sql.append("ORDER BY l.score DESC, o.created_at DESC")

    rows = [_decorate(r) for r in query(" ".join(sql), params)]
    ready = query_one(
        "SELECT COUNT(*) AS n FROM outreach_messages WHERE workspace_id = ? AND status = 'ready'",
        (session.workspace_id,),
    )["n"]
    return {"messages": rows, "ready_count": ready}


@router.get("/{message_id}")
def message_detail(message_id: str, session: Session = Depends(get_session)):
    message = query_one(
        """SELECT o.*, c.name AS company, c.city, c.website, c.specialty, l.score, l.tier
           FROM outreach_messages o
           JOIN companies c ON c.id = o.company_id
           JOIN leads l ON l.id = o.lead_id
           WHERE o.id = ? AND o.workspace_id = ?""",
        (message_id, session.workspace_id),
    )
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "This message could not be found."},
        )
    return {"message": _decorate(message)}


class MessageEdit(BaseModel):
    subject: str | None = Field(default=None, max_length=240)
    body: str | None = Field(default=None, max_length=6000)


@router.patch("/{message_id}")
def edit_message(message_id: str, payload: MessageEdit, session: Session = Depends(get_session)):
    message = query_one(
        "SELECT * FROM outreach_messages WHERE id = ? AND workspace_id = ?",
        (message_id, session.workspace_id),
    )
    if not message:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Message not found."})
    stamp = now()
    subject = payload.subject if payload.subject is not None else message["subject"]
    body = payload.body if payload.body is not None else message["body"]
    query(
        "UPDATE outreach_messages SET subject = ?, body = ?, updated_at = ? WHERE id = ?",
        (subject, body, stamp, message_id),
    )
    log_activity(
        session.workspace_id, message["mission_id"], "Operator", "outreach.edited", "info",
        "A drafted message was edited by the workspace owner.",
    )
    return {"message": _decorate(query_one("SELECT * FROM outreach_messages WHERE id = ?", (message_id,)))}


@router.post("/{message_id}/approve")
def approve(message_id: str, session: Session = Depends(get_session)):
    message = query_one(
        "SELECT * FROM outreach_messages WHERE id = ? AND workspace_id = ?",
        (message_id, session.workspace_id),
    )
    if not message:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Message not found."})
    stamp = now()
    query(
        "UPDATE outreach_messages SET status = 'approved', updated_at = ? WHERE id = ?",
        (stamp, message_id),
    )
    query(
        "UPDATE leads SET status = 'contacted', updated_at = ?, last_activity = ? WHERE id = ?",
        (stamp, stamp, message["lead_id"]),
    )
    follow_up = insert_follow_up(
        session.workspace_id, message["mission_id"], message["lead_id"], message_id,
        sequence=1, due_date=days_from_now(3), status="scheduled",
        note="Follow up on the approved first outreach.",
    )
    log_activity(
        session.workspace_id, message["mission_id"], "Operator", "outreach.approved", "complete",
        "An outreach message was approved and queued for sending.",
        {"message_id": message_id},
    )
    return {
        "message": _decorate(query_one("SELECT * FROM outreach_messages WHERE id = ?", (message_id,))),
        "follow_up": query_one("SELECT * FROM follow_ups WHERE id = ?", (follow_up,)),
    }


@router.post("/{message_id}/reject")
def reject(message_id: str, session: Session = Depends(get_session)):
    message = query_one(
        "SELECT * FROM outreach_messages WHERE id = ? AND workspace_id = ?",
        (message_id, session.workspace_id),
    )
    if not message:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Message not found."})
    query(
        "UPDATE outreach_messages SET status = 'rejected', updated_at = ? WHERE id = ?",
        (now(), message_id),
    )
    query(
        "UPDATE leads SET status = 'rejected', updated_at = ?, last_activity = ? WHERE id = ?",
        (now(), now(), message["lead_id"]),
    )
    log_activity(
        session.workspace_id, message["mission_id"], "Operator", "outreach.rejected", "warn",
        "An outreach message was rejected and will not be sent.",
    )
    return {"message": _decorate(query_one("SELECT * FROM outreach_messages WHERE id = ?", (message_id,)))}


class RegenerateRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=400)


@router.post("/{message_id}/regenerate")
def regenerate(message_id: str, payload: RegenerateRequest, session: Session = Depends(get_session)):
    """Re-run the Writer + Reviewer agents for a single message."""
    import asyncio

    from ..agents.base import AgentContext
    from ..agents.reviewer import ReviewerAgent
    from ..agents.writer import WriterAgent
    from ..repository import knowledge_flat
    from ..services.provider_factory import build_provider

    message = query_one(
        "SELECT * FROM outreach_messages WHERE id = ? AND workspace_id = ?",
        (message_id, session.workspace_id),
    )
    if not message:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Message not found."})

    provider = build_provider()
    mission = query_one("SELECT * FROM missions WHERE id = ?", (message["mission_id"],))
    ctx = AgentContext(
        mission=mission,
        workspace_id=session.workspace_id,
        provider=provider,
        seed=abs(hash(message_id)) % 100000,
        knowledge=knowledge_flat(session.workspace_id),
        pace=0,
    )

    async def _run() -> dict:
        writer = WriterAgent(provider)
        reviewer = ReviewerAgent(provider)
        company = query_one("SELECT * FROM companies WHERE id = ?", (message["company_id"],))
        from ..agents.writer import analysis_for

        analysis = analysis_for(company["id"])
        signals = analysis.get("signals") or {}
        reasons = analysis.get("opportunity_reasons") or []
        response = await writer.ask(
            ctx,
            writer.PROMPT.format(
                company=json.dumps(company, ensure_ascii=False),
                signals=json.dumps(signals, ensure_ascii=False),
                reasons="; ".join(str(r) for r in reasons),
                agency=ctx.knowledge.get("company") or "My Agency",
                services=", ".join(ctx.knowledge.get("services") or []),
                audiences=", ".join(ctx.knowledge.get("audiences") or []),
                style=", ".join(ctx.knowledge.get("style") or ["Professional"]),
            ),
            system=writer.SYSTEM,
            context={
                "company": company,
                "signals": signals,
                "reasons": reasons,
                "knowledge": ctx.knowledge,
            },
            temperature=0.6,
        )
        data = response.json()
        stamp = now()
        query(
            "UPDATE outreach_messages SET subject = ?, body = ?, confidence = ?, status = 'ready', "
            "updated_at = ? WHERE id = ?",
            (
                str(data.get("subject") or message["subject"]),
                str(data.get("body") or message["body"]),
                float(data.get("confidence") or 0),
                stamp,
                message_id,
            ),
        )
        return {"message": _decorate(query_one("SELECT * FROM outreach_messages WHERE id = ?", (message_id,)))}

    return asyncio.run(_run())
