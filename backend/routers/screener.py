"""
routers/screener.py — Screener endpoints

Two modes:
  1. Screen the user's saved watchlist
  2. Scan a market index (TSX, NASDAQ, NYSE, NSE, BSE)

Both return a list of ScreenerResult objects with:
  - Avg Hi / Avg Low over N days (original Bazaar feature)
  - 10-day and 50-day moving averages
  - % change over M days
  - Breakout signals (Golden/Death Cross etc.)
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from database import get_db
from models.company import CompanyORM
from models.price import WatchlistScreenerResponse, IndexScreenerResponse
from services.yfinance_service import get_ticker_info, get_price_history_with_delay
from services.screener_service import run_screener
from services.index_symbols import MARKETS, get_symbols_for_market

router = APIRouter()


# ── GET /api/screener/markets ─────────────────────────────────────
@router.get("/markets")
async def get_supported_markets():
    """List of markets available for index scanning."""
    return [{"key": k, "name": v} for k, v in MARKETS.items()]


# ── GET /api/screener/watchlist ───────────────────────────────────
@router.get("/watchlist", response_model=WatchlistScreenerResponse)
async def screen_watchlist(
    days:             int   = Query(default=10, ge=5,  le=150000),
    pct_change_days:  int   = Query(default=30, ge=5,  le=365),
    min_pct_change:   Optional[float] = Query(default=None),
    max_pct_change:   Optional[float] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Run the screener on every stock in the user's watchlist.

    Steps per stock:
      1. Fetch OHLCV history from yfinance (in a thread — it's synchronous)
      2. Run all calculations (avg hi/low, MAs, % change, signals)
      3. Apply any filters the user set
      4. Return the results

    The min_pct_change / max_pct_change filters let users find
    e.g. stocks that are up 5-20% over the last 30 days.
    """
    # Load watchlist from PostgreSQL
    result = await db.execute(
        select(CompanyORM).where(CompanyORM.in_watchlist == True)
    )
    companies = result.scalars().all()

    if not companies:
        return {"count": 0, "results": [], "message": "Your watchlist is empty."}

    # Fetch prices and screen each company
    # We need at least 60 days of data so 50-day MA can be calculated
    # 200-day MA needs ~200 trading days of history; 320 calendar
    # days comfortably covers that including weekends/holidays.
    fetch_days = max(days + 10, 320)
    screener_results = []

    for company in companies:
        # asyncio.to_thread runs the synchronous yfinance call in a
        # background thread without blocking the async event loop
        # Use longer delay (0.5s) to avoid Yahoo rate limits
        prices = await asyncio.to_thread(
            get_price_history_with_delay, company.symbol, fetch_days, 0.5
        )

        if not prices:
            continue

        result = run_screener(
            symbol          = company.symbol,
            name            = company.name,
            market          = company.market,
            currency        = company.currency,
            prices          = prices,
            days            = days,
            pct_change_days = pct_change_days,
        )

        if result is None:
            continue

        # Apply percentage change filters
        if min_pct_change is not None and result["pct_change"] is not None:
            if result["pct_change"] < min_pct_change:
                continue
        if max_pct_change is not None and result["pct_change"] is not None:
            if result["pct_change"] > max_pct_change:
                continue

        screener_results.append(result)

    return {"count": len(screener_results), "results": screener_results}


# ── GET /api/screener/index/{market} ─────────────────────────────
@router.get("/index/{market}", response_model=IndexScreenerResponse)
async def screen_index(
    market:           str,
    days:             int = Query(default=10, ge=5, le=150000),
    pct_change_days:  int = Query(default=30, ge=5, le=365),
    limit:            int = Query(default=20, ge=1, le=50,
                                  description="Max symbols to scan. Higher = slower."),
    min_pct_change:   Optional[float] = Query(default=None),
):
    """
    Scan a market index and run the screener on its symbols.

    Limit is enforced (max 50) to prevent long timeouts from Yahoo Finance
    rate limiting. A scan of 20 stocks takes roughly 30-60 seconds.
    """
    market_key = market.upper()

    if market_key not in MARKETS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown market '{market}'. Supported: {list(MARKETS.keys())}",
        )

    symbols    = get_symbols_for_market(market_key)[:limit]
    # 200-day MA needs ~200 trading days of history; 320 calendar
    # days comfortably covers that including weekends/holidays.
    fetch_days = max(days + 10, 320)
    results    = []

    for symbol in symbols:
        # Fetch prices (1.0s delay for index scanning to avoid Yahoo rate limits)
        prices = await asyncio.to_thread(
            get_price_history_with_delay, symbol, fetch_days, 1.0
        )
        if not prices:
            continue

        # Get company name from yfinance (with retry on rate limits)
        info     = await asyncio.to_thread(get_ticker_info, symbol)
        name     = info["name"]     if info else symbol
        currency = info["currency"] if info else None

        result = run_screener(
            symbol          = symbol,
            name            = name,
            market          = market_key,
            currency        = currency,
            prices          = prices,
            days            = days,
            pct_change_days = pct_change_days,
        )

        if result is None:
            continue

        if min_pct_change is not None and result["pct_change"] is not None:
            if result["pct_change"] < min_pct_change:
                continue

        results.append(result)

    return {
        "market":      market_key,
        "market_name": MARKETS[market_key],
        "scanned":     len(symbols),
        "returned":    len(results),
        "results":     results,
    }
