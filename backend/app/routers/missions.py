"""Mission endpoints: create, launch, inspect, resume."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..config import settings
from ..db import query, query_one
from ..deps import Session, get_session
from ..repository import create_mission, log_activity, now, update_mission
from ..agents.operator import run_mission_in_background
from ..services.provider_factory import build_provider

router = APIRouter(prefix="/api/missions", tags=["missions"])


class MissionCreate(BaseModel):
    goal: str = Field(min_length=8, max_length=600)
    title: str | None = Field(default=None, max_length=120)
    industry: str | None = Field(default=None, max_length=80)
    location: str | None = Field(default=None, max_length=80)
    target_count: int = Field(default=10, ge=1, le=200)
    desired_action: str | None = Field(default=None, max_length=120)
    target_audience: str | None = Field(default=None, max_length=200)
    desired_result: str | None = Field(default=None, max_length=200)
    mode: str = Field(default="auto", pattern="^(auto|live|demo)$")


def derive_title(goal: str, industry: str | None) -> str:
    lowered = goal.lower()
    for keyword, label in [
        ("healthcare", "Healthcare"),
        ("medical", "Healthcare"),
        ("clinic", "Healthcare"),
        ("hospital", "Healthcare"),
        ("saas", "SaaS"),
        ("real estate", "Real Estate"),
        ("restaurant", "Restaurant"),
        ("legal", "Legal"),
        ("manufactur", "Manufacturing"),
        ("logistics", "Logistics"),
        ("education", "Education"),
        ("finance", "Finance"),
        ("fitness", "Fitness"),
        ("retail", "Retail"),
        ("automotive", "Automotive"),
    ]:
        if keyword in lowered:
            return f"{label} Lead Generation"
    if industry:
        return f"{industry} Lead Generation"
    return "Business Development Mission"


def infer_industry(goal: str) -> str:
    lowered = goal.lower()
    for keyword, label in [
        ("healthcare", "Healthcare"),
        ("medical", "Healthcare"),
        ("clinic", "Healthcare"),
        ("hospital", "Healthcare"),
        ("saas", "SaaS"),
        ("software", "SaaS"),
        ("real estate", "Real Estate"),
        ("restaurant", "Restaurant"),
        ("legal", "Legal"),
        ("manufactur", "Manufacturing"),
        ("logistics", "Logistics"),
        ("education", "Education"),
        ("finance", "Finance"),
        ("fitness", "Fitness"),
        ("retail", "Retail"),
        ("automotive", "Automotive"),
    ]:
        if keyword in lowered:
            return label
    return "Healthcare"


def mission_summary(mission: dict[str, Any]) -> dict[str, Any]:
    mission_id = mission["id"]
    researched = query_one(
        "SELECT COUNT(*) AS n FROM companies WHERE mission_id = ?", (mission_id,)
    )["n"]
    qualified = query_one(
        "SELECT COUNT(*) AS n FROM leads WHERE mission_id = ?", (mission_id,)
    )["n"]
    high_intent = query_one(
        "SELECT COUNT(*) AS n FROM leads WHERE mission_id = ? AND score >= 80", (mission_id,)
    )["n"]
    outreach = query_one(
        "SELECT COUNT(*) AS n FROM outreach_messages WHERE mission_id = ?", (mission_id,)
    )["n"]
    approved = query_one(
        "SELECT COUNT(*) AS n FROM outreach_messages WHERE mission_id = ? AND status = 'approved'",
        (mission_id,),
    )["n"]
    return {
        **mission,
        "counts": {
            "researched": researched,
            "qualified": qualified,
            "high_intent": high_intent,
            "outreach_ready": outreach,
            "approved": approved,
        },
    }


@router.get("")
def list_missions(session: Session = Depends(get_session)):
    missions = query(
        "SELECT * FROM missions WHERE workspace_id = ? ORDER BY created_at DESC",
        (session.workspace_id,),
    )
    return {"missions": [mission_summary(m) for m in missions]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    payload: MissionCreate,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
):
    goal = payload.goal.strip()
    if len(goal) < 12:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_goal",
                "message": "Describe the outcome you want in one clear sentence.",
                "hint": "For example: Find 10 healthcare businesses in India that need a new website.",
            },
        )

    provider = build_provider()
    if payload.mode == "demo":
        from ..services.demo import DemoProvider

        provider = DemoProvider()
    elif payload.mode == "live" and not settings.nebius_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "live_provider_unavailable",
                "message": "No live AI provider is configured on this server.",
                "hint": "Set NEBIUS_API_KEY, or continue in demo mode.",
            },
        )

    industry = payload.industry or infer_industry(goal)
    title = payload.title or derive_title(goal, industry)

    mission_id = create_mission(
        workspace_id=session.workspace_id,
        created_by=session.user_id,
        title=title,
        goal=goal,
        industry=industry,
        location=payload.location or "India",
        target_count=payload.target_count,
        desired_action=payload.desired_action or "Personalized Outreach",
        target_audience=payload.target_audience,
        desired_result=payload.desired_result,
        mode=provider.mode,
        provider=provider.name,
        model=provider.model,
        source="user",
    )

    pace = settings.demo_step_delay if provider.mode == "demo" else 0.0
    background.add_task(
        run_mission_in_background, mission_id, session.workspace_id, resume=False, pace=pace
    )

    mission = query_one("SELECT * FROM missions WHERE id = ?", (mission_id,))
    return {"mission": mission_summary(mission)}


@router.get("/{mission_id}")
def detail(mission_id: str, session: Session = Depends(get_session)):
    mission = query_one(
        "SELECT * FROM missions WHERE id = ? AND workspace_id = ?",
        (mission_id, session.workspace_id),
    )
    if not mission:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Mission not found."})

    steps = query(
        "SELECT * FROM mission_steps WHERE mission_id = ? ORDER BY order_index", (mission_id,)
    )
    agents = query(
        "SELECT * FROM agents WHERE mission_id = ? ORDER BY order_index", (mission_id,)
    )
    top = query(
        """SELECT l.id, l.score, l.tier, l.opportunity, c.name AS company, c.city, c.website
           FROM leads l JOIN companies c ON c.id = l.company_id
           WHERE l.mission_id = ? ORDER BY l.score DESC LIMIT 10""",
        (mission_id,),
    )
    return {
        "mission": mission_summary(mission),
        "steps": steps,
        "agents": agents,
        "top_opportunities": top,
    }


@router.get("/{mission_id}/activity")
def activity(
    mission_id: str,
    limit: int = Query(default=200, ge=1, le=500),
    session: Session = Depends(get_session),
):
    rows = query(
        """SELECT * FROM activity_logs WHERE mission_id = ? ORDER BY created_at DESC, rowid DESC
           LIMIT ?""",
        (mission_id, limit),
    )
    return {"activity": list(reversed(rows))}


@router.post("/{mission_id}/resume")
def resume(
    mission_id: str,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
):
    mission = query_one(
        "SELECT * FROM missions WHERE id = ? AND workspace_id = ?",
        (mission_id, session.workspace_id),
    )
    if not mission:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Mission not found."})
    if mission["status"] == "running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "already_running", "message": "This mission is already running."},
        )

    provider = build_provider()
    update_mission(mission_id, error=None, provider=provider.name, model=provider.model)
    pace = settings.demo_step_delay if provider.mode == "demo" else 0.0
    background.add_task(
        run_mission_in_background, mission_id, session.workspace_id, resume=True, pace=pace
    )
    return {"mission": mission_summary(query_one("SELECT * FROM missions WHERE id = ?", (mission_id,)))}


@router.post("/{mission_id}/cancel")
def cancel(mission_id: str, session: Session = Depends(get_session)):
    mission = query_one(
        "SELECT * FROM missions WHERE id = ? AND workspace_id = ?",
        (mission_id, session.workspace_id),
    )
    if not mission:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Mission not found."})
    update_mission(mission_id, status="cancelled", current_step="Mission cancelled")
    log_activity(
        session.workspace_id, mission_id, "Operator", "mission.cancelled", "warn",
        "The mission was stopped by the operator of this workspace.",
    )
    return {"mission": mission_summary(query_one("SELECT * FROM missions WHERE id = ?", (mission_id,)))}
