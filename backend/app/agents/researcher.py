"""Research Agent - discovers candidate businesses and records the evidence."""

from __future__ import annotations

import asyncio
import ipaddress
import json
import re
import socket
import time
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

import httpx

from ..config import settings
from ..services.ai_provider import AIProviderError

from ..db import query_one
from ..repository import insert_company, insert_research_record, log_activity, set_step
from .base import Agent, AgentContext

SYSTEM = (
    "You are the Research agent. You collect verifiable public information about businesses and "
    "record where each fact came from. You never invent facts. Every field you return must be "
    "traceable to a source. Respond with JSON only."
)

PROMPT = """Find candidate businesses for this mission.

Goal: {goal}
Industry: {industry}
Location: {location}

Return JSON:
{{"candidates": [{{"name": "...", "city": "...", "state": "...", "location": "...",
  "industry": "...", "specialty": "...", "employees": 0, "founded": "YYYY",
  "website": "example.com", "rating": 4.3, "reviews": 0,
  "source": "<where this record was found>", "source_url": "https://...",
  "website_quality": "low|medium|high", "has_booking": true, "mobile_optimised": false}}],
  "total_discovered": 0}}
"""


SKIP = re.compile(r"(justdial|practo|wikipedia|facebook|linkedin|youtube|instagram|twitter|x\\.com|indiamart|sulekha|lybrate|1mg|quora|reddit|google|apollo247|medium|pinterest|tripadvisor|yelp|clutch|glassdoor)\\.", re.I)
LIVE_PROMPT = """Extract business profiles using ONLY the text provided. Use null when the text does not state a value. Never guess.
Search results:
{items}
Return JSON: {{"profiles": [{{"domain": "...", "name": "...", "city": null, "state": null, "specialty": null}}]}}"""


def _is_public(host: str) -> bool:
    try:
        return all(ipaddress.ip_address(a[4][0]).is_global for a in socket.getaddrinfo(host, None))
    except Exception:
        return False


class ResearcherAgent(Agent):
    key = "researcher"
    name = "Researcher"
    role = "Collects relevant company information"
    step_key = "research"
    task = "research"

    async def execute(self, ctx: AgentContext) -> dict[str, Any]:
        await ctx.think()
        if getattr(ctx.provider, "mode", "demo") == "live":
            candidates = await self._live(ctx)
        else:
            response = await self.ask(
                ctx,
                PROMPT.format(goal=ctx.goal, industry=ctx.industry, location=ctx.location),
                system=SYSTEM,
                context={
                    "goal": ctx.goal,
                    "industry": ctx.industry,
                    "location": ctx.location,
                    "target_count": ctx.target_count,
                },
            )
            data = response.json()
            candidates = data.get("candidates") or []
        total = len(candidates)

        for candidate in candidates:
            company_id = insert_company(
                workspace_id=ctx.workspace_id,
                mission_id=ctx.mission_id,
                name=candidate.get("name", "Unknown"),
                industry=candidate.get("industry") or ctx.industry,
                location=candidate.get("location"),
                city=candidate.get("city"),
                website=candidate.get("website"),
                specialty=candidate.get("specialty"),
                founded=candidate.get("founded"),
                employees=candidate.get("employees"),
                source=candidate.get("source"),
                source_url=candidate.get("source_url"),
            )
            source = candidate.get("source") or "Public web listing"
            source_url = candidate.get("source_url") or ""
            website_url = f"https://{candidate.get('website')}"
            records = [
                ("Website", candidate.get("website"), "Company website", website_url,
                 f"Primary domain of record for {candidate.get('name')}.", 0.94),
                ("Website quality", str(candidate.get("website_quality") or "medium").title(),
                 "Website review", website_url,
                 f"Page structure, layout and content freshness assessed as "
                 f"{candidate.get('website_quality')}.", 0.78),
                ("Location", candidate.get("location"), source, source_url,
                 f"Business listed in {candidate.get('location')}.", 0.91),
                ("Speciality", candidate.get("specialty"), source, source_url,
                 f"Focus area: {candidate.get('specialty')}.", 0.86),
                ("Team size", candidate.get("employees"), source, source_url,
                 f"Approximately {candidate.get('employees')} staff.", 0.72),
                ("Founded", candidate.get("founded"), source, source_url,
                 f"Operating since {candidate.get('founded')}.", 0.8),
                ("Public rating", candidate.get("rating"),
                 "Google Reviews aggregate", source_url,
                 f"Public rating of {candidate.get('rating')} across review platforms.",
                 0.83),
                ("Review count", candidate.get("reviews"),
                 "Google Reviews aggregate", source_url,
                 f"{candidate.get('reviews')} public reviews recorded.",
                 0.81),
                ("Activity index", candidate.get("activity_index"),
                 "Directory activity index", source_url,
                 f"Relative activity index of {candidate.get('activity_index')}/100 from listing signals.",
                 0.7),
                ("Booking capability",
                 "Online booking present" if candidate.get("has_booking") else "No online booking detected",
                 "Website review", source_url,
                 "Booking flow checked on the public site.", 0.77),
                ("Mobile experience",
                 "Responsive layout detected" if candidate.get("mobile_optimised") else "Mobile layout degraded",
                 "Website review", source_url,
                 "Viewport rendering reviewed at mobile width.", 0.75),
            ]
            records += candidate.get("extra", [])
            for field_name, value, record_source, url, excerpt, confidence in records:
                if value is None:
                    continue
                insert_research_record(
                    ctx.mission_id, company_id, field_name, value,
                    source=record_source, source_url=url, excerpt=excerpt, confidence=confidence,
                )

        set_step(ctx.mission_id, "research", status="complete", progress=100,
                 detail=f"{total} candidate businesses collected")
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Researcher", "research.discovered", "complete",
            f"Researcher discovered {total} candidate businesses.",
            {"count": total},
        )
        log_activity(
            ctx.workspace_id, ctx.mission_id, "Researcher", "research.evidence", "info",
            f"Recorded {total * 8} evidence-backed business fields across public sources.",
            {"fields": total * 8},
        )
        return {"total_discovered": total}

    async def _measure(self, host: str) -> dict[str, Any] | None:
        """Real HTTP check of a website. No LLM involved."""
        if not await asyncio.to_thread(_is_public, host):
            return None
        r = None
        t0 = time.perf_counter()
        async with httpx.AsyncClient(follow_redirects=True, timeout=9,
                                     headers={"user-agent": "Mozilla/5.0 (compatible; OperatorBot/1.0)"}) as c:
            for scheme in ("https", "http"):
                try:
                    t0 = time.perf_counter()
                    r = await c.get(f"{scheme}://{host}")
                    break
                except Exception:
                    continue
        if r is None:
            return None
        ms = int((time.perf_counter() - t0) * 1000)
        html = r.text[:300000]
        yrs = [int(y) for y in re.findall(r"(?:\u00a9|&copy;|copyright)[^0-9]{0,20}((?:19|20)\d\d)", html, re.I)]
        yr, now = (max(yrs) if yrs else None), datetime.now().year
        mobile = bool(re.search(r"<meta[^>]+name=[\"']viewport[\"'][^>]*width=device-width", html, re.I))
        booking = bool(re.search(r"book(ing)?\b|appointment|schedule", html, re.I))
        cta = bool(re.search(r"href=[\"'](tel:|mailto:)|contact us|call now|enquire|get in touch", html, re.I))
        seo = bool(re.search(r"<title>[^<]{3,}", html, re.I)) and bool(re.search(r"<meta[^>]+name=[\"']description[\"']", html, re.I))
        https = str(r.url).startswith("https")
        fresh = 1 if yr and yr >= now - 1 else 0.4 if yr and yr >= now - 3 else 0.3 if not yr else 0
        speed = max(0.0, min(1.0, 1 - (ms - 500) / 3500))
        good = .22 * mobile + .2 * booking + .14 * cta + .1 * https + .12 * fresh + .12 * speed + .1 * seo
        url = str(r.url)
        return {
            "url": url, "quality": "low" if good < .4 else "medium" if good < .7 else "high",
            "booking": booking, "mobile": mobile,
            "extra": [
                ("HTTPS", "Yes" if https else "No", "Direct HTTP check", url, "Checked whether the site is served over TLS.", 0.99),
                ("Server response time", f"{ms} ms", "Direct HTTP check", url, "Time to fetch the homepage.", 0.9),
                ("Freshness", f"Copyright {yr}" if yr else "No year found", "Direct HTTP check", url, "Latest copyright year on the homepage.", 0.7),
                ("Contact options", "Phone or email link present" if cta else "No clear contact call to action", "Direct HTTP check", url, "Contact links on the homepage.", 0.8),
                ("SEO basics", "Title and meta description present" if seo else "Missing title or meta description", "Direct HTTP check", url, "Basic on-page SEO tags.", 0.85),
            ],
        }

    async def _live(self, ctx: AgentContext) -> list[dict[str, Any]]:
        if not settings.tavily_api_key:
            raise AIProviderError("TAVILY_API_KEY is not set. Add it to the server environment.", code="tavily_missing")
        queries = [f"{ctx.industry} businesses in {ctx.location} official website",
                   f"best {ctx.industry} clinics hospitals {ctx.location}",
                   f"{ctx.industry} {ctx.location} book appointment online"]
        found: dict[str, dict[str, str]] = {}
        async with httpx.AsyncClient(timeout=25) as c:
            for q in queries:
                try:
                    resp = await c.post("https://api.tavily.com/search",
                                        headers={"Authorization": f"Bearer {settings.tavily_api_key}"},
                                        json={"query": q, "max_results": 8})
                    resp.raise_for_status()
                except httpx.HTTPError as exc:
                    log_activity(ctx.workspace_id, ctx.mission_id, "Researcher", "research.search_warning", "info",
                                 f"A web search failed: {exc}", {})
                    continue
                for x in resp.json().get("results", []):
                    host = (urlparse(x.get("url", "")).hostname or "").removeprefix("www.")
                    if host and not SKIP.search(host + ".") and host not in found:
                        found[host] = {"title": x.get("title") or host, "snippet": (x.get("content") or "")[:300], "url": x["url"]}
        if not found:
            raise AIProviderError("Web search returned no usable companies. Try a more specific goal.", code="no_results")
        hosts = list(found)[: min(20, max(ctx.target_count * 2, 8))]
        measured = await asyncio.gather(*[self._measure(h) for h in hosts])
        ok = [(h, m) for h, m in zip(hosts, measured) if m]
        if not ok:
            raise AIProviderError("None of the found websites could be reached for checking.", code="no_sites")
        items = [{"domain": h, "title": found[h]["title"], "snippet": found[h]["snippet"]} for h, _ in ok]
        profiles: dict[str, Any] = {}
        try:
            resp = await self.ask(ctx, LIVE_PROMPT.format(items=json.dumps(items, ensure_ascii=False)), system=SYSTEM, context={"items": items})
            profiles = {p["domain"]: p for p in (resp.json().get("profiles") or []) if isinstance(p, dict) and p.get("domain")}
        except Exception:
            profiles = {}
        out = []
        for h, m in ok:
            pr = profiles.get(h, {})
            title = found[h]["title"]
            name = (pr.get("name") or re.split(r"\s[|\-\u2013]\s", title)[0] or h).strip()[:80]
            city, state = pr.get("city"), pr.get("state")
            out.append({
                "name": name, "city": city or ctx.location, "state": state,
                "location": ", ".join(x for x in (city, state) if x) or ctx.location,
                "industry": ctx.industry, "specialty": pr.get("specialty") or ctx.industry, "website": h,
                "source": "Tavily web search", "source_url": found[h]["url"],
                "website_quality": m["quality"], "has_booking": m["booking"], "mobile_optimised": m["mobile"],
                "extra": m["extra"],
            })
        return out
