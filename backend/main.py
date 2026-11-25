"""
main.py — Bazaar API v2.0 entry point

How FastAPI works:
  - You define route handlers with decorators like @app.get("/path")
  - FastAPI reads your type hints and auto-validates request/response data
  - Visit http://localhost:8000/docs for auto-generated interactive API docs

Run locally:
  uvicorn main:app --reload
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from database import create_tables
from routers import auth, companies, prices, screener

load_dotenv()


# ── Lifespan: runs code on startup and shutdown ──────────────────
# This is the modern FastAPI pattern (replaces @app.on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: create tables if they don't exist yet
    await create_tables()
    print("✅ Database tables ready")
    yield
    # SHUTDOWN: nothing to clean up (SQLAlchemy disposes engine automatically)
    print("🛑 Bazaar API shutting down")


# ── FastAPI app instance ─────────────────────────────────────────
app = FastAPI(
    title="Bazaar Stock Screener API",
    description="""
Modernized Python rewrite of the Bazaar Windows Forms app.

**New features vs original:**
- Automated Hi/Low price fetching (no manual entry)
- Moving averages: 10-day and 50-day SMA
- Breakout signal detection (Golden/Death Cross)
- Percentage change filtering
- Market index scanning: TSX, NASDAQ, NYSE, NSE, BSE

**Original feature preserved (bug-fixed):**
- N-day average Hi/Low calculation
    """,
    version="2.0.0",
    lifespan=lifespan,
)


# ── CORS middleware ──────────────────────────────────────────────
# CORS (Cross-Origin Resource Sharing) lets the React frontend
# (running on port 5173) talk to this API (running on port 8000).
# Without this, browsers would block the requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register routers ─────────────────────────────────────────────
# Each router is a group of related endpoints.
# The prefix is prepended to every route in that router.
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(companies.router, prefix="/api/companies", tags=["Watchlist"])
app.include_router(prices.router,    prefix="/api/prices",    tags=["Prices"])
app.include_router(screener.router,  prefix="/api/screener",  tags=["Screener"])


# ── Health check ─────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    """Quick health check — confirms the API is running."""
    return {
        "status": "running",
        "message": "Bazaar API v2.0 🚀",
        "docs": "/docs",    # Swagger UI — try all endpoints interactively
        "redoc": "/redoc",  # Alternative docs UI
    }
