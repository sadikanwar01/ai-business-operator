"""Agent base types.

Every agent receives the same context and returns a structured result that the
Operator turns into mission state. Agents never talk to the HTTP layer and
never call the provider directly with provider-specific payloads - they go
through `AIProvider.complete` with a task name.
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from ..services.ai_provider import AIProvider, AIRequest, AIResponse


@dataclass
class AgentContext:
    mission: dict[str, Any]
    workspace_id: str
    provider: AIProvider
    seed: int = 0
    knowledge: dict[str, Any] = field(default_factory=dict)
    pace: float = 0.0

    @property
    def mission_id(self) -> str:
        return str(self.mission["id"])

    @property
    def goal(self) -> str:
        return str(self.mission.get("goal") or "")

    @property
    def industry(self) -> str:
        return str(self.mission.get("industry") or "Healthcare")

    @property
    def location(self) -> str:
        return str(self.mission.get("location") or "India")

    @property
    def target_count(self) -> int:
        return int(self.mission.get("target_count") or 10)

    async def think(self, seconds: float | None = None) -> None:
        """Pace the workflow so the operator reads as working, not frozen."""
        delay = self.pace if seconds is None else seconds
        if delay > 0:
            await asyncio.sleep(delay)


class Agent(ABC):
    key: str = "agent"
    name: str = "Agent"
    role: str = ""
    step_key: str = ""
    task: str = ""

    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    async def ask(self, ctx: AgentContext, prompt: str, *, system: str,
                  context: dict[str, Any] | None = None, temperature: float = 0.3) -> AIResponse:
        request = AIRequest(
            task=self.task,
            system=system,
            prompt=prompt,
            json_mode=True,
            temperature=temperature,
            seed=ctx.seed,
            context=context or {},
        )
        return await self.provider.complete(request)

    @abstractmethod
    async def execute(self, ctx: AgentContext) -> dict[str, Any]:
        """Run the agent and persist its artefacts. Returns a summary dict."""
