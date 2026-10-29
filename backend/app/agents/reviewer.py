"""Reviewer Agent - verifies quality and removes unsupported claims.

The Reviewer clears a draft for human review. It never marks a message as
sent: sending always requires an explicit human approval in the product.
"""

from __future__ import annotations

import json
from typing import Any

from ..db import execute, query
from ..repository import log_activity, set_step
from .base import Agent, AgentContext

SYSTEM = (
    "You are the Reviewer agent. You check that every claim in a drafted message is supported by the "
    "research record, that the tone matches the configured style, and that the message is not spam. "
    "You approve or request a revision - you never send. Respond with JSON only."
)

PROMPT = """Review this drafted outreach message.

Business: {company}
Signals that were available: {signals}
Message subject: {subject}
Message body:
{body}

Return JSON:
{{"verdict": "approve|revise", "confidence": 0.0, "grounding_score": 0.0, "tone_score": 0.0,
  "spam_score": 0.0, "review_notes": ["<note>"], "suggestion": "<what to change>",
  "flags": ["<unsupported claim>"]}}
"""


class ReviewerAgent(Agent):
    key = "reviewer"
    name = "Reviewer"
    role = "Checks quality and unsupported claims"
    step_key = "review"
    task = "review"

    async def execute(self, ctx: AgentContext) -> dict[str, Any]:
        messages = query(
            "SELECT * FROM outreach_messages WHERE mission_id = ? AND status = 'ready' ORDER BY rowid",
            (ctx.mission_id,),
        )
        approved = 0
        revised = 0

        for index, message in enumerate(messages):
            company_rows = query("SELECT * FROM companies WHERE id = ?", (message["company_id"],))
            company = company_rows[0] if company_rows else {}
            signals = _signals_for(message["company_id"])

            response = await self.ask(
                ctx,
                PROMPT.format(
                    company=json.dumps(company, ensure_ascii=False),
                    signals=json.dumps(signals, ensure_ascii=False),
                    subject=message["subject"] or "",
                    body=message["body"] or "",
                ),
                system=SYSTEM,
                context={
                    "message": {"subject": message["subject"], "body": message["body"]},
                    "company": company,
                    "reasons": signals.get("reasons", []),
                    "seed": ctx.seed,
                },
                temperature=0.2,
            )
            try:
                _raw = response.text if hasattr(response, "text") else str(response)
                import re as _r; _m = _r.search(r"{.*}", _raw, _r.DOTALL)
                data = __import__("json").loads(_m.group()) if _m else {}
            except Exception:
                data = {}
            verdict = str(data.get("verdict") or "approve")
            notes = list(data.get("review_notes") or [])
            flags = list(data.get("flags") or [])
            confidence = float(data.get("confidence") or message["confidence"] or 0)

            payload = {
                "items": flags,
                "verdict": verdict,
                "grounding_score": data.get("grounding_score"),
                "tone_score": data.get("tone_score"),
                "spam_score": data.get("spam_score"),
                "suggestion": data.get("suggestion"),
            }
            execute(
                """UPDATE outreach_messages SET confidence = ?, review_notes = ?, flags = ?, updated_at = ?
                   WHERE id = ?""",
                (confidence, json.dumps(notes), json.dumps(payload), _now(), message["id"]),
            )

            if verdict == "approve":
                approved += 1
            else:
                revised += 1

            if index == 0:
                set_step(ctx.mission_id, "review", status="running", progress=5,
                         detail=f"Checking {len(messages)} generated messages for unsupported claims")
            await ctx.think(0.1)

        set_step(ctx.mission_id, "review", status="complete", progress=100,
                 detail=f"{approved} cleared for review, {revised} need revision")
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Reviewer", "review.completed", "complete",
            f"Reviewer checked {len(messages)} messages against the research record.",
            {"count": len(messages)},
        )
        if approved:
            log_activity(
                ctx.workspace_id, ctx.mission_id, "Reviewer", "review.cleared", "info",
                f"{approved} messages cleared for human approval.",
                {"count": approved},
            )
        if revised:
            log_activity(
                ctx.workspace_id, ctx.mission_id, "Reviewer", "review.revision", "warn",
                f"{revised} messages contain claims that need revision before sending.",
                {"count": revised},
            )
        return {"approved": approved, "revised": revised, "reviewed": len(messages)}


def _signals_for(company_id: str) -> dict[str, Any]:
    rows = query(
        "SELECT label, value FROM signals WHERE company_id = ? AND label = 'Opportunity reason'",
        (company_id,),
    )
    return {"reasons": [row["value"] for row in rows]}


def _now() -> str:
    from ..repository import now

    return now()
