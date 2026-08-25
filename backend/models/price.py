"""
models/price.py — Pydantic schemas for price data and screener output

No database table here — we fetch prices fresh from yfinance each time.
These are just shapes for the data flowing through the API.
"""

from pydantic import BaseModel
from typing import Optional, List


class MACDResult(BaseModel):
    """MACD line, signal line, and histogram — see screener_service.calculate_macd."""
    macd:      float
    signal:    float
    histogram: float


class DailyPrice(BaseModel):
    """One day's OHLCV data (Open, High, Low, Close, Volume)."""
    date:   str            # "YYYY-MM-DD"
    open:   Optional[float] = None
    hi:     float          # Daily High  (called 'High' in yfinance)
    low:    float          # Daily Low
    close:  float          # Closing price
    volume: Optional[int]  = None


class PriceHistoryResponse(BaseModel):
    """Response shape for GET /api/prices/{symbol}"""
    symbol: str
    days_requested: Optional[int] = None  # None when `period` was used instead
    days_returned: int
    avg_days: int
    avg_hi: float
    avg_low: float
    period: Optional[str] = None  # e.g. "3mo", "ytd" — set when period-mode was used
    prices: List[DailyPrice]


class ScreenerResult(BaseModel):
    """
    Full analysis result for one stock.
    This is the data each StockCard in the React frontend receives.
    """
    symbol:  str
    name:    str
    market:  str
    currency: Optional[str] = None

    # Current price
    current_price: float

    # ── Original Bazaar functionality (bug-fixed) ──────────────────
    # Average daily High over last N days
    avg_hi:  float
    # Average daily Low over last N days
    avg_low: float

    # ── Extended screener metrics ──────────────────────────────────
    ma_10:      Optional[float] = None   # 10-day Simple Moving Average
    ma_50:      Optional[float] = None   # 50-day Simple Moving Average
    ma_200:     Optional[float] = None   # 200-day Simple Moving Average
    rsi:        Optional[float] = None   # 14-day Relative Strength Index (0-100)
    macd:       Optional[MACDResult] = None
    pct_change: Optional[float] = None   # % change over M days

    # ── Signals ───────────────────────────────────────────────────
    # e.g. ["Golden Cross 🟢", "Above 50-day MA"]
    signals: List[str] = []


class WatchlistScreenerResponse(BaseModel):
    """Response shape for GET /api/screener/watchlist"""
    count: int
    results: List[ScreenerResult]
    message: Optional[str] = None


class IndexScreenerResponse(BaseModel):
    """Response shape for GET /api/screener/index/{market}"""
    market: str
    market_name: str
    scanned: int
    returned: int
    results: List[ScreenerResult]


class MarketSummaryItem(BaseModel):
    """One row in the market summary bar (e.g. TSX ▲ 0.4%)"""
    market:        str    # "TSX" — market key used by the frontend
    name:          str    # "TSX Composite"
    symbol:        str    # "^GSPTSE"
    price:         float
    change:        float  # Absolute change
    pct_change:    float  # Percentage change
    is_positive:   bool
