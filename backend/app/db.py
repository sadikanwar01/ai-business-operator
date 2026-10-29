"""SQLite storage layer.

Deliberately thin: raw SQL with a small repository helper so the data model
stays explicit and auditable. One connection per request/thread, WAL enabled
for concurrent reads while a mission writes progress.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from .config import settings

_local = threading.local()

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member',
    avatar_hue    TEXT NOT NULL DEFAULT '24',
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    slug       TEXT UNIQUE NOT NULL,
    plan       TEXT NOT NULL DEFAULT 'business',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'owner',
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    token        TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    expires_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS missions (
    id              TEXT PRIMARY KEY,
    workspace_id    TEXT NOT NULL,
    created_by      TEXT,
    title           TEXT NOT NULL,
    goal            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'queued',
    progress        INTEGER NOT NULL DEFAULT 0,
    current_step    TEXT,
    mode            TEXT NOT NULL DEFAULT 'demo',
    provider        TEXT NOT NULL DEFAULT 'demo',
    model           TEXT,
    industry        TEXT,
    location        TEXT,
    target_count    INTEGER NOT NULL DEFAULT 10,
    desired_action  TEXT,
    target_audience TEXT,
    desired_result  TEXT,
    source          TEXT NOT NULL DEFAULT 'user',
    error           TEXT,
    summary         TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    started_at      TEXT,
    completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS mission_steps (
    id           TEXT PRIMARY KEY,
    mission_id   TEXT NOT NULL,
    key          TEXT NOT NULL,
    name         TEXT NOT NULL,
    agent        TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'waiting',
    progress     INTEGER NOT NULL DEFAULT 0,
    detail       TEXT,
    order_index  INTEGER NOT NULL DEFAULT 0,
    started_at   TEXT,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,
    mission_id  TEXT NOT NULL,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL,
    task        TEXT,
    status      TEXT NOT NULL DEFAULT 'waiting',
    order_index INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    mission_id   TEXT,
    name         TEXT NOT NULL,
    industry     TEXT,
    location     TEXT,
    city         TEXT,
    website      TEXT,
    specialty    TEXT,
    founded      TEXT,
    employees    INTEGER,
    source       TEXT,
    source_url   TEXT,
    discovered_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
    id            TEXT PRIMARY KEY,
    mission_id    TEXT NOT NULL,
    workspace_id  TEXT NOT NULL,
    company_id    TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'review',
    opportunity   TEXT,
    tier          TEXT,
    score         INTEGER NOT NULL DEFAULT 0,
    notes         TEXT,
    last_activity TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_records (
    id          TEXT PRIMARY KEY,
    mission_id  TEXT NOT NULL,
    company_id  TEXT NOT NULL,
    field       TEXT NOT NULL,
    value       TEXT,
    source      TEXT,
    source_url  TEXT,
    excerpt     TEXT,
    confidence  REAL NOT NULL DEFAULT 0.7,
    retrieved_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunity_scores (
    id         TEXT PRIMARY KEY,
    lead_id    TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    dimension  TEXT NOT NULL,
    weight     REAL NOT NULL DEFAULT 0,
    score      INTEGER NOT NULL DEFAULT 0,
    rationale  TEXT
);

CREATE TABLE IF NOT EXISTS signals (
    id         TEXT PRIMARY KEY,
    lead_id    TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    label      TEXT NOT NULL,
    value      TEXT,
    severity   TEXT,
    evidence   TEXT
);

CREATE TABLE IF NOT EXISTS outreach_messages (
    id           TEXT PRIMARY KEY,
    mission_id   TEXT NOT NULL,
    lead_id      TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    company_id   TEXT NOT NULL,
    channel      TEXT NOT NULL DEFAULT 'email',
    subject      TEXT,
    body         TEXT NOT NULL,
    confidence   REAL NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'ready',
    tone         TEXT,
    flags        TEXT,
    review_notes TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    sent_at      TEXT
);

CREATE TABLE IF NOT EXISTS follow_ups (
    id          TEXT PRIMARY KEY,
    lead_id     TEXT NOT NULL,
    outreach_id TEXT,
    workspace_id TEXT NOT NULL,
    mission_id  TEXT,
    sequence    INTEGER NOT NULL DEFAULT 1,
    due_date    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'scheduled',
    note        TEXT,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    mission_id   TEXT,
    agent        TEXT NOT NULL,
    action       TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'info',
    message      TEXT NOT NULL,
    meta         TEXT,
    created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_items (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    category     TEXT NOT NULL,
    key          TEXT,
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    order_index  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integrations (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    category     TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT,
    status       TEXT NOT NULL DEFAULT 'available',
    provider     TEXT,
    config       TEXT,
    order_index  INTEGER NOT NULL DEFAULT 0,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_settings (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    key          TEXT NOT NULL,
    value        TEXT,
    updated_at   TEXT NOT NULL,
    UNIQUE (workspace_id, key)
);

CREATE INDEX IF NOT EXISTS idx_missions_ws ON missions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_steps_mission ON mission_steps(mission_id);
CREATE INDEX IF NOT EXISTS idx_agents_mission ON agents(mission_id);
CREATE INDEX IF NOT EXISTS idx_companies_mission ON companies(mission_id);
CREATE INDEX IF NOT EXISTS idx_leads_mission ON leads(mission_id);
CREATE INDEX IF NOT EXISTS idx_leads_ws ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_research_mission ON research_records(mission_id);
CREATE INDEX IF NOT EXISTS idx_signals_lead ON signals(lead_id);
CREATE INDEX IF NOT EXISTS idx_scores_lead ON opportunity_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_ws ON outreach_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_outreach_mission ON outreach_messages(mission_id);
CREATE INDEX IF NOT EXISTS idx_followups_ws ON follow_ups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_ws ON activity_logs(workspace_id);
"""


def _connect() -> sqlite3.Connection:
    path = Path(settings.database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def get_conn() -> sqlite3.Connection:
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = _connect()
        _local.conn = conn
    return conn


@contextmanager
def transaction() -> Iterator[sqlite3.Connection]:
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def init_db() -> None:
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()


def query(sql: str, params: Sequence[Any] = ()) -> list[dict[str, Any]]:
    cur = get_conn().execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    return rows


def query_one(sql: str, params: Sequence[Any] = ()) -> dict[str, Any] | None:
    cur = get_conn().execute(sql, params)
    row = cur.fetchone()
    cur.close()
    return dict(row) if row else None


def execute(sql: str, params: Sequence[Any] = ()) -> int:
    with transaction() as conn:
        cur = conn.execute(sql, params)
        rowid = cur.lastrowid or 0
        cur.close()
    return rowid


def execute_many(statements: Sequence[tuple[str, Sequence[Any]]]) -> None:
    with transaction() as conn:
        for sql, params in statements:
            conn.execute(sql, params)


def json_loads(value: Any, fallback: Any = None) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return fallback
