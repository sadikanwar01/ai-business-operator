"""Writer Agent - drafts personalised outreach grounded in detected signals."""

from __future__ import annotations

import json
from typing import Any

from ..db import query
from ..repository import insert_outreach, log_activity, set_step
from .base import Agent, AgentContext

SYSTEM = (
    "You are the Writer agent. You write outreach that a busy business owner will actually read. "
    "Every specific observation you make must come from the signals supplied to you - never invent "
    "facts, never use unverifiable superlatives. You never send anything. Respond with JSON only."
)

PROMPT = """Write a personalised outreach message.

Business: {company}
Signals detected by the Analyst:
{signals}

Reasons this business is a good opportunity:
{reasons}

Our business:
- Company: {agency}
- Services: {services}
- Ideal customers: {audiences}
- Communication style: {style}

Write JSON:
{{"subject": "<email subject>", "body": "<email body, 90-180 words>",
  "confidence": 0.0, "tone": "<tone>", "grounded_reasons": ["<signal used>"],
  "flags": [], "word_count": 0}}
"""


class WriterAgent(Agent):
    key = "writer"
    name = "Writer"
    role = "Creates personalized outreach"
    step_key = "personalize"
    task = "write"

    async def execute(self, ctx: AgentContext) -> dict[str, Any]:
        leads = query(
            "SELECT * FROM leads WHERE mission_id = ? ORDER BY score DESC", (ctx.mission_id,)
        )
        outreach_ready = [
            lead for lead in leads if lead["tier"] in {"Very High", "High", "Medium"}
        ][:25]
        if len(outreach_ready) < ctx.target_count:
            outreach_ready = leads[: ctx.target_count]

        knowledge = ctx.knowledge or {}
        written = 0

        for index, lead in enumerate(outreach_ready):
            company = query_one_company(lead["company_id"])
            analysis = analysis_for(lead["company_id"])
            signals = analysis.get("signals") or {}
            reasons = analysis.get("opportunity_reasons") or []

            response = await self.ask(
                ctx,
                PROMPT.format(
                    company=json.dumps(company, ensure_ascii=False),
                    signals=json.dumps(signals, ensure_ascii=False),
                    reasons="; ".join(str(r) for r in reasons),
                    agency=knowledge.get("company") or "My Agency",
                    services=", ".join(knowledge.get("services") or ["Web Development", "SEO"]),
                    audiences=", ".join(knowledge.get("audiences") or ["Healthcare"]),
                    style=", ".join(knowledge.get("style") or ["Professional", "Concise"]),
                ),
                system=SYSTEM,
                context={
                    "company": company,
                    "signals": signals,
                    "reasons": reasons,
                    "knowledge": {
                        "company": knowledge.get("company") or "My Agency",
                        "services": knowledge.get("services") or [],
                        "audiences": knowledge.get("audiences") or [],
                        "style": knowledge.get("style") or [],
                        "sender": knowledge.get("sender") or "Sadik",
                    },
                },
                temperature=0.55,
            )
            try:
                _raw = response.text if hasattr(response, "text") else str(response)
                import re as _r; _m = _r.search(r"{.*}", _raw, _r.DOTALL)
                data = __import__("json").loads(_m.group()) if _m else {}
            except Exception:
                data = {}

            insert_outreach(
                ctx.mission_id, lead["id"], ctx.workspace_id, lead["company_id"],
                subject=str(data.get("subject") or f"About {company.get('name')}"),
                body=str(data.get("body") or ""),
                confidence=float(data.get("confidence") or 0),
                status="ready",
                tone=data.get("tone"),
                flags=list(data.get("flags") or []),
            )
            written += 1

            if index == 0:
                set_step(ctx.mission_id, "personalize", status="running", progress=5,
                         detail=f"Drafting personalised outreach for {len(outreach_ready)} opportunities")
            await ctx.think(0.12)

        set_step(ctx.mission_id, "personalize", status="complete", progress=100,
                 detail=f"{written} personalised messages drafted")
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Writer", "outreach.drafted", "complete",
            f"Writer generated {written} personalised messages.",
            {"count": written},
        )
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Writer", "outreach.grounded", "info",
            "Every message is conditioned on signals collected during research.",
        )
        return {"written": written}


def query_one_company(company_id: str) -> dict[str, Any]:
    """Company row enriched with the facts the Researcher collected."""
    rows = query("SELECT * FROM companies WHERE id = ?", (company_id,))
    company = dict(rows[0]) if rows else {}
    if not company:
        return company
    records = query(
        "SELECT field, value FROM research_records WHERE company_id = ? AND field != 'Analysis'",
        (company_id,),
    )
    fields = {r["field"]: r["value"] for r in records}
    company["rating"] = fields.get("Public rating")
    company["reviews"] = fields.get("Review count")
    company["website_quality"] = fields.get("Website quality")
    company["booking"] = fields.get("Booking capability")
    company["mobile"] = fields.get("Mobile experience")
    return company


def analysis_for(company_id: str) -> dict[str, Any]:
    rows = query(
        "SELECT value FROM research_records WHERE company_id = ? AND field = 'Analysis' "
        "ORDER BY retrieved_at DESC LIMIT 1",
        (company_id,),
    )
    if not rows:
        return {}
    try:
        return json.loads(rows[0]["value"])
    except (TypeError, ValueError):
        return {}
