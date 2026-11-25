# Bazaar v2.0 — Local Setup Guide

This guide takes you from a fresh machine to a fully running Bazaar app.

---

## Moved this project from OneDrive / iCloud / Dropbox?

If this folder used to live inside a cloud-synced directory (OneDrive, iCloud
Drive, Dropbox, etc.) and you copied or moved it to a plain local folder,
two things need a fresh start — they don't survive being moved:

1. **`.venv` is not portable.** Python bakes the absolute folder path into
   `.venv/bin/activate`, `pip`, `uvicorn`, etc. After a move, those scripts
   still point at the *old* path and fail with `bad interpreter: ... no such
   file or directory`. Fix:
   ```bash
   rm -rf .venv
   python -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```
2. **`frontend/node_modules` should be reinstalled too.** It's usually
   fine as-is, but a clean `npm install` avoids subtle issues from
   symlinks or lockfiles that didn't survive the sync/copy cleanly.

Going forward, keep this project in a plain local folder (not inside a
cloud-sync directory). Sync clients frequently lock or partially-write
files while `.venv`/`node_modules` are being written to, which causes
flaky installs, slow builds, and file-lock errors mid-`pip install` or
`npm install`.

---

## Prerequisites

Install these tools first:

| Tool | Version | Download |
|---|---|---|
| Python | 3.11+ | https://python.org/downloads |
| Node.js | 18+ | https://nodejs.org |
| Git | Any | https://git-scm.com |

Verify your installs:
```bash
python --version   # Should print Python 3.11.x or higher
node --version     # Should print v18.x or higher
npm --version      # Comes with Node.js
```

---

## Step 1 — Get the Project

If you cloned from GitHub:
```bash
git clone https://github.com/YOUR_USERNAME/bazaar.git
cd bazaar
```

If you downloaded the zip: extract it and open the folder in your terminal.

If you already have the project locally (e.g. you moved it from a cloud-sync
folder like OneDrive), just `cd` into it — skip straight to the "Moved this
project" note above, then continue with Step 2.

---

## Step 2 — Set Up the Database (Supabase)

Bazaar uses **PostgreSQL hosted on Supabase** (free tier, no credit card needed).

### 2a. Create a Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **New Project**
3. Choose a name (e.g. `bazaar`), set a strong database password, pick a region
4. Wait ~2 minutes for provisioning

> ⚠️ Never put your real database password in this doc, a commit message,
> or anywhere else that could end up in Git history — treat it like any
> other secret and keep it only in your local `.env`.

### 2b. Get your connection string

1. In your Supabase project → **Settings** → **Database**
2. Scroll to **Connection string** → select **URI** tab
3. Copy the string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
4. **Change** `postgresql://` to `postgresql+asyncpg://` (required for async Python)
5. **Append** `?ssl=require` at the end (asyncpg uses `ssl=`, not the libpq-style `sslmode=`)

Final URL format:
```
postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres?ssl=require
```

### 2c. Tables are created automatically

When the FastAPI app starts, it calls `create_tables()` which runs
`CREATE TABLE IF NOT EXISTS` for all models. No manual SQL needed.

### 2d. Enable Supabase Auth (sign in / sign up)

Bazaar uses **Supabase Auth** for sign-in — separate from the Postgres
database you just set up in 2a–2c, but in the same Supabase project. Guests
can still browse everything without an account; auth is only needed for
features that will save something to *your* account (portfolios, coming in a
later update).

1. In your Supabase project → **Authentication** → **Providers**:
   - **Email** is on by default — leave it enabled for email/password sign-up.
   - Enable **Google**: you'll need a Google OAuth Client ID/Secret from the
     [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
     (OAuth consent screen → Credentials → Create OAuth client ID → Web
     application). Set the **Authorized redirect URI** Google asks for to the
     callback URL Supabase shows you on this same Providers page, then paste
     the resulting Client ID/Secret into Supabase and Save.
2. In **Authentication** → **URL Configuration**, set **Site URL** to
   `http://localhost:5173` for local dev (add your deployed frontend URL here
   too once you deploy).
3. Grab your keys:
   - **Settings** → **API** → **Project URL** and **anon public** key → go
     into `frontend/.env` (see Step 4 below).
   - **Settings** → **API** → **JWT Secret** → goes into `backend/.env` as
     `SUPABASE_JWT_SECRET` (Step 3a below). This is what the backend uses to
     verify the token Supabase issues on sign-in — it never calls out to
     Supabase over the network to check it.

> ⚠️ The anon key is safe to ship to the browser. The JWT Secret is **not** —
> keep it only in `backend/.env`, never in frontend code or `VITE_`-prefixed
> variables.

---

## Step 3 — Backend Setup

```bash
# Create a virtual environment at the repo root (isolates Python packages
# for this project) — keep this the one and only venv, don't create a
# second one inside backend/, it just leads to drift between the two.
python -m venv .venv

# Activate it:
# On Mac/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Your terminal prompt should now show (.venv)

cd backend

# Install dependencies
pip install -r requirements.txt
```

### 3a. Configure environment variables

```bash
# Copy the template
cp .env.example .env

# Open .env in your editor and fill in:
#   DATABASE_URL       = your Supabase connection string from Step 2
#   SUPABASE_JWT_SECRET = your Supabase JWT secret from Step 2d
```

Your `.env` should look like:
```
DATABASE_URL=postgresql+asyncpg://postgres:mysecretpassword@db.xxxx.supabase.co:5432/postgres?ssl=require
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
APP_ENV=development
FRONTEND_URL=http://localhost:5173
```

> ⚠️ Never commit `.env` to Git — it contains your database password.

### 3b. Start the backend

```bash
uvicorn main:app --reload
```

You should see:
```
✅ Database tables ready
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Test it:** Open http://localhost:8000/docs in your browser.
You'll see the auto-generated Swagger UI where you can test every API endpoint.

---

## Step 4 — Frontend Setup

Open a **new terminal tab** (keep the backend running).

```bash
cd frontend

# Install Node.js packages
npm install

# Configure environment variables
cp .env.example .env
# Open .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from Step 2d

# Start the Vite dev server
npm run dev
```

You should see:
```
  VITE v5.x  ready in 300ms
  ➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 — the Bazaar app is running!

---

## Step 5 — Try It Out

1. **Add a stock:** Go to Watchlist → type `AAPL` → select `NASDAQ` → click Add
2. **Add a TSX stock:** type `SHOP.TO` → select `TSX` → Add
3. **Run screener:** Go to Screener → My Watchlist → Run Screener
4. **Scan an index:** Screener → Scan Index → select NASDAQ → Run Screener
5. **Sign in:** Click **Sign in** in the top bar → sign up with email/password
   (Supabase emails you a confirmation link) or **Continue with Google**. Once
   signed in you'll see your email in the top bar and a sign-out button.
   Everything else keeps working exactly the same whether you're signed in or
   browsing as a guest.

> ⏱ First screener run may take 30–60 seconds — yfinance is fetching live data from Yahoo Finance.

---

## Folder Structure Quick Reference

```
bazaar/
├── backend/               ← Python FastAPI API
│   ├── main.py            ← App entry point
│   ├── database.py        ← PostgreSQL connection
│   ├── auth.py            ← Supabase JWT verification (get_current_user)
│   ├── models/            ← Table definitions + data shapes
│   ├── routers/           ← API endpoints (HTTP layer only), incl. auth.py
│   ├── services/          ← Business logic (screener math, yfinance)
│   └── requirements.txt
│
├── frontend/              ← React + Vite + Tailwind UI
│   ├── src/
│   │   ├── App.jsx        ← Shell layout (sidebar + main content)
│   │   ├── api/client.js  ← All API calls in one place (attaches auth token)
│   │   ├── lib/supabaseClient.ts   ← Supabase JS client
│   │   ├── context/AuthContext.tsx ← useAuth() — session state, sign in/out
│   │   ├── components/    ← Reusable UI pieces
│   │   └── pages/         ← Dashboard, Watchlist, Screener, Login
│   └── package.json
│
├── deploy/                ← Hosting config files
│   ├── Dockerfile
│   ├── fly.toml           ← Fly.io config (~$1-2/month)
│   └── railway.json       ← Railway alternative
│
└── docs/
    ├── SETUP.md           ← This file
    └── CONCEPTS.md        ← Python patterns explained
```

---

## Deployment (When You're Ready)

### Frontend → Vercel (free)
```bash
cd frontend
npm run build          # Creates dist/ folder
# Push to GitHub, then import repo at vercel.com
# In Vercel's project settings → Environment Variables, add:
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

Also add your deployed Vercel URL to Supabase → Authentication → URL
Configuration → Site URL (or Redirect URLs), or Google OAuth sign-in will
redirect back to `localhost` instead of your live site.

### Backend → Fly.io (~$1-2/month)
```bash
# Install flyctl from https://fly.io/docs/hands-on/install-flyctl/
cd backend
cp ../deploy/Dockerfile .
cp ../deploy/fly.toml .

fly launch             # First time — creates the app
fly secrets set DATABASE_URL="postgresql+asyncpg://..."
fly secrets set SUPABASE_JWT_SECRET="..."
fly secrets set FRONTEND_URL="https://your-app.vercel.app"
fly deploy             # Subsequent deploys
```

### Backend → Railway (alternative, ~$1-3/month)
1. Push your code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select the `backend/` folder as the root
4. Add environment variables in the Railway dashboard
5. Railway auto-deploys on every push

---

## Common Issues

**`DATABASE_URL is not set`**
→ You haven't created the `.env` file yet. Run `cp .env.example .env` and fill it in.

**`SUPABASE_JWT_SECRET is not set!`**
→ Same fix as above, plus grab the JWT Secret from Supabase → Settings → API
(Step 2d) and put it in `backend/.env`.

**`Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY`**
→ You haven't created `frontend/.env` yet. Run `cp frontend/.env.example
frontend/.env` and fill in the Project URL / anon key from Step 2d.

**Sign-in works but `/api/auth/me` (or a future protected route) returns 401**
→ The JWT Supabase issued won't verify against a `SUPABASE_JWT_SECRET` that
doesn't match your project — double check you copied the secret from the same
Supabase project the frontend is pointed at.

**`connection refused` on port 8000**
→ The backend isn't running. Start it with `uvicorn main:app --reload` in the `backend/` folder.

**`bad interpreter: .../.venv/bin/python...: no such file or directory`**
→ This `.venv` was created in a different folder (e.g. before moving the
project out of OneDrive/iCloud/Dropbox) and its scripts still point at the
old path. Recreate it: `rm -rf .venv && python -m venv .venv && source
.venv/bin/activate && pip install -r backend/requirements.txt`

**Symbol not found on Yahoo Finance**
→ Check the suffix. TSX stocks need `.TO` (e.g. `RY.TO`), NSE needs `.NS`, BSE needs `.BO`.

**Screener takes very long**
→ Normal — each stock requires a live HTTP request to Yahoo Finance. Keep scan limit ≤ 20 for best experience.
