"""AI Business Operator - API server."""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import init_db
from .routers import (
    activity,
    analytics,
    auth,
    dashboard,
    followups,
    integrations,
    knowledge,
    leads,
    meta,
    missions,
    outreach,
    research,
    settings as settings_router,
)
from .seed import ensure_demo_workspace, seed_demo_missions
from .services.provider_factory import provider_status

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("operator")

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Autonomous business operations: give the operator a goal, receive a result.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    auth.router,
    meta.router,
    dashboard.router,
    missions.router,
    leads.router,
    research.router,
    outreach.router,
    followups.router,
    analytics.router,
    knowledge.router,
    activity.router,
    integrations.router,
    settings_router.router,
):
    app.include_router(router)


@app.on_event("startup")
async def on_startup() -> None:
    init_db()
    ensure_demo_workspace()
    try:
        pass # disabled on cloud
    except Exception as exc:  # pragma: no cover - seeding must never block boot
        logger.warning("Demo seeding failed: %s", exc)
    logger.info("AI Business Operator API ready (%s)", provider_status())


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):  # pragma: no cover - safety net
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "code": "internal_error",
                "message": "The Operator hit an unexpected error while handling this request.",
                "hint": "Retry the action. If it keeps failing, contact workspace support.",
            }
        },
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name, "provider": provider_status()}


# --------------------------------------------------------------------------
# Optional: serve the built frontend (production single-process deployment)
# --------------------------------------------------------------------------
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(index)
        return JSONResponse(status_code=404, content={"detail": {"code": "not_found"}})
