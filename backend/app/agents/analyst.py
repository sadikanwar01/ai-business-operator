"""Analyst Agent - reads the collected evidence and detects opportunity signals."""

from __future__ import annotations

import json
from typing import Any

from ..db import query
from ..repository import insert_research_record, log_activity, set_step
from .base import Agent, AgentContext

SYSTEM = (
    "You are the Analyst agent. You read the research record of each business and identify concrete "
    "opportunity signals. You never claim something you did not observe in the record. Respond with "
    "JSON only."
)

PROMPT = """Analyse the following researched businesses.

Goal: {goal}
Location: {location}

Businesses (each carries its collected research record):
{companies}

For every business return JSON:
{{"analyses": [{{"company": "<name>", "signals": {{"website_quality": "Low|Medium|High",
  "digital_presence": "...", "seo_readiness": "...", "booking_capability": "...",
  "mobile_optimised": "Yes|No", "business_activity": "...", "opportunity": "High|Medium|Low"}},
  "opportunity_reasons": ["<observable reason>"], "watchouts": ["<caveat>"],
  "opportunity_type": "New website|Website redesign", "technical_debt": "<observed>",
  "opportunity_strength": 0,
  "notes": "<one sentence>"}}]}}
"""

BATCH = 5


def _norm(value: Any) -> str:
    import re
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def _pair(batch: list, analyses: list) -> list:
    """Match model analyses to companies by name, falling back to position."""
    by_name = {_norm(a.get("company")): a for a in analyses if isinstance(a, dict)}
    out = []
    for i, company in enumerate(batch):
        a = by_name.get(_norm(company["name"]))
        if a is None and i < len(analyses) and isinstance(analyses[i], dict):
            a = analyses[i]
        if a is not None:
            out.append((company, a))
    return out


def _to_bool(value: Any, marker: str) -> bool:
    return marker.lower() in str(value).lower()


class AnalystAgent(Agent):
    key = "analyst"
    name = "Analyst"
    role = "Analyzes businesses and identifies opportunity signals"
    step_key = "analyze"
    task = "analyze"

    async def execute(self, ctx: AgentContext) -> dict[str, Any]:
        companies = query(
            "SELECT * FROM companies WHERE mission_id = ? ORDER BY rowid", (ctx.mission_id,)
        )
        total = len(companies)
        analyses: list[dict[str, Any]] = []

        for start in range(0, total, BATCH):
            batch = companies[start : start + BATCH]
            payload = []
            for company in batch:
                records = query(
                    "SELECT field, value, source, source_url, excerpt FROM research_records "
                    "WHERE company_id = ? AND field != 'Analysis'",
                    (company["id"],),
                )
                fields = {r["field"]: r["value"] for r in records}
                payload.append(
                    {
                        "name": company["name"],
                        "city": company["city"],
                        "location": company["location"],
                        "industry": company["industry"],
                        "specialty": company["specialty"],
                        "website": company["website"],
                        "employees": company["employees"],
                        "founded": company["founded"],
                        "rating": float(fields.get("Public rating") or 0),
                        "reviews": int(fields.get("Review count") or 0),
                        "activity_index": int(float(fields.get("Activity index") or 0)),
                        "website_quality": str(fields.get("Website quality") or "medium"),
                        "measured": {k: fields[k] for k in ("HTTPS", "Server response time", "Freshness", "Contact options", "SEO basics") if k in fields},
                        "has_booking": _to_bool(fields.get("Booking capability"), "booking present"),
                        "mobile_optimised": _to_bool(fields.get("Mobile experience"), "responsive"),
                        "source": company["source"],
                        "source_url": company["source_url"],
                    }
                )

            response = await self.ask(
                ctx,
                PROMPT.format(
                    goal=ctx.goal,
                    location=ctx.location,
                    companies=json.dumps(payload, ensure_ascii=False, indent=1),
                ),
                system=SYSTEM,
                context={"companies": payload, "seed": ctx.seed},
            )
            import re as _re2
            _raw = response.text if hasattr(response, "text") else str(response)
            _m = _re2.search(r"{.*}", _raw, _re2.DOTALL)
            data = json.loads(_m.group()) if _m else {}
            batch_analyses = data.get("analyses") or []
            analyses.extend(batch_analyses)

            for company, analysis in _pair(batch, batch_analyses):
                insert_research_record(
                    ctx.mission_id, company["id"], "Analysis",
                    json.dumps(analysis, ensure_ascii=False),
                    source="Analyst", source_url=company["source_url"] or "",
                    excerpt=str(analysis.get("notes") or ""), confidence=0.86,
                )

            done = min(start + BATCH, total)
            set_step(ctx.mission_id, "analyze", status="running", progress=int(done / max(total, 1) * 100),
                     detail=f"Evaluating website quality and digital presence ({done}/{total})")
            await ctx.think(0.35)

        strong = sum(1 for a in analyses if (a.get("signals") or {}).get("opportunity") == "High")
        set_step(ctx.mission_id, "analyze", status="complete", progress=100,
                 detail=f"{total} businesses evaluated, {strong} show a clear opportunity")
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Analyst", "analysis.completed", "complete",
            f"Analyst evaluated website quality across {total} businesses.",
            {"count": total},
        )
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Analyst", "analysis.opportunity", "info",
            f"{strong} businesses show a high-value digital opportunity.",
            {"count": strong},
        )
        return {"analysed": total, "strong": strong}
