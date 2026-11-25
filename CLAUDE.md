# Bazaar v2.0 (BazaarPy) — project guide for Claude

Stock screener: FastAPI backend + React/Vite/Tailwind frontend. Data comes from
Yahoo Finance via `yfinance`; storage is PostgreSQL (Supabase) via async SQLAlchemy.

## Run locally

```bash
# Backend (from repo root)
python -m venv .venv && source .venv/bin/activate
cd backend && pip install -r requirements.txt
cp .env.example .env          # fill in DATABASE_URL
uvicorn main:app --reload     # http://localhost:8000/docs

# Frontend (new terminal)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Layout and conventions

- `backend/routers/`  thin HTTP layer only — no business logic.
- `backend/services/` business logic. `screener_service.py` is **pure functions**
  (data in, data out, no I/O) — keep it that way so it stays easy to test.
- `backend/services/yfinance_service.py` is synchronous; call it from async code
  with `asyncio.to_thread(...)`.
- `backend/agent/` is an **optional, self-contained** experiment (LLM agent). It must
  never be imported by existing code except the single guarded `include_router`
  in `main.py`, behind `AGENT_ENABLED`.
- Use SQLAlchemy ORM / parameterized queries — never string-built SQL
  (the legacy C# app had SQL injection bugs).
- Never commit `.env`.

## Agent feature rules

- Tools are **read-only** until explicitly decided otherwise.
- The model client speaks the OpenAI-compatible chat API so Ollama, Groq, or
  other providers can be swapped via env vars only.
- Output about stocks is informational, not financial advice.

## Tests

```bash
cd backend && python -m pytest tests -q
```
