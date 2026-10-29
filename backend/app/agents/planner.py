"""Planner Agent - converts a business goal into an executable plan."""

from __future__ import annotations

from typing import Any

from ..repository import log_activity, set_step, update_mission
from .base import Agent, AgentContext

SYSTEM = (
    "You are the Planner agent inside an AI business operator. You translate a business goal into a "
    "concrete execution plan. You never decide to contact anyone; you only decide what work must be "
    "done and how success is measured. Respond with JSON only."
)

PROMPT = """Business goal: {goal}

Working context
- Target industry: {industry}
- Location: {location}
- Target number of opportunities: {target_count}
- Desired action: {desired_action}

Produce an execution plan as JSON with this exact shape:
{{
  "title": "<short mission title>",
  "interpretation": "<one paragraph restating the goal in operational terms>",
  "steps": [{{"key": "research|analyze|qualify|personalize|review", "name": "<name>",
              "objective": "<what this step must achieve>", "method": "<how it will be done>"}}],
  "success_criteria": ["<measurable criterion>"],
  "constraints": ["<guardrail>"],
  "search_terms": ["<research query>"]
}}
"""


class PlannerAgent(Agent):
    key = "planner"
    name = "Planner"
    role = "Turns a business goal into an executable plan"
    step_key = "plan"
    task = "plan"

    async def execute(self, ctx: AgentContext) -> dict[str, Any]:
        await ctx.think()
        plan = await self.ask(
            ctx,
            PROMPT.format(
                goal=ctx.goal,
                industry=ctx.industry,
                location=ctx.location,
                target_count=ctx.target_count,
                desired_action=ctx.mission.get("desired_action") or "Personalized Outreach",
            ),
            system=SYSTEM,
            context={
                "goal": ctx.goal,
                "industry": ctx.industry,
                "location": ctx.location,
                "target_count": ctx.target_count,
                "desired_action": ctx.mission.get("desired_action"),
            },
        )
        data = plan.json()

        title = str(data.get("title") or ctx.mission.get("title") or "Untitled Mission")
        update_mission(ctx.mission_id, title=title, summary=str(data.get("interpretation") or ""))
        set_step(ctx.mission_id, "plan", status="complete", progress=100,
                 detail=str(data.get("interpretation") or "Execution plan created"))

        log_activity(
            ctx.workspace_id, ctx.mission_id, "Planner", "plan.created", "complete",
            "Planner created an execution strategy with "
            f"{len(data.get('steps') or [])} workstreams and "
            f"{len(data.get('success_criteria') or [])} success criteria.",
            {"criteria": data.get("success_criteria") or []},
        )
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Planner", "plan.criteria", "info",
            "Success criteria locked: " + ", ".join(str(c) for c in (data.get("success_criteria") or [])[:2]),
        )
        return data
