"""Password hashing and stateless session tokens.

Deliberately dependency-free: PBKDF2-HMAC-SHA256 for passwords and an
HMAC-signed, timestamped token for sessions. Tokens are verified server side
on every request; the frontend only ever stores the opaque string.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time

from .config import settings

_ITERATIONS = 180_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"pbkdf2_sha256${_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(derived).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_b64, hash_b64 = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        derived = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), base64.b64decode(salt_b64), int(iterations)
        )
        return hmac.compare_digest(derived, base64.b64decode(hash_b64))
    except Exception:
        return False


def _sign(payload: bytes) -> str:
    mac = hmac.new(settings.secret_key.encode(), payload, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode().rstrip("=")


def create_token(user_id: str, workspace_id: str, ttl_days: int | None = None) -> str:
    ttl = ttl_days if ttl_days is not None else settings.token_ttl_days
    expires = int(time.time()) + ttl * 86_400
    body = f"{user_id}.{workspace_id}.{expires}"
    encoded = base64.urlsafe_b64encode(body.encode()).decode().rstrip("=")
    return f"{encoded}.{_sign(body.encode())}"


def read_token(token: str) -> tuple[str, str] | None:
    """Return (user_id, workspace_id) if the token is valid and unexpired."""
    if not token or "." not in token:
        return None
    encoded, _, signature = token.rpartition(".")
    try:
        body = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)).decode()
    except Exception:
        return None
    if not hmac.compare_digest(_sign(body.encode()), signature):
        return None
    parts = body.split(".")
    if len(parts) != 3:
        return None
    user_id, workspace_id, expires = parts
    if int(expires) < int(time.time()):
        return None
    return user_id, workspace_id


def new_id(prefix: str = "") -> str:
    token = secrets.token_hex(8)
    return f"{prefix}_{token}" if prefix else token
