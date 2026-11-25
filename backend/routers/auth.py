"""
routers/auth.py — Auth-related endpoints

Sign-up/sign-in/sign-out themselves happen client-side against Supabase Auth
directly (see frontend/src/context/AuthContext.tsx) — this router doesn't
issue tokens. It exists to give the backend a protected route to verify the
JWT flow end-to-end, and a place for the frontend to confirm who the current
token belongs to.

Endpoints:
  GET /api/auth/me → the signed-in user's id/email (401 if not signed in)
"""

from fastapi import APIRouter, Depends

from auth import CurrentUser, get_current_user

router = APIRouter()


@router.get("/me", response_model=CurrentUser)
async def get_me(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Return the signed-in user's id/email. Requires a valid Supabase JWT."""
    return current_user
