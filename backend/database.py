"""
database.py — PostgreSQL connection using SQLAlchemy (async)

Key concepts:
  - SQLAlchemy is an ORM (Object-Relational Mapper): it lets you work with
    database tables as Python classes instead of writing raw SQL.
  - The 'async' version uses asyncpg driver so the server never blocks
    while waiting for the database to respond.
  - We create ONE engine and ONE session factory at startup, then reuse
    them for every request (creating new connections per request is slow).
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

# ── Base class all ORM models will inherit from ──────────────────
class Base(DeclarativeBase):
    """
    Every table model (in models/) inherits from this Base.
    SQLAlchemy uses it to track which classes map to which tables.
    """
    pass


# ── Database URL ─────────────────────────────────────────────────
# Supabase gives you a URL starting with 'postgresql://' or 'postgres://'
# but asyncpg needs 'postgresql+asyncpg://'. We normalize it here.
_raw_url = os.getenv("DATABASE_URL", "")
DATABASE_URL = (
    _raw_url
    .replace("postgres://", "postgresql+asyncpg://")
    .replace("postgresql://", "postgresql+asyncpg://")
)

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set!\n"
        "Copy backend/.env.example to backend/.env and fill in your Supabase URL."
    )


# ── Engine: the actual connection pool ───────────────────────────
engine = create_async_engine(
    DATABASE_URL,
    echo=False,       # Set to True to log every SQL query (useful for debugging)
    pool_size=5,      # Max simultaneous DB connections
    max_overflow=10,  # Extra connections allowed under load
)


# ── Session factory ──────────────────────────────────────────────
# A "session" is a unit of work with the database.
# We create a new session per request and close it when done.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Keep ORM objects usable after commit
)


# ── Dependency: injected into route handlers ─────────────────────
async def get_db() -> AsyncSession:
    """
    FastAPI dependency that provides a database session per request.

    Usage in a router:
        @router.get("/example")
        async def my_route(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(MyModel))

    The 'async with' ensures the session is closed even if an error occurs.
    """
    async with AsyncSessionLocal() as session:
        yield session


# ── Table creation ───────────────────────────────────────────────
async def create_tables():
    """
    Create all tables defined in models/ if they don't already exist.
    Called once on app startup (see main.py lifespan).
    Safe to call multiple times — uses 'CREATE TABLE IF NOT EXISTS' internally.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
