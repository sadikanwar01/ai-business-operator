"""Demo AI provider.

Stands in for a live model when no Nebius credentials are configured. It
implements the exact same `AIProvider` contract as the Nebius client and
returns the same JSON envelopes, so agent code is identical in both modes.

Every response is deterministic for a given mission seed, which keeps demo
presentations repeatable: the same goal always produces the same researched
companies, scores and outreach.
"""

from __future__ import annotations

import random
import time
from typing import Any

from .ai_provider import AIProvider, AIRequest, AIResponse
from . import demo_dataset as ds


def _rng(seed: int, salt: str) -> random.Random:
    return random.Random(f"{seed}:{salt}")


class DemoProvider(AIProvider):
    name = "demo"
    mode = "demo"

    def __init__(self, model: str = "operator-demo-simulator") -> None:
        self.model = model
        self.mode = "demo"

    async def complete(self, request: AIRequest) -> AIResponse:
        started = time.perf_counter()
        context = request.context or {}
        seed = int(context.get("seed", 0))

        if request.task == "plan":
            payload = self._plan(context)
        elif request.task == "research":
            payload = self._research(context)
        elif request.task == "analyze":
            payload = self._analyze(context)
        elif request.task == "qualify":
            payload = self._qualify(context)
        elif request.task == "write":
            payload = self._write(context)
        elif request.task == "review":
            payload = self._review(context)
        else:
            payload = {"note": f"Unsupported task '{request.task}'", "context": context}

        import json

        text = json.dumps(payload, ensure_ascii=False)
        return AIResponse(
            text=text,
            provider=self.name,
            model=self.model,
            mode="demo",
            latency_ms=int((time.perf_counter() - started) * 1000),
            prompt_tokens=len(request.prompt) // 4,
            completion_tokens=len(text) // 4,
            raw={"demo": True},
        )

    # ------------------------------------------------------------------
    # Planner
    # ------------------------------------------------------------------
    def _plan(self, context: dict[str, Any]) -> dict[str, Any]:
        goal = context.get("goal", "")
        industry = context.get("industry") or "Healthcare"
        location = context.get("location") or "India"
        target = int(context.get("target_count") or 10)
        action = context.get("desired_action") or "Personalized Outreach"

        goal_lower = goal.lower()
        if "multi-speciality" in goal_lower or "multispeciality" in goal_lower:
            title = "Multi-Speciality Hospital Outreach"
        elif "dental" in goal_lower:
            title = "Dental Clinic Lead Generation"
        elif "restaurant" in goal_lower:
            title = "Restaurant Lead Generation"
        elif "real estate" in goal_lower:
            title = "Real Estate Lead Generation"
        else:
            title = f"{industry} Lead Generation"
        if location and location.lower() not in {"india", "global", "worldwide"}:
            title = f"{title} - {location}"

        return {
            "title": title,
            "interpretation": (
                f"Identify {target} {industry.lower()} businesses in {location} whose current digital "
                f"presence creates measurable friction, then prepare {action.lower()} grounded in what "
                f"was actually observed."
            ),
            "steps": [
                {
                    "key": "research",
                    "name": "Research",
                    "objective": f"Discover candidate {industry.lower()} businesses across {location}.",
                    "method": "Directory sweep, business listings, and public web presence review.",
                },
                {
                    "key": "analyze",
                    "name": "Analyze",
                    "objective": "Evaluate website quality, mobile experience and booking capability.",
                    "method": "Signal extraction from each company's public site and listings.",
                },
                {
                    "key": "qualify",
                    "name": "Qualify",
                    "objective": "Score opportunity and remove records without a defensible signal.",
                    "method": "Weighted scoring across digital gap, intent and business fit.",
                },
                {
                    "key": "personalize",
                    "name": "Personalize",
                    "objective": f"Prepare {action.lower()} for the highest scoring opportunities.",
                    "method": "Message generation conditioned on detected signals and brand knowledge.",
                },
                {
                    "key": "review",
                    "name": "Review",
                    "objective": "Verify every claim is supported by collected evidence.",
                    "method": "Grounding check, tone check and spam-risk check.",
                },
            ],
            "success_criteria": [
                f"{target} opportunities delivered with a documented reason for each",
                "Every outreach message traceable to an observed signal",
                "No claim in any message unsupported by the research record",
            ],
            "constraints": [
                "Only businesses physically operating in the target location",
                "No message is sent without human approval",
            ],
            "search_terms": [
                f"{industry.lower()} clinics {location}",
                f"{industry.lower()} hospital website",
                f"{industry.lower()} online booking {location}",
            ],
            "raw_goal": goal,
        }

    # ------------------------------------------------------------------
    # Researcher
    # ------------------------------------------------------------------
    def _research(self, context: dict[str, Any]) -> dict[str, Any]:
        industry = (context.get("industry") or "Healthcare").strip()
        location = (context.get("location") or "India").strip()
        target = int(context.get("target_count") or 10)
        seed = int(context.get("seed", 0))

        if industry.lower() in {"healthcare", "medical", "health", "hospital", "clinic"}:
            universe = ds.healthcare_candidates()
        else:
            universe = ds.generic_candidates(industry, location, 47)

        universe = self._filter_location(universe, location)

        rng = _rng(seed, "research")
        # Discovery order is randomised so the feed is not a simple copy of
        # the curated list, but the underlying attributes stay stable.
        order = list(range(len(universe)))
        rng.shuffle(order)

        candidates = []
        for idx in order:
            row = universe[idx]
            source, url = ds._research_source(rng, row["name"])
            candidates.append(
                {
                    "name": row["name"],
                    "city": row["city"],
                    "state": row["state"],
                    "location": row["location"],
                    "industry": row["industry"],
                    "specialty": row["specialty"],
                    "employees": row["employees"],
                    "founded": row["founded"],
                    "website": ds._domain(row["name"]),
                    "rating": row["rating"],
                    "reviews": row["reviews"],
                    "activity_index": row["activity_index"],
                    "source": source,
                    "source_url": url,
                    "website_quality": row["website_quality"],
                    "has_booking": row["has_booking"],
                    "mobile_optimised": row["mobile_optimised"],
                }
            )
        return {
            "candidates": candidates,
            "total_discovered": len(candidates),
            "coverage_note": f"{len(candidates)} candidates collected across {location}.",
        }

    @staticmethod
    def _filter_location(universe: list[dict[str, Any]], location: str) -> list[dict[str, Any]]:
        """Narrow the universe when the mission targets a specific region."""
        target = (location or "").strip().lower()
        if not target or target in {"india", "global", "worldwide", "all"}:
            return universe
        matches = [
            row for row in universe
            if target in row["state"].lower() or target in row["city"].lower()
        ]
        return matches if len(matches) >= 4 else universe

    # ------------------------------------------------------------------
    # Analyst
    # ------------------------------------------------------------------
    def _analyze(self, context: dict[str, Any]) -> dict[str, Any]:
        companies = context.get("companies") or ([context["company"]] if context.get("company") else [])
        return {"analyses": [self._analyze_one(c, context) for c in companies]}

    def _analyze_one(self, company: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        score_hint = int(company.get("activity_index") or company.get("opportunity_strength") or 0)
        rng = _rng(int(context.get("seed", 0)) + score_hint, f"analyze:{company.get('name')}")

        health = ds.website_health(
            company.get("website_quality", "medium"),
            bool(company.get("mobile_optimised")),
            bool(company.get("has_booking")),
        )

        reasons: list[str] = []
        if company.get("website_quality") == "low":
            reasons.append("Website appears outdated")
            reasons.append("Layout predates current mobile-first standards")
        else:
            reasons.append("Website structure is dated and hard to navigate")
        if not company.get("mobile_optimised"):
            reasons.append("Weak mobile experience")
        if not company.get("has_booking"):
            reasons.append("No visible online booking")
        else:
            reasons.append("Booking flow exists but is not prominent")
        reasons.append("Strong local presence")
        reasons.append("Active business")
        if company.get("reviews", 0) > 300:
            reasons.append("Consistently high review volume")

        watchouts = []
        if company.get("website_quality") == "high":
            watchouts.append("Site is already modern - differentiate on a different service line")
        if company.get("has_booking") and company.get("mobile_optimised"):
            watchouts.append("Digital presence is already strong - lower priority")

        return {
            "company": company.get("name"),
            "signals": {
                "website_quality": health["website_quality"],
                "digital_presence": health["digital_presence"],
                "seo_readiness": health["seo_readiness"],
                "booking_capability": health["booking_capability"],
                "mobile_optimised": health["mobile_optimised"],
                "business_activity": "Active" if (company.get("reviews") or 0) > 100 else "Moderate",
                "opportunity": "High" if score_hint >= 80 else ("Medium" if score_hint >= 68 else "Low"),
            "opportunity_strength": score_hint,
            },
            "opportunity_reasons": reasons,
            "watchouts": watchouts,
            "opportunity_type": "New website" if company.get("website_quality") == "low" else "Website redesign",
            "technical_debt": rng.choice(
                ["Non-responsive grid, image-heavy hero", "Legacy CMS with no mobile template", "No structured data"]
            ),
            "notes": (
                f"Public site for {company.get('name')} in {company.get('city')} presents a clear "
                f"rebuild case for a {company.get('specialty')} provider."
            ),
        }

    # ------------------------------------------------------------------
    # Qualification
    # ------------------------------------------------------------------
    def _qualify(self, context: dict[str, Any]) -> dict[str, Any]:
        candidates = context.get("candidates") or []
        qualified: list[dict[str, Any]] = []
        rejected: list[dict[str, Any]] = []

        for candidate in candidates:
            score = int(candidate.get("opportunity_strength") or candidate.get("activity_index") or 0)
            if score >= 63:
                qualified.append(
                    {
                        "name": candidate.get("name"),
                        "score": score,
                        "tier": ds.tier_for(score),
                        "dimensions": [
                            {"dimension": "Digital gap", "score": min(100, score + 6), "weight": 0.34,
                             "rationale": "Measurable shortfall in the current web experience."},
                            {"dimension": "Business quality", "score": min(100, score + 3), "weight": 0.26,
                             "rationale": "Consistent operating footprint and review volume."},
                            {"dimension": "Intent signal", "score": max(20, score - 4), "weight": 0.18,
                             "rationale": "Active marketing and enquiry channels observed."},
                            {"dimension": "Service fit", "score": max(25, score - 2), "weight": 0.14,
                             "rationale": "Matches the services configured in Knowledge."},
                            {"dimension": "Reachability", "score": max(30, score - 1), "weight": 0.08,
                             "rationale": "Contact routes present on public listings."},
                        ],
                    }
                )
            else:
                rejected.append(
                    {
                        "name": candidate.get("name"),
                        "score": score,
                        "reason": (
                            "Insufficient evidence of a digital opportunity"
                            if score >= 50
                            else "Low business activity and no verifiable digital gap"
                        ),
                    }
                )

        qualified.sort(key=lambda item: item["score"], reverse=True)
        return {"qualified": qualified, "rejected": rejected}

    # ------------------------------------------------------------------
    # Writer
    # ------------------------------------------------------------------
    def _write(self, context: dict[str, Any]) -> dict[str, Any]:
        company = context.get("company") or {}
        signals = context.get("signals") or {}
        reasons = context.get("reasons") or []
        knowledge = context.get("knowledge") or {}
        services = knowledge.get("services") or ["Web Development", "SEO", "AI Automation"]
        style = ", ".join(knowledge.get("style") or ["Professional", "Concise", "Consultative"])
        agency = knowledge.get("company") or "My Agency"
        sender = knowledge.get("sender") or "Sadik"

        name = company.get("name", "your team")
        short = name.split()[0]
        city = company.get("city", "")
        specialty = company.get("specialty", "healthcare").lower()
        web_quality = str(signals.get("website_quality", "Low")).lower()
        mobile = signals.get("mobile_optimised") == "Yes"
        booking = signals.get("booking_capability") == "Available"

        observation = (
            f"your website still loads a desktop-first layout, which is hard to use on a phone"
            if not mobile
            else f"your site is functional but the structure is dated and hard to scan"
        )
        if not booking:
            observation += ", and there is no online appointment flow I could find"

        body = (
            f"Hi {short} team,\n\n"
            f"I came across {name} while reviewing {specialty} providers around {city}. "
            f"Two things stood out: {observation}.\n\n"
            f"On the business side, the opposite is true - {company.get('reviews', 0)} public reviews "
            f"at a {company.get('rating', 4.0)} rating is real demand, and it is being won offline "
            f"because the site does not convert it.\n\n"
            f"We are {agency}, a team that builds websites, SEO and AI automation for businesses in "
            f"exactly this situation. We rebuilt three similar {specialty} sites in the last quarter "
            f"and appointment enquiries rose by roughly a third - largely because patients can now "
            f"book in two taps instead of calling.\n\n"
            f"Would a 20-minute call next week be useful? I can walk you through what a current "
            f"version of {short}'s site would look like and what it would cost to run.\n\n"
            f"Best,\n{sender}\n{agency}"
        )

        subject = f"{short} - a faster way to convert patient enquiries"

        return {
            "subject": subject,
            "body": body,
            "confidence": round(min(0.97, 0.78 + (0.02 if mobile else 0.06) + (0.02 if booking else 0.04)), 2),
            "tone": "Consultative" if "Consultative" in style else "Professional",
            "grounded_reasons": reasons[:3],
            "flags": [],
            "word_count": len(body.split()),
        }

    # ------------------------------------------------------------------
    # Reviewer
    # ------------------------------------------------------------------
    def _review(self, context: dict[str, Any]) -> dict[str, Any]:
        message = context.get("message") or {}
        company = context.get("company") or {}
        body = str(message.get("body", ""))
        reasons = context.get("reasons") or []
        rng = _rng(int(context.get("seed", 0)), f"review:{company.get('name')}")

        unsupported = []
        lowered = body.lower()
        for banned, reason in [
            ("guaranteed", "Unverifiable guarantee"),
            ("best in", "Unsupported superlative"),
            ("#1", "Unsupported ranking claim"),
            ("world class", "Unsupported superlative"),
            ("free of charge", "Commercial claim not present in the research record"),
        ]:
            if banned in lowered:
                unsupported.append(reason)

        spam_terms = ["act now", "limited time", "urgent", "exclusive offer", "buy now"]
        spam_hits = [term for term in spam_terms if term in lowered]

        grounding = 0.93 if reasons else 0.72
        grounding -= 0.08 * len(unsupported)
        grounding -= 0.04 * len(spam_hits)
        grounding = max(0.45, min(0.99, round(grounding, 2)))

        tone_score = max(0.5, min(0.99, round(0.94 - 0.05 * len(spam_hits), 2)))
        length_words = len(body.split())
        length_ok = 60 <= length_words <= 220

        notes: list[str] = []
        if unsupported:
            notes.extend(unsupported)
        if spam_hits:
            notes.append("Promotional phrasing detected")
        if not length_ok:
            notes.append(f"Length {length_words} words is outside the preferred 60-220 range")
        if not notes:
            notes.append("Every claim traces to an observed signal")
            notes.append("No promotional phrasing detected")
            notes.append("Tone matches the configured communication style")

        verdict = "revise" if unsupported else "approve"

        return {
            "verdict": verdict,
            "confidence": grounding,
            "grounding_score": grounding,
            "tone_score": tone_score,
            "spam_score": round(rng.uniform(0.01, 0.06), 3),
            "review_notes": notes,
            "suggestion": (
                "Remove the unsupported claim before sending." if verdict == "revise" else "Approved for sending."
            ),
            "flags": unsupported + spam_hits,
        }
