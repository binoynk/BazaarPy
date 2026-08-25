"""
routers/companies.py — Watchlist CRUD endpoints

Endpoints:
  GET    /api/companies/watchlist          → list all watchlist stocks
  POST   /api/companies/watchlist          → add a stock
  DELETE /api/companies/watchlist/{symbol} → remove a stock
  GET    /api/companies/search/{query}     → look up a ticker on Yahoo Finance
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from database import get_db
from models.company import (
    CompanyORM, CompanyCreate, CompanyResponse,
    AddToWatchlistResponse, MessageResponse, TickerInfoResponse, TickerSuggestion,
)
from services.yfinance_service import get_ticker_info, search_tickers
from services.index_symbols import infer_market

router = APIRouter()


# ── GET /api/companies/watchlist ──────────────────────────────────
@router.get("/watchlist", response_model=list[CompanyResponse])
async def get_watchlist(db: AsyncSession = Depends(get_db)):
    """
    Return all stocks the user has added to their watchlist.

    SQLAlchemy pattern:
      1. Build a query with select()
      2. Execute it with await db.execute()
      3. Extract results with .scalars().all()
    """
    result = await db.execute(
        select(CompanyORM)
        .where(CompanyORM.in_watchlist == True)
        .order_by(CompanyORM.added_at.desc())
    )
    return result.scalars().all()


# ── POST /api/companies/watchlist ─────────────────────────────────
@router.post("/watchlist", status_code=status.HTTP_201_CREATED, response_model=AddToWatchlistResponse)
async def add_to_watchlist(
    payload: CompanyCreate,
    db:      AsyncSession = Depends(get_db),
):
    """
    Add a stock to the watchlist.

    Process:
      1. Check it's not already in the watchlist
      2. Fetch company name / sector / currency from yfinance
      3. Save to PostgreSQL
    """
    symbol = payload.symbol  # Already normalized to uppercase by Pydantic

    # 1. Check for duplicate
    existing = await db.execute(
        select(CompanyORM).where(CompanyORM.symbol == symbol)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"'{symbol}' is already in your watchlist.",
        )

    # 2. Fetch info from yfinance (synchronous call → run in thread)
    info = await asyncio.to_thread(get_ticker_info, symbol)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Symbol '{symbol}' was not found on Yahoo Finance. "
                f"Double-check the ticker — for dual-listed companies, "
                f"try adding a suffix (e.g. SHOP.TO for TSX, RELIANCE.NS for NSE)."
            ),
        )

    # 3. Determine market from Yahoo's own exchange code — not a user
    # selection. This works whether or not the symbol has a suffix,
    # since it reflects whatever exchange this exact symbol resolved to.
    market = infer_market(info.get("exchange"))
    if not market:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"'{symbol}' trades on {info.get('full_exchange_name') or info.get('exchange') or 'an exchange'}, "
                f"which isn't a supported market (NASDAQ, NYSE, TSX, NSE, BSE)."
            ),
        )

    # 4. Insert into database
    company = CompanyORM(
        symbol       = symbol,
        name         = info["name"],
        market       = market,
        currency     = info.get("currency"),
        sector       = info.get("sector"),
        in_watchlist = True,
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)  # Populate auto-generated fields (id, added_at)

    return {"message": f"'{symbol}' added to watchlist.", "id": company.id}


# ── DELETE /api/companies/watchlist/{symbol} ──────────────────────
@router.delete("/watchlist/{symbol}", response_model=MessageResponse)
async def remove_from_watchlist(
    symbol: str,
    db:     AsyncSession = Depends(get_db),
):
    """Remove a stock from the watchlist by its ticker symbol."""
    symbol = symbol.upper().strip()

    result = await db.execute(
        delete(CompanyORM).where(CompanyORM.symbol == symbol)
    )
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{symbol}' was not found in the watchlist.",
        )

    return {"message": f"'{symbol}' removed from watchlist."}


# ── GET /api/companies/search/{query} ─────────────────────────────
@router.get("/search/{query}", response_model=TickerInfoResponse)
async def search_ticker(query: str):
    """
    Look up an exact ticker symbol on Yahoo Finance.
    Returns the company name, sector, currency if found.

    This is the "confirm before adding" lookup used by the search box
    and the watchlist add form — it expects an exact symbol. For
    autocomplete-as-you-type suggestions, see /search-suggest/{query}.
    """
    symbol = query.upper().strip()
    info   = await asyncio.to_thread(get_ticker_info, symbol)

    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No company found for ticker '{symbol}'.",
        )

    return info


# ── GET /api/companies/search-suggest/{query} ─────────────────────
@router.get("/search-suggest/{query}", response_model=list[TickerSuggestion])
async def search_suggest(query: str):
    """
    Autocomplete suggestions for a partial ticker or company name,
    e.g. "appl" -> AAPL, "reliance" -> RELIANCE.NS / RELIANCE.BO.

    Powers the live-search dropdown as the user types. Lightweight
    compared to search_ticker() — no full company info is fetched,
    just symbol/name/exchange for each candidate.
    """
    query = query.strip()
    if len(query) < 2:
        return []

    return await asyncio.to_thread(search_tickers, query)
