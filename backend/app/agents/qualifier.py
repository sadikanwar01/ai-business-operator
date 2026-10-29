"""Qualification Agent - scores, ranks and prunes opportunities."""

from __future__ import annotations

import json
import re
from typing import Any

from ..db import query
from ..repository import (
    insert_lead,
    insert_score,
    insert_signal,
    log_activity,
    set_step,
)
from .base import Agent, AgentContext

SYSTEM = (
    "You are the Qualification agent. You score each candidate business on opportunity, justify the "
    "score dimension by dimension, and remove records that do not clear the bar. You never keep a "
    "record you cannot justify. Respond with JSON only."
)

PROMPT = """Qualify the analysed candidates for this mission.

Goal: {goal}
Industry: {industry}
Location: {location}
Target number of opportunities: {target_count}

Candidates with their analyst findings:
{candidates}

Return JSON:
{{"qualified": [{{"name": "...", "score": 0, "tier": "Very High|High|Medium|Low",
  "dimensions": [{{"dimension": "...", "score": 0, "weight": 0.0, "rationale": "..."}}]}}],
  "rejected": [{{"name": "...", "score": 0, "reason": "<why it was removed>"}}]}}
"""


class QualificationAgent(Agent):
    key = "qualifier"
    name = "Qualification"
    role = "Scores and ranks opportunities"
    step_key = "qualify"
    task = "qualify"

    async def execute(self, ctx: AgentContext) -> dict[str, Any]:
        companies = query(
            "SELECT * FROM companies WHERE mission_id = ? ORDER BY rowid", (ctx.mission_id,)
        )
        candidates: list[dict[str, Any]] = []
        analysis_by_name: dict[str, dict[str, Any]] = {}

        for company in companies:
            row = query(
                "SELECT value FROM research_records WHERE company_id = ? AND field = 'Analysis' "
                "ORDER BY retrieved_at DESC LIMIT 1",
                (company["id"],),
            )
            if not row:
                continue
            try:
                analysis = json.loads(row[0]["value"])
            except (TypeError, ValueError):
                continue
            analysis_by_name[company["name"]] = analysis
            candidates.append(
                {
                    "name": company["name"],
                    "company_id": company["id"],
                    "opportunity_strength": int(
                        (analysis.get("signals") or {}).get("opportunity_strength")
                        or analysis.get("opportunity_strength")
                        or 0
                    ),
                    "signals": analysis.get("signals") or {},
                    "opportunity_reasons": analysis.get("opportunity_reasons") or [],
                    "notes": analysis.get("notes") or "",
                }
            )

        await ctx.think()
        response = await self.ask(
            ctx,
            PROMPT.format(
                goal=ctx.goal,
                industry=ctx.industry,
                location=ctx.location,
                target_count=ctx.target_count,
                candidates=json.dumps(candidates, ensure_ascii=False, indent=1),
            ),
            system=SYSTEM,
            context={"candidates": candidates, "seed": ctx.seed},
        )
        try:
            _raw = response.text if hasattr(response, "text") else str(response)
            import re as _r; _m = _r.search(r"{.*}", _raw, _r.DOTALL)
            data = __import__("json").loads(_m.group()) if _m else {}
        except Exception:
            data = {}
        qualified = data.get("qualified") or []
        rejected = data.get("rejected") or []

        def _n(value: Any) -> str:
            return re.sub(r"[^a-z0-9]", "", str(value or "").lower())

        company_by_name = {_n(c["name"]): c for c in companies}
        # Safety net: a live model may rename or drop candidates. If none of its
        # answers match a researched company, fall back to ranking by analyst strength.
        if candidates and not any(company_by_name.get(_n(e.get("name"))) for e in qualified if isinstance(e, dict)):
            ranked = sorted(candidates, key=lambda c: -int(c.get("opportunity_strength") or 0))
            qualified = [
                {"name": c["name"], "score": max(55, min(98, int(c.get("opportunity_strength") or 70))),
                 "tier": "High" if int(c.get("opportunity_strength") or 70) >= 75 else "Medium", "dimensions": []}
                for c in ranked[: ctx.target_count]
            ]
        leads: list[dict[str, Any]] = []

        for entry in qualified:
            company = company_by_name.get(_n(entry.get("name")))
            if not company:
                continue
            analysis = analysis_by_name.get(company["name"]) or {}
            signals = analysis.get("signals") or {}
            score = int(entry.get("score") or 0)
            tier = str(entry.get("tier") or "Medium")

            lead_id = insert_lead(
                ctx.mission_id, ctx.workspace_id, company["id"],
                score=score, tier=tier, opportunity=signals.get("opportunity") or tier,
                status="review", notes=analysis.get("notes"),
            )

            for reason in analysis.get("opportunity_reasons") or []:
                insert_signal(ctx.mission_id, lead_id, company["id"], "Opportunity reason", reason,
                              severity="positive", evidence=company["source"] or "Analyst finding")
            for label, value in signals.items():
                if label == "opportunity_strength":
                    continue
                severity = "warning" if str(value) in {"Low", "No", "Not detected"} else "neutral"
                insert_signal(ctx.mission_id, lead_id, company["id"], label.replace("_", " ").title(),
                              str(value), severity=severity,
                              evidence=company["source"] or "Analyst finding")

            for dimension in entry.get("dimensions") or []:
                insert_score(
                    ctx.mission_id, lead_id,
                    str(dimension.get("dimension") or "Signal"),
                    float(dimension.get("weight") or 0),
                    int(dimension.get("score") or 0),
                    str(dimension.get("rationale") or ""),
                )

            leads.append({"id": lead_id, "name": company["name"], "score": score, "tier": tier})

        # Removal reasons are summarised so the activity feed explains itself.
        buckets: dict[str, list[str]] = {}
        for entry in rejected:
            reason = str(entry.get("reason") or "Removed - insufficient evidence")
            buckets.setdefault(reason, []).append(str(entry.get("name") or ""))

        set_step(ctx.mission_id, "qualify", status="complete", progress=100,
                 detail=f"{len(qualified)} qualified, {len(rejected)} removed")
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Qualification", "qualification.scored", "complete",
            f"Analyst qualified {len(qualified)} opportunities from {len(candidates)} candidates.",
            {"qualified": len(qualified), "reviewed": len(candidates)},
        )
        for reason, names in buckets.items():
            log_activity(
                ctx.workspace_id, ctx.mission_id, "Qualification", "qualification.pruned", "warn",
                f"{len(names)} opportunities removed - {reason.lower()}.",
                {"reason": reason, "examples": names[:3]},
            )
        high_intent = sum(1 for lead in leads if lead["score"] >= 80)
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Qualification", "qualification.intent", "info",
            f"{high_intent} high-intent opportunities identified.",
            {"count": high_intent},
        )
        return {"qualified": len(qualified), "rejected": len(rejected), "high_intent": high_intent}
