"""Authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..db import query_one
from ..deps import Session, get_session
from ..security import create_token, verify_password
from ..seed import ensure_demo_workspace

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=1, max_length=200)
    remember: bool = True


class DemoRequest(BaseModel):
    remember: bool = True


def _session_payload(user: dict, workspace: dict, remember: bool) -> dict:
    ttl = 30 if remember else 1
    token = create_token(user["id"], workspace["id"], ttl_days=ttl)
    return {
        "token": token,
        "expires_in": ttl * 86_400,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "avatar_hue": user["avatar_hue"],
        },
        "workspace": {
            "id": workspace["id"],
            "name": workspace["name"],
            "slug": workspace["slug"],
            "plan": workspace["plan"],
        },
    }


@router.post("/login")
def login(payload: LoginRequest):
    user = query_one("SELECT * FROM users WHERE lower(email) = lower(?)", (payload.email.strip(),))
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="That email and password combination was not recognised.",
        )
    member = query_one(
        "SELECT * FROM workspace_members WHERE user_id = ? ORDER BY rowid LIMIT 1", (user["id"],)
    )
    workspace = query_one("SELECT * FROM workspaces WHERE id = ?", (member["workspace_id"],))
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not attached to a workspace.",
        )
    return _session_payload(user, workspace, payload.remember)


@router.post("/demo")
def demo_login(payload: DemoRequest):
    user, workspace = ensure_demo_workspace()
    return _session_payload(user, workspace, payload.remember)


@router.get("/me")
def me(session: Session = Depends(get_session)):
    return {
        "user": {
            "id": session.user["id"],
            "name": session.user["name"],
            "email": session.user["email"],
            "role": session.user["role"],
            "avatar_hue": session.user["avatar_hue"],
        },
        "workspace": {
            "id": session.workspace["id"],
            "name": session.workspace["name"],
            "slug": session.workspace["slug"],
            "plan": session.workspace["plan"],
        },
    }
