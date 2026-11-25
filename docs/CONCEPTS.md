# Bazaar v2.0 — Python Concepts Guide

This file explains the key Python and web patterns used in this codebase.
Each section links the concept to a real file in the project.

---

## 1. FastAPI Routing — `routers/companies.py`

FastAPI uses **decorators** to turn a Python function into an HTTP endpoint.

```python
@router.get("/watchlist")          # This is a decorator
async def get_watchlist():         # This is a regular async function
    return [...]                   # FastAPI serialises this to JSON automatically
```

The decorator `@router.get("/watchlist")` tells FastAPI:
- Listen for `GET` requests at `/api/companies/watchlist`
- When one arrives, call `get_watchlist()`
- Return the result as a JSON response

**Path parameters** (values from the URL):
```python
@router.delete("/watchlist/{symbol}")
async def remove(symbol: str):   # FastAPI extracts 'symbol' from the URL
    ...
```

**Query parameters** (values from `?key=value`):
```python
@router.get("/watchlist")
async def screen(days: int = 10):   # ?days=20 → days=20; defaults to 10
    ...
```

---

## 2. Pydantic Models — `models/company.py`

Pydantic validates data automatically. If the wrong type arrives, FastAPI
returns a clear 422 error instead of crashing.

```python
from pydantic import BaseModel

class CompanyCreate(BaseModel):
    symbol: str    # Must be a string
    market: str    # Must be a string

# FastAPI reads the request body and validates it against this model:
@router.post("/watchlist")
async def add(payload: CompanyCreate):
    print(payload.symbol)   # Already validated and type-safe
```

**Field validators** let you transform data on the way in:
```python
@field_validator("symbol")
@classmethod
def normalize(cls, v: str) -> str:
    return v.upper().strip()   # ' aapl ' → 'AAPL'
```

**`model_config = {"from_attributes": True}`** lets Pydantic read from
SQLAlchemy ORM objects (not just dicts). Needed when returning DB rows directly.

---

## 3. async / await — Why It Matters

Python is single-threaded. Without async, waiting for a database query
**blocks the entire server** — no other requests can be handled.

```python
# Blocking (BAD in a web server):
result = db.execute(query)      # Server freezes until DB responds

# Non-blocking (GOOD):
result = await db.execute(query)  # Server handles other requests while waiting
```

**Rule of thumb in this codebase:**
- `async def` + `await` → for database calls (Motor, SQLAlchemy async)
- `asyncio.to_thread(fn)` → for yfinance calls (they're synchronous/blocking)

```python
# yfinance is synchronous. Wrapping it in to_thread runs it in a
# background thread so the async event loop is never blocked:
prices = await asyncio.to_thread(get_price_history, symbol, 60)
```

---

## 4. SQLAlchemy ORM — `database.py` + `models/company.py`

An **ORM** (Object-Relational Mapper) lets you work with database tables as
Python classes instead of writing raw SQL strings.

```python
# Raw SQL (what the original C# app did — vulnerable to injection):
"SELECT * FROM companies WHERE market = '" + market + "'"

# SQLAlchemy ORM (safe, Pythonic):
await db.execute(
    select(CompanyORM).where(CompanyORM.market == market)
)
```

**Session pattern** — a session is a "unit of work" with the database:
```python
async with AsyncSessionLocal() as session:
    # All operations here share one DB connection
    result = await session.execute(select(CompanyORM))
    rows   = result.scalars().all()   # Convert to Python list
```

**`Depends(get_db)`** is FastAPI's dependency injection. Instead of
creating a session manually in every route, you declare it as a parameter:
```python
@router.get("/watchlist")
async def get_watchlist(db: AsyncSession = Depends(get_db)):
    #                                      ^^^^^^^^^^^^^^
    #                   FastAPI calls get_db() and passes the result here
```

---

## 5. Environment Variables — `.env` + `python-dotenv`

Secrets (passwords, API keys) must never be hard-coded in source files.

```python
# database.py
from dotenv import load_dotenv
import os

load_dotenv()                          # Reads .env file into environment
url = os.getenv("DATABASE_URL")       # Reads the variable by name
```

The `.env` file (on your machine, never committed to Git):
```
DATABASE_URL=postgresql+asyncpg://user:password@host/db
```

`.env.example` (committed to Git — shows what variables are needed, no values):
```
DATABASE_URL=postgresql+asyncpg://YOUR_USER:YOUR_PASSWORD@host/db
```

---

## 6. Pure Functions — `services/screener_service.py`

The screener calculations are written as **pure functions**:
- They take data in and return data out
- No side effects (no DB calls, no HTTP requests, no global state)
- The same input always produces the same output

```python
def calculate_avg_hi_low(prices: list[dict], days: int) -> tuple[float, float]:
    recent  = prices[-days:]
    avg_hi  = sum(p["hi"]  for p in recent) / len(recent)
    avg_low = sum(p["low"] for p in recent) / len(recent)
    return round(avg_hi, 2), round(avg_low, 2)
```

**Why this matters:** Pure functions are trivial to test and reuse.
You can call `calculate_avg_hi_low(mock_data, 10)` in a test without
needing a database or internet connection.

---

## 7. CORS — `main.py`

**CORS** (Cross-Origin Resource Sharing) is a browser security rule.

When your React app (at `http://localhost:5173`) tries to call your API
(at `http://localhost:8000`), the browser blocks it — different ports = different origin.

FastAPI's `CORSMiddleware` tells the browser it's allowed:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Trust this origin
    allow_methods=["*"],                       # Allow GET, POST, DELETE, etc.
    allow_headers=["*"],
)
```

In development, the Vite proxy (`vite.config.js`) also handles this by
making API calls appear to come from the same origin — both approaches work.

---

## 8. Type Hints — Everywhere

Python type hints (`: str`, `-> list[dict]`) are optional but invaluable:
- FastAPI uses them to validate request/response data
- Your editor uses them to catch bugs before you run the code
- Future-you understands the code faster

```python
def run_screener(
    symbol:  str,           # Must be a string
    prices:  list[dict],    # Must be a list of dicts
    days:    int = 10,      # Int with a default value
) -> Optional[dict]:        # Returns a dict or None
```

---

## 9. Decoupled Architecture

The codebase is intentionally split into layers. Each layer has **one job**:

```
HTTP Request
     ↓
routers/      ← Only handles HTTP: reads params, calls service, returns response
     ↓
services/     ← Only business logic: calculations, external API calls
     ↓
models/       ← Only data shapes: what things look like
     ↓
database.py   ← Only connectivity: how to reach PostgreSQL
```

**Adding a new feature** (e.g. RSI indicator):
1. Add `calculate_rsi()` to `services/screener_service.py`
2. Call it inside `run_screener()`
3. Add `rsi: Optional[float]` to `models/price.py → ScreenerResult`
4. Add `rsi` to the `StockCard` in the frontend

Nothing else changes. The layers are decoupled.

---

## 10. React ↔ FastAPI — How They Talk

```
User clicks "Run Screener"
     ↓
ScreenerPage.jsx calls screenerAPI.screenWatchlist(params)
     ↓
api/client.js sends: GET /api/screener/watchlist?days=10
     ↓
Vite proxy forwards to: http://localhost:8000/api/screener/watchlist?days=10
     ↓
FastAPI router handles it → calls service → returns JSON
     ↓
React receives JSON → sets results state → re-renders StockCard grid
```

The key file is `frontend/src/api/client.js` — all API calls live there.
Components never call `fetch()` directly. This means if the backend URL
changes (e.g. when deploying), you update **one file**, not every component.

---

## 11. Auth via a FastAPI Dependency — `auth.py`

Bazaar doesn't run its own login system. Sign-in happens **client-side**,
directly between the browser and Supabase Auth — the FastAPI backend never
sees a password, it only ever sees the JWT Supabase issued afterwards.

```
Browser (Supabase JS)                FastAPI backend
──────────────────────                ─────────────────────
supabase.auth.signInWithPassword()
     ↓
Supabase Auth verifies credentials,
returns a JWT
     ↓
Every axios request attaches:
  Authorization: Bearer <JWT>   →    auth.py verifies the JWT's signature
                                      using SUPABASE_JWT_SECRET (no network
                                      call back to Supabase needed)
                                          ↓
                                      Depends(get_current_user) hands the
                                      route a CurrentUser(id, email)
```

This is the same `Depends()` pattern `get_db` uses for database sessions —
FastAPI dependencies aren't just for shared setup/teardown, they're also how
you express "this route needs an authenticated caller":

```python
@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return current_user   # 401 already handled before this line runs
```

For routes guests should still be able to hit, `get_current_user_optional`
does the same JWT check but returns `None` instead of raising 401 when
there's no token — see `backend/auth.py`. None of the existing
screener/watchlist routes use it yet (they're guest-open with no auth check
at all), but it's there for future routes that behave differently for a
signed-in user vs. a guest (e.g. a future "my portfolio" endpoint).
