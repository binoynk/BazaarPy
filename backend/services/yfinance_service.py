"""
services/yfinance_service.py — All Yahoo Finance data fetching

yfinance is a Python library that wraps Yahoo Finance's unofficial API.
It's free and requires no API key, but has rate limits so we add small
delays between bulk requests.

Important: yfinance functions are SYNCHRONOUS (blocking). In FastAPI
async routes, we always call them with:
    await asyncio.to_thread(get_price_history, symbol, days)
This runs the blocking call in a separate thread so the async event
loop is never blocked.
"""

import yfinance as yf
import time
from datetime import datetime, timedelta
from functools import wraps
from json import JSONDecodeError
from typing import Optional

# Yahoo rate-limits show up in different shapes depending on where the
# request fails inside yfinance: a plain HTTPError with "429" in the
# message, or (once the 429 body is swallowed internally by yfinance)
# a JSONDecodeError/KeyError from trying to parse an empty/malformed
# response. Retry on all of them rather than just matching a string,
# since the exact shape has changed across yfinance versions.
RATE_LIMIT_EXCEPTION_TYPES = (JSONDecodeError, KeyError)


def _is_rate_limit_error(exc: Exception) -> bool:
    if "429" in str(exc) or "Too Many Requests" in str(exc):
        return True
    return isinstance(exc, RATE_LIMIT_EXCEPTION_TYPES)


# ── Simple in-memory TTL cache ────────────────────────────────────
# Every yfinance call hits Yahoo live — repeated requests for the
# same symbol within a short window (e.g. the market bar polling
# every 60s, or opening the same stock's history page twice) don't
# need a fresh network round-trip each time. This is process-local
# and unbounded-but-short-lived, which is fine for a single-instance
# app; a multi-instance deployment would want Redis instead.
_cache: dict[tuple, tuple[float, object]] = {}


def _ttl_cache(ttl_seconds: float):
    """Cache a function's return value per-argument for `ttl_seconds`.
    Only successful (non-None) results are cached, so failures always
    retry fresh rather than getting stuck returning a cached failure."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = (func.__name__, args, tuple(sorted(kwargs.items())))
            cached = _cache.get(key)
            if cached is not None and time.time() - cached[0] < ttl_seconds:
                return cached[1]
            result = func(*args, **kwargs)
            if result is not None:
                _cache[key] = (time.time(), result)
            return result
        return wrapper
    return decorator


# ── Company / ticker info ─────────────────────────────────────────
@_ttl_cache(ttl_seconds=60)
def get_ticker_info(symbol: str, retries: int = 3, backoff: float = 1.0) -> Optional[dict]:
    """
    Fetch basic company metadata for a ticker symbol.
    Returns None if the symbol doesn't exist on Yahoo Finance.

    yfinance returns an 'info' dict with dozens of fields.
    We extract only what we need.
    
    Includes retry logic with exponential backoff for rate limit errors.
    """
    for attempt in range(retries):
        try:
            ticker = yf.Ticker(symbol)
            info   = ticker.info

            # If Yahoo returns an empty or minimal dict, the symbol is invalid
            name = info.get("longName") or info.get("shortName")
            if not name:
                return None

            return {
                "symbol":             symbol.upper(),
                "name":               name,
                "sector":             info.get("sector"),
                "currency":           info.get("currency"),
                "exchange":           info.get("exchange"),
                "full_exchange_name": info.get("fullExchangeName"),
                "current_price": (
                    info.get("regularMarketPrice")
                    or info.get("currentPrice")
                    or info.get("previousClose")
                ),
            }
        except Exception as exc:
            # Check if it's a rate limit error
            if _is_rate_limit_error(exc):
                if attempt < retries - 1:
                    wait_time = backoff * (2 ** attempt)  # Exponential backoff
                    print(f"[yfinance] Rate limited. Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
            print(f"[yfinance] Error fetching info for {symbol}: {exc}")
            return None
    return None


# ── Historical OHLCV prices ───────────────────────────────────────
@_ttl_cache(ttl_seconds=60)
def get_price_history(
    symbol:   str,
    days:     int = 60,
    retries:  int = 3,
    backoff:  float = 1.0,
    period:   Optional[str] = None,
) -> Optional[list[dict]]:
    """
    Fetch daily Open/High/Low/Close/Volume data.

    Args:
        symbol:  Ticker symbol (e.g. "AAPL", "SHOP.TO", "RELIANCE.NS")
        days:    How many calendar days back to fetch (ignored if `period` is set)
        retries: Number of retry attempts for rate limit errors
        backoff: Initial backoff time in seconds (exponentially increases)
        period:  yfinance preset range ("1d","5d","3mo","6mo","1y","5y","ytd").
                 When given, takes precedence over `days` and uses yfinance's
                 own trading-calendar-aware period fetch instead of a
                 calendar-day `start=` cutoff — the correct way to ask for
                 "the last N years/months" since it isn't thrown off by
                 weekends/holidays the way a calendar-day count is.

    Returns:
        List of dicts sorted oldest → newest, or None if no data found.

    Note: Calendar days ≠ trading days. 60 calendar days ≈ 42 trading days.
    We fetch more calendar days than needed to ensure enough trading days.
    """
    for attempt in range(retries):
        try:
            ticker = yf.Ticker(symbol)
            if period:
                history = ticker.history(period=period)
            else:
                start   = (datetime.today() - timedelta(days=days)).strftime("%Y-%m-%d")
                history = ticker.history(start=start)

            if history.empty:
                return None

            # Today's row can show up with a real volume but NaN OHLC
            # when the market is still mid-session and Yahoo hasn't
            # finalized the candle yet. Drop it — a NaN close would
            # otherwise flow into current_price and break the whole
            # response (NaN isn't valid JSON).
            history = history[history["Close"].notna()]
            if history.empty:
                return None

            prices = []
            for dt, row in history.iterrows():
                prices.append({
                    "date":   dt.strftime("%Y-%m-%d"),
                    "open":   round(float(row["Open"]),  4),
                    "hi":     round(float(row["High"]),  4),
                    "low":    round(float(row["Low"]),   4),
                    "close":  round(float(row["Close"]), 4),
                    "volume": int(row["Volume"]) if row["Volume"] else 0,
                })

            return prices  # already sorted oldest → newest by yfinance

        except Exception as exc:
            # Check if it's a rate limit error
            if _is_rate_limit_error(exc):
                if attempt < retries - 1:
                    wait_time = backoff * (2 ** attempt)  # Exponential backoff
                    print(f"[yfinance] Rate limited on {symbol}. Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
            print(f"[yfinance] Error fetching history for {symbol}: {exc}")
            return None
    return None


# ── Market index summary ──────────────────────────────────────────
@_ttl_cache(ttl_seconds=60)
def get_index_summary(index_ticker: str, retries: int = 3, backoff: float = 1.0) -> Optional[dict]:
    """
    Fetch today's price and % change for a market index.
    Used to populate the market summary bar in the UI.

    Example tickers: ^GSPTSE (TSX), ^IXIC (NASDAQ), ^NSEI (NIFTY)
    
    Includes retry logic with exponential backoff for rate limit errors.
    """
    for attempt in range(retries):
        try:
            ticker = yf.Ticker(index_ticker)
            info   = ticker.fast_info  # 'fast_info' is quicker than full .info

            price   = round(float(info.last_price),            2)
            prev    = round(float(info.previous_close),        2)
            change  = round(price - prev,                      2)
            pct     = round(((price - prev) / prev) * 100,     2) if prev else 0.0

            return {
                "price":      price,
                "change":     change,
                "pct_change": pct,
                "is_positive": change >= 0,
            }
        except Exception as exc:
            # Check if it's a rate limit error
            if _is_rate_limit_error(exc):
                if attempt < retries - 1:
                    wait_time = backoff * (2 ** attempt)  # Exponential backoff
                    print(f"[yfinance] Rate limited on {index_ticker}. Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
            print(f"[yfinance] Error fetching index {index_ticker}: {exc}")
            return None
    return None


# ── Batch helper with rate limiting ──────────────────────────────
def get_price_history_with_delay(symbol: str, days: int, delay: float = 0.15, retries: int = 3) -> Optional[list[dict]]:
    """
    Same as get_price_history but with a small sleep before the request.
    Use this when scanning many symbols in sequence to avoid Yahoo rate limits.
    
    Args:
        symbol: Ticker symbol
        days: Number of calendar days to fetch
        delay: Sleep duration before request (in seconds)
        retries: Number of retry attempts for rate limit errors
    """
    time.sleep(delay)
    return get_price_history(symbol, days, retries=retries, backoff=1.0)


# ── Ticker search (autocomplete) ──────────────────────────────────
@_ttl_cache(ttl_seconds=300)
def search_tickers(query: str, max_results: int = 8) -> list[dict]:
    """
    Look up matching symbols for a partial company name OR partial/exact
    ticker symbol, for autocomplete-as-you-type — Yahoo's search endpoint
    matches against both in one call (e.g. "appl" and "AAPL" both hit
    Apple Inc.). Uses yfinance's lightweight search endpoint, much cheaper
    per call than fetching full .info for every candidate.

    Returns an empty list on any error — this backs a "nice to have"
    UI affordance, not a critical path, so we fail quiet rather than 500.
    """
    try:
        results = yf.Search(query, max_results=max_results)
        return [
            {
                "symbol":     q.get("symbol"),
                "name":       q.get("longname") or q.get("shortname"),
                "exchange":   q.get("exchDisp"),
                "quote_type": q.get("quoteType"),
            }
            for q in results.quotes
            if q.get("symbol")
        ]
    except Exception as exc:
        print(f"[yfinance] Search failed for '{query}': {exc}")
        return []
