"""Persistence helpers shared by the agent runtime and the HTTP routers.

Keeping every SQL statement in one module means the data model is easy to
audit and the agents stay focused on behaviour rather than plumbing.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from .db import execute, execute_many, query, query_one
from .security import new_id

# --------------------------------------------------------------------------
# time helpers
# --------------------------------------------------------------------------


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def days_from_now(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).date().isoformat()


# --------------------------------------------------------------------------
# missions
# --------------------------------------------------------------------------

MISSION_STEPS = [
    ("plan", "Plan", "Planner"),
    ("research", "Research", "Researcher"),
    ("analyze", "Analyze", "Analyst"),
    ("qualify", "Qualify", "Qualification"),
    ("personalize", "Personalize", "Writer"),
    ("review", "Review", "Reviewer"),
    ("result", "Result", "Operator"),
]

AGENT_DEFS = [
    ("Planner", "Turns a business goal into an executable plan", "Translating goal into execution steps"),
    ("Researcher", "Collects relevant company information", "Finding and evaluating potential businesses"),
    ("Analyst", "Detects opportunity signals in each business", "Evaluating website quality and digital presence"),
    ("Qualification", "Scores and ranks opportunities", "Scoring leads and removing weak records"),
    ("Writer", "Creates personalized outreach", "Drafting messages grounded in detected signals"),
    ("Reviewer", "Checks quality and unsupported claims", "Verifying claims against the research record"),
]


def create_mission(
    *,
    workspace_id: str,
    created_by: str,
    title: str,
    goal: str,
    industry: str | None,
    location: str | None,
    target_count: int,
    desired_action: str | None,
    target_audience: str | None = None,
    desired_result: str | None = None,
    mode: str = "demo",
    provider: str = "demo",
    model: str | None = None,
    source: str = "user",
) -> str:
    mission_id = new_id("mis")
    stamp = now()
    execute(
        """INSERT INTO missions (id, workspace_id, created_by, title, goal, status, progress,
               current_step, mode, provider, model, industry, location, target_count, desired_action,
               target_audience, desired_result, source, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            mission_id, workspace_id, created_by, title, goal, "queued", 0, None, mode, provider,
            model, industry, location, target_count, desired_action, target_audience,
            desired_result, source, stamp, stamp,
        ),
    )
    for index, (key, name, agent) in enumerate(MISSION_STEPS):
        execute(
            """INSERT INTO mission_steps (id, mission_id, key, name, agent, status, progress, order_index)
               VALUES (?,?,?,?,?,?,?,?)""",
            (new_id("stp"), mission_id, key, name, agent, "waiting", 0, index),
        )
    for index, (name, role, task) in enumerate(AGENT_DEFS):
        execute(
            """INSERT INTO agents (id, mission_id, name, role, task, status, order_index, updated_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (new_id("agt"), mission_id, name, role, task, "waiting", index, stamp),
        )
    log_activity(workspace_id, mission_id, "Operator", "mission.created", "info",
                 f"Mission created: {title}")
    return mission_id


def update_mission(mission_id: str, **fields: Any) -> None:
    if not fields:
        return
    fields["updated_at"] = now()
    assignments = ", ".join(f"{key} = ?" for key in fields)
    values = [
        json.dumps(value) if isinstance(value, (dict, list)) else value
        for value in fields.values()
    ]
    execute(f"UPDATE missions SET {assignments} WHERE id = ?", (*values, mission_id))


STEP_RANGES = {
    "plan": (0, 8),
    "research": (8, 30),
    "analyze": (30, 52),
    "qualify": (52, 70),
    "personalize": (70, 86),
    "review": (86, 97),
    "result": (97, 100),
}

STEP_PHRASES = {
    "plan": "Building the execution plan",
    "research": "Discovering candidate businesses",
    "analyze": "Analyzing opportunities",
    "qualify": "Scoring and ranking opportunities",
    "personalize": "Writing personalised outreach",
    "review": "Reviewing generated messages",
    "result": "Preparing the result",
}


def sync_mission_progress(mission_id: str, key: str) -> None:
    """Keep the mission progress bar in step with the active step."""
    row = query_one(
        "SELECT status, progress FROM mission_steps WHERE mission_id = ? AND key = ?",
        (mission_id, key),
    )
    if not row:
        return
    start, end = STEP_RANGES.get(key, (0, 100))
    pct = int(row["progress"] or 0)
    overall = start + (end - start) * pct / 100
    fields = {"progress": max(0, min(100, round(overall)))}
    if row["status"] == "running":
        fields["current_step"] = STEP_PHRASES.get(key, key)
    execute(
        "UPDATE missions SET progress = ?, current_step = ?, updated_at = ? WHERE id = ?",
        (fields["progress"], fields.get("current_step") or STEP_PHRASES.get(key, key), now(), mission_id),
    )


def set_step(mission_id: str, key: str, *, status: str | None = None, progress: int | None = None,
             detail: str | None = None) -> None:
    fields: list[Any] = []
    sql = "UPDATE mission_steps SET"
    if status is not None:
        sql += " status = ?,"
        fields.append(status)
    if progress is not None:
        sql += " progress = ?,"
        fields.append(progress)
    if detail is not None:
        sql += " detail = ?,"
        fields.append(detail)
    if status == "running" and "started_at" not in sql:
        sql += " started_at = ?,"
        fields.append(now())
    if status == "complete":
        sql += " completed_at = ?,"
        fields.append(now())
    sql = sql.rstrip(",")
    execute(sql + " WHERE mission_id = ? AND key = ?", (*fields, mission_id, key))
    sync_mission_progress(mission_id, key)


def set_agent(mission_id: str, name: str, *, status: str, task: str | None = None) -> None:
    sql = "UPDATE agents SET status = ?, updated_at = ?"
    params: list[Any] = [status, now()]
    if task is not None:
        sql += ", task = ?"
        params.append(task)
    sql += " WHERE mission_id = ? AND name = ?"
    params.extend([mission_id, name])
    execute(sql, params)


def agent_statuses(mission_id: str) -> list[dict[str, Any]]:
    return query("SELECT * FROM agents WHERE mission_id = ? ORDER BY order_index", (mission_id,))


# --------------------------------------------------------------------------
# activity log
# --------------------------------------------------------------------------


def log_activity(
    workspace_id: str,
    mission_id: str | None,
    agent: str,
    action: str,
    status: str,
    message: str,
    meta: dict[str, Any] | None = None,
) -> None:
    execute(
        """INSERT INTO activity_logs (id, workspace_id, mission_id, agent, action, status, message, meta, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            new_id("act"), workspace_id, mission_id, agent, action, status, message,
            json.dumps(meta or {}), now(),
        ),
    )


# --------------------------------------------------------------------------
# research artefacts
# --------------------------------------------------------------------------


def insert_company(**fields: Any) -> str:
    company_id = new_id("cmp")
    execute(
        """INSERT INTO companies (id, workspace_id, mission_id, name, industry, location, city, website,
               specialty, founded, employees, source, source_url, discovered_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            company_id, fields["workspace_id"], fields.get("mission_id"), fields["name"],
            fields.get("industry"), fields.get("location"), fields.get("city"), fields.get("website"),
            fields.get("specialty"), fields.get("founded"), fields.get("employees"),
            fields.get("source"), fields.get("source_url"), now(),
        ),
    )
    return company_id


def insert_research_record(mission_id: str, company_id: str, field: str, value: Any, *,
                           source: str, source_url: str, excerpt: str, confidence: float) -> None:
    execute(
        """INSERT INTO research_records (id, mission_id, company_id, field, value, source, source_url,
               excerpt, confidence, retrieved_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (new_id("res"), mission_id, company_id, field, str(value), source, source_url, excerpt,
         confidence, now()),
    )


def insert_signal(mission_id: str, lead_id: str, company_id: str, label: str, value: str, *,
                  severity: str, evidence: str) -> None:
    execute(
        """INSERT INTO signals (id, lead_id, mission_id, company_id, label, value, severity, evidence)
           VALUES (?,?,?,?,?,?,?,?)""",
        (new_id("sig"), lead_id, mission_id, company_id, label, value, severity, evidence),
    )


def insert_score(mission_id: str, lead_id: str, dimension: str, weight: float, score: int, rationale: str) -> None:
    execute(
        """INSERT INTO opportunity_scores (id, lead_id, mission_id, dimension, weight, score, rationale)
           VALUES (?,?,?,?,?,?,?)""",
        (new_id("scr"), lead_id, mission_id, dimension, weight, score, rationale),
    )


def insert_lead(mission_id: str, workspace_id: str, company_id: str, *, score: int, tier: str,
                opportunity: str, status: str = "review", notes: str | None = None) -> str:
    lead_id = new_id("led")
    stamp = now()
    execute(
        """INSERT INTO leads (id, mission_id, workspace_id, company_id, status, opportunity, tier, score,
               notes, last_activity, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (lead_id, mission_id, workspace_id, company_id, status, opportunity, tier, score, notes,
         stamp, stamp, stamp),
    )
    return lead_id


def insert_outreach(mission_id: str, lead_id: str, workspace_id: str, company_id: str, *,
                    subject: str, body: str, confidence: float, status: str = "ready",
                    tone: str | None = None, flags: list[str] | None = None,
                    review_notes: list[str] | None = None, channel: str = "email") -> str:
    outreach_id = new_id("msg")
    stamp = now()
    execute(
        """INSERT INTO outreach_messages (id, mission_id, lead_id, workspace_id, company_id, channel,
               subject, body, confidence, status, tone, flags, review_notes, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (outreach_id, mission_id, lead_id, workspace_id, company_id, channel, subject, body,
         confidence, status, tone, json.dumps(flags or []), json.dumps(review_notes or []),
         stamp, stamp),
    )
    return outreach_id


def insert_follow_up(workspace_id: str, mission_id: str | None, lead_id: str, outreach_id: str | None,
                     *, sequence: int, due_date: str, status: str = "scheduled", note: str | None = None) -> str:
    follow_id = new_id("fup")
    execute(
        """INSERT INTO follow_ups (id, lead_id, outreach_id, workspace_id, mission_id, sequence, due_date,
               status, note, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (follow_id, lead_id, outreach_id, workspace_id, mission_id, sequence, due_date, status, note, now()),
    )
    return follow_id


# --------------------------------------------------------------------------
# knowledge
# --------------------------------------------------------------------------


def knowledge_map(workspace_id: str) -> dict[str, Any]:
    items = query(
        "SELECT * FROM knowledge_items WHERE workspace_id = ? ORDER BY category, order_index",
        (workspace_id,),
    )
    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        grouped.setdefault(item["category"], []).append(item)
    return grouped


def knowledge_flat(workspace_id: str) -> dict[str, list[str]]:
    """Flatten knowledge into simple lists used to condition the Writer agent."""
    grouped = knowledge_map(workspace_id)
    flat: dict[str, list[str]] = {}
    for category, items in grouped.items():
        values = [item["content"] for item in items]
        if category == "profile":
            flat["company"] = values[0] if values else "My Agency"
            flat["profile"] = values
        else:
            flat[category] = values
    return flat
