"""The Operator - coordinates the multi-agent workflow.

    Goal -> Planner -> Research -> Analyse -> Qualify -> Personalise -> Review -> Result

The Operator owns mission state. Each agent owns its own artefacts. A failure
in any agent stops the mission cleanly and records why, instead of leaving a
blank screen behind.
"""

from __future__ import annotations

import asyncio
import hashlib
from typing import Any

from ..db import query, query_one
from ..repository import (
    knowledge_flat,
    log_activity,
    now,
    set_agent,
    set_step,
    update_mission,
)
from ..services.ai_provider import AIProvider, AIProviderError
from .analyst import AnalystAgent
from .base import Agent, AgentContext
from .planner import PlannerAgent
from .qualifier import QualificationAgent
from .researcher import ResearcherAgent
from .reviewer import ReviewerAgent
from .writer import WriterAgent

AGENT_CLASSES: dict[str, type[Agent]] = {
    "plan": PlannerAgent,
    "research": ResearcherAgent,
    "analyze": AnalystAgent,
    "qualify": QualificationAgent,
    "personalize": WriterAgent,
    "review": ReviewerAgent,
}

AGENT_TASKS = {
    "Planner": {
        "working": "Translating the goal into execution steps",
        "complete": "Execution plan created",
    },
    "Researcher": {
        "working": "Finding and evaluating potential businesses",
        "complete": "Candidate businesses collected",
    },
    "Analyst": {
        "working": "Evaluating website quality and digital presence",
        "complete": "Opportunity signals detected",
    },
    "Qualification": {
        "working": "Scoring leads and removing weak records",
        "complete": "Opportunities scored and ranked",
    },
    "Writer": {
        "working": "Drafting messages grounded in detected signals",
        "complete": "Personalised messages drafted",
    },
    "Reviewer": {
        "working": "Verifying claims against the research record",
        "complete": "Outputs checked and cleared",
    },
    "Operator": {
        "working": "Coordinating the workflow",
        "complete": "Mission delivered",
    },
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


def stable_seed(mission_id: str) -> int:
    return int(hashlib.sha256(mission_id.encode()).hexdigest()[:8], 16)


class Operator:
    """Runs a mission end to end."""

    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    async def run(
        self,
        mission_id: str,
        workspace_id: str,
        *,
        resume: bool = False,
        pace: float = 0.0,
        max_steps: int | None = None,
    ) -> dict[str, Any]:
        mission = query_one("SELECT * FROM missions WHERE id = ?", (mission_id,))
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")

        ctx = AgentContext(
            mission=mission,
            workspace_id=workspace_id,
            provider=self.provider,
            seed=stable_seed(mission_id),
            knowledge=knowledge_flat(workspace_id),
            pace=pace,
        )

        update_mission(
            mission_id,
            status="running",
            error=None,
            provider=self.provider.name,
            model=self.provider.model,
            mode=self.provider.mode,
            started_at=mission["started_at"] or now(),
        )
        log_activity(
            workspace_id, mission_id, "Operator", "mission.started", "info",
            f"Operator started the workflow using the {self.provider.name} provider "
            f"({self.provider.mode} mode).",
            {"provider": self.provider.name, "mode": self.provider.mode},
        )

        steps = query(
            "SELECT * FROM mission_steps WHERE mission_id = ? ORDER BY order_index", (mission_id,)
        )
        executed = 0

        for step in steps:
            if resume and step["status"] == "complete":
                continue
            if max_steps is not None and executed >= max_steps:
                break

            key = step["key"]
            agent_cls = AGENT_CLASSES.get(key)
            if agent_cls is None:
                continue

            agent = agent_cls(self.provider)
            phrase = STEP_PHRASES.get(key, key)
            set_step(mission_id, key, status="running", progress=0, detail=phrase)
            set_agent(mission_id, step["agent"], status="working",
                     task=AGENT_TASKS.get(step["agent"], {}).get("working", agent.role))
            update_mission(mission_id, current_step=phrase)
            log_activity(
                workspace_id, mission_id, agent.name, f"{key}.started", "info",
                f"{agent.name} is {phrase.lower()}.",
                {"step": key},
            )

            try:
                await agent.execute(ctx)
            except AIProviderError as exc:
                set_step(mission_id, key, status="failed", detail=str(exc))
                set_agent(mission_id, step["agent"], status="failed", task=str(exc))
                update_mission(mission_id, status="failed", error=str(exc))
                log_activity(
                    workspace_id, mission_id, agent.name, f"{key}.failed", "error",
                    f"{agent.name} could not complete this step: {exc}",
                    {"code": exc.code},
                )
                return {"status": "failed", "step": key, "error": str(exc)}
            except Exception as exc:  # pragma: no cover - defensive
                set_step(mission_id, key, status="failed", detail=str(exc))
                set_agent(mission_id, step["agent"], status="failed", task=str(exc))
                update_mission(mission_id, status="failed", error=str(exc))
                log_activity(
                    workspace_id, mission_id, agent.name, f"{key}.failed", "error",
                    f"{agent.name} stopped unexpectedly: {exc}",
                )
                return {"status": "failed", "step": key, "error": str(exc)}

            set_step(mission_id, key, status="complete", progress=100, detail=phrase)
            set_agent(mission_id, step["agent"], status="complete",
                     task=AGENT_TASKS.get(step["agent"], {}).get("complete", agent.role))
            executed += 1

        if max_steps is not None and executed >= max_steps:
            return {"status": "running", "step": None, "error": None}

        # ---- Result -----------------------------------------------------
        summary = self._summarise(mission_id)
        set_step(mission_id, "result", status="complete", progress=100,
                 detail="Result package assembled")
        set_agent(mission_id, "Operator", status="complete", task="Mission delivered")
        update_mission(
            mission_id,
            status="completed",
            progress=100,
            current_step="Mission complete",
            completed_at=now(),
            summary=summary,
        )
        log_activity(
            workspace_id, mission_id, "Operator", "mission.completed", "complete",
            "Mission complete. The result package is ready for review.",
            summary,
        )
        return {"status": "completed", "step": None, "error": None}

    def _summarise(self, mission_id: str) -> dict[str, Any]:
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
        return {
            "companies_researched": researched,
            "qualified": qualified,
            "high_intent": high_intent,
            "outreach_ready": outreach,
        }


def _provider_for(mission_id: str):
    """Honour the mission's own mode: demo missions never touch the live API."""
    from ..db import query_one
    from ..services.demo import DemoProvider
    from ..services.provider_factory import build_provider

    row = query_one("SELECT mode FROM missions WHERE id = ?", (mission_id,))
    return DemoProvider() if row and row["mode"] == "demo" else build_provider()


async def run_mission_in_background(
    mission_id: str, workspace_id: str, *, resume: bool = False, pace: float = 0.0
) -> None:
    """Entry point used by the API layer (FastAPI background task)."""
    from ..services.provider_factory import build_provider

    operator = Operator(_provider_for(mission_id))
    try:
        await operator.run(mission_id, workspace_id, resume=resume, pace=pace)
    except Exception as exc:  # pragma: no cover - defensive
        update_mission(mission_id, status="failed", error=str(exc))
        log_activity(
            workspace_id, mission_id, "Operator", "mission.failed", "error",
            f"The workflow could not be completed: {exc}",
        )


async def run_mission_now(
    mission_id: str,
    workspace_id: str,
    *,
    resume: bool = False,
    pace: float = 0.0,
    max_steps: int | None = None,
) -> dict[str, Any]:
    """Awaited variant used by the seeding routine."""
    from ..services.provider_factory import build_provider

    operator = Operator(_provider_for(mission_id))
    return await operator.run(
        mission_id, workspace_id, resume=resume, pace=pace, max_steps=max_steps
    )


def sleep_briefly(seconds: float) -> None:  # pragma: no cover - helper
    asyncio.run(asyncio.sleep(seconds))
