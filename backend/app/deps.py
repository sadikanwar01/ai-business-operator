"""Shared FastAPI dependencies (authentication + workspace scoping)."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, Header, HTTPException, status

from .db import query_one
from .security import read_token


class Session:
    def __init__(self, user: dict[str, Any], workspace: dict[str, Any]) -> None:
        self.user = user
        self.workspace = workspace

    @property
    def user_id(self) -> str:
        return str(self.user["id"])

    @property
    def workspace_id(self) -> str:
        return str(self.workspace["id"])


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_session(authorization: str | None = Header(default=None)) -> Session:
    if not authorization:
        raise _unauthorized("You need to sign in to continue.")
    token = authorization.removeprefix("Bearer ").strip()
    parsed = read_token(token)
    if not parsed:
        raise _unauthorized("Your session expired. Sign in again to continue.")
    user_id, workspace_id = parsed

    user = query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user:
        raise _unauthorized("This account no longer exists.")
    workspace = query_one("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
    if not workspace:
        raise _unauthorized("This workspace is no longer available.")
    return Session(user, workspace)


CurrentSession = Depends(get_session)
