"""Application configuration.

All secrets live here and are sourced exclusively from environment variables
(``.env`` locally, real env vars in production). Nothing in this module is
exposed to the browser bundle.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Core -----------------------------------------------------------
    app_name: str = "AI Business Operator"
    app_tagline: str = "Your AI Operator for Business Growth"
    environment: str = "development"
    secret_key: str = "dev-only-insecure-key-change-me"

    # --- Storage --------------------------------------------------------
    database_path: str = str(BACKEND_DIR / "data" / "operator.db")

    # --- AI provider (Nebius Token Factory) -----------------------------
    # When `nebius_api_key` is empty the Operator falls back to the
    # deterministic Demo provider. The rest of the app never knows which
    # provider is active - it always talks to the AIProvider interface.
    nebius_api_key: str = ""
    nebius_base_url: str = "https://api.tokenfactory.nebius.com/v1/"
    nebius_model: str = "nvidia/Nemotron-3-Ultra-550b-a55b"
    nebius_timeout: float = 150.0
    nebius_max_tokens: int = 6000
    # Web search (Tavily). Required for live research runs.
    tavily_api_key: str = ""

    # --- Behaviour ------------------------------------------------------
    # Forces the Demo provider even when a key is present (useful for demos).
    force_demo_provider: bool = False
    # Seconds a demo agent "thinks" per step - controls the pacing of the
    # scripted workflow so the UI can breathe between steps.
    demo_step_delay: float = 1.1
    token_ttl_days: int = 30
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,https://ai-business-operator-sadik.web.app"

    @property
    def nebius_configured(self) -> bool:
        return bool(self.nebius_api_key.strip()) and not self.force_demo_provider

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
