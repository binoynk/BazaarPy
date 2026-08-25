"""
routers/prices.py — Price history and market summary endpoints

Endpoints:
  GET /api/prices/{symbol}         → OHLCV history for one ticker
  GET /api/prices/market-summary   → Index snapshot for the market bar
"""

import asyncio
from fastapi import APIRouter, HTTPException, Query
from services.yfinance_service import get_price_history, get_index_summary
from services.screener_service import calculate_avg_hi_low
from services.index_symbols import INDEX_TICKERS, MARKETS
from models.price import PriceHistoryResponse, MarketSummaryItem

router = APIRouter()


# ── GET /api/prices/market-summary ───────────────────────────────
# IMPORTANT: this route must be defined BEFORE /{symbol} so FastAPI
# doesn't treat "market-summary" as a symbol value.
@router.get("/market-summary", response_model=list[MarketSummaryItem])
async def get_market_summary():
    """
    Fetch today's price and % change for each major index.
    Powers the horizontal market bar at the top of every page.
    """
    results = []

    for market_key, index in INDEX_TICKERS.items():
        # Run each yfinance call in a thread (they're synchronous)
        summary = await asyncio.to_thread(get_index_summary, index["symbol"])

        if summary:
            results.append({
                "market":      market_key,
                "name":        index["name"],
                "symbol":      index["symbol"],
                **summary,
            })

    return results


# ── GET /api/prices/{symbol} ──────────────────────────────────────
SUPPORTED_PERIODS = ("1d", "5d", "3mo", "6mo", "1y", "5y", "ytd")


@router.get("/{symbol}", response_model=PriceHistoryResponse)
async def get_price_history_endpoint(
    symbol: str,
    days:   int = Query(
        default=60,
        ge=10,
        le=365,
        description="Calendar days of history to fetch (ignored if `period` is set)",
    ),
    avg_days: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Number of most recent trading days to average Hi/Low over (ignored if `period` is set)",
    ),
    period: str | None = Query(
        default=None,
        description=f"Preset duration, overrides `days`/`avg_days`. One of: {', '.join(SUPPORTED_PERIODS)}",
    ),
):
    """
    Fetch historical OHLCV data for a ticker symbol, plus the average
    Hi/Low over the returned range (same calculation the screener uses —
    see screener_service.py).

    Two modes:
      - `period` set (e.g. "3mo", "ytd"): fetches exactly that yfinance
        preset range, and avg Hi/Low spans the *entire* returned range —
        this is what the historical-data page's duration picker uses.
      - `period` omitted: legacy calendar-`days` + fixed-window `avg_days`
        behavior (unaffected, still used internally elsewhere).

    The 'days' parameter (when used) is calendar days, not trading days.
    60 calendar days ≈ 42 trading days.
    """
    if period is not None and period not in SUPPORTED_PERIODS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported period '{period}'. Must be one of: {', '.join(SUPPORTED_PERIODS)}.",
        )

    prices = await asyncio.to_thread(
        get_price_history, symbol.upper(), days, period=period
    )

    if not prices:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No price data found for '{symbol}'. "
                f"Check the symbol is correct and includes the right suffix "
                f"(e.g. .TO for TSX, .NS for NSE, .BO for BSE)."
            ),
        )

    avg_days_used = len(prices) if period else avg_days
    avg_hi, avg_low = calculate_avg_hi_low(prices, avg_days_used)

    return {
        "symbol":         symbol.upper(),
        "days_requested": None if period else days,
        "days_returned":  len(prices),
        "avg_days":       avg_days_used,
        "avg_hi":         avg_hi,
        "avg_low":        avg_low,
        "period":         period,
        "prices":         prices,
    }
