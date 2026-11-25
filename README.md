# Bazaar v2.0 — Stock Screener

Modernized Python rewrite of the original Bazaar Windows Forms (.NET) application.

## What Changed

| Original (C# / .NET) | New (Python / Web) |
|---|---|
| Windows Forms desktop app | Responsive web app (mobile + desktop) |
| Microsoft Access `.mdb` file | PostgreSQL on Supabase (cloud) |
| Manual price entry | Automated via Yahoo Finance (yfinance) |
| Basic Hi/Low average (buggy) | Fixed avg Hi/Low + MA + signals + % change |
| SQL injection vulnerabilities | Parameterized queries via SQLAlchemy ORM |
| Local only | Deployable to Fly.io + Vercel |

## Stack

**Backend:** FastAPI · SQLAlchemy async · asyncpg · PostgreSQL (Supabase) · yfinance

**Frontend:** React 18 · Vite · Tailwind CSS · React Router · Recharts

**Hosting:** Vercel (frontend, free) · Fly.io or Railway (backend, ~$1–2/mo) · Supabase (DB, free)

## Screener Features

- ✅ N-day average Hi/Low (original feature, bug-fixed)
- ✅ 10-day and 50-day Simple Moving Average
- ✅ Golden Cross / Death Cross breakout detection
- ✅ Percentage change filtering
- ✅ Watchlist management
- ✅ Market index scanning: TSX · NASDAQ · NYSE · NSE · BSE
- 🧪 **Ask Bazaar** — optional LLM agent that answers plain-English questions about a stock's technical position (experimental, off by default)

## Quick Start

See **[docs/SETUP.md](docs/SETUP.md)** for the full setup guide (including
what to do if you moved this project from OneDrive/iCloud/Dropbox — the
`.venv` needs to be recreated after a move).

```bash
# Backend
python -m venv .venv && source .venv/bin/activate
cd backend
pip install -r requirements.txt
cp .env.example .env   # Fill in your Supabase DATABASE_URL
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Open http://localhost:5173

API docs: http://localhost:8000/docs

### Optional: Ask Bazaar (LLM agent)

Off by default. To try it, run a local model server (e.g. [Ollama](https://ollama.com)):

```bash
ollama pull llama3.1:8b
ollama serve
```

Then set in `backend/.env`:

```
AGENT_ENABLED=true
AGENT_BASE_URL=http://localhost:11434/v1
AGENT_MODEL=llama3.1:8b
```

Restart the backend and open the **Ask Bazaar** tab in the nav. It's read-only —
the model can only call the existing screener, never write to the database.

## Learning This Codebase

See **[docs/CONCEPTS.md](docs/CONCEPTS.md)** for explanations of:
- FastAPI routing and decorators
- Pydantic data validation
- async/await and why it matters
- SQLAlchemy ORM vs raw SQL
- Environment variables and `.env` files
- Pure functions and decoupled architecture
- How React talks to FastAPI

## Project Structure

```
bazaar/
├── backend/
│   ├── main.py                  ← FastAPI app + CORS + startup
│   ├── database.py              ← PostgreSQL async connection
│   ├── models/                  ← ORM tables + Pydantic schemas
│   ├── routers/                 ← HTTP endpoints (thin layer)
│   ├── services/                ← Business logic + yfinance
│   ├── agent/                   ← Optional LLM agent (self-contained, off by default)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx              ← Shell layout (sidebar + main)
│       ├── api/client.ts        ← All API calls in one place
│       ├── components/          ← Sidebar, TopBar, StockCard, etc.
│       └── pages/               ← Dashboard, Watchlist, Screener, AgentPage
├── deploy/
│   ├── Dockerfile
│   ├── fly.toml                 ← Fly.io config
│   └── railway.json             ← Railway alternative
└── docs/
    ├── SETUP.md
    └── CONCEPTS.md
```
