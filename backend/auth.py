"""
auth.py — Verify Supabase-issued JWTs

How this fits in:
  - The frontend signs users in directly against Supabase Auth (not this API).
    Supabase hands back a JWT, which the frontend attaches as
    'Authorization: Bearer <token>' on API requests (see api/client.ts).
  - This module never talks to Supabase over the network — it just verifies
    the token's signature locally using the project's JWT secret
    (Settings -> API -> JWT Secret in the Supabase dashboard), then trusts
    the 'sub' (user id) and 'email' claims inside it.

Two dependencies are exported:
  - get_current_user          → 401s if there's no valid token (protected routes)
  - get_current_user_optional → returns None instead of 401 (guest-friendly routes)
"""

import os
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# auto_error=False so we can return None (guest) instead of FastAPI's
# default 403 when the Authorization header is simply missing.
_bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    """The subset of the Supabase JWT claims routes actually need."""
    id:    str
    email: Optional[str] = None


def _decode(token: str) -> CurrentUser:
    if not SUPABASE_JWT_SECRET:
        raise RuntimeError(
            "SUPABASE_JWT_SECRET is not set!\n"
            "Copy backend/.env.example to backend/.env and fill in your Supabase JWT secret "
            "(Supabase dashboard -> Settings -> API -> JWT Secret)."
        )
    try:
        claims = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )
    return CurrentUser(id=claims["sub"], email=claims.get("email"))


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> CurrentUser:
    """Require a signed-in user. Use on routes that must not be reachable by guests."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in required.",
        )
    return _decode(credentials.credentials)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[CurrentUser]:
    """Guest-friendly: returns the user if signed in, otherwise None (no 401)."""
    if credentials is None:
        return None
    return _decode(credentials.credentials)
