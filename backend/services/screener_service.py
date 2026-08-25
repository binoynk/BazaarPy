"""
services/screener_service.py — Core screener calculations

This module contains PURE FUNCTIONS — they take data in, return data out,
and have no side effects (no database calls, no HTTP requests).
This makes them easy to test and easy to reuse.

Original Bazaar bug explained:
  The C# Calculate_Avg() used i%2 to alternate between Hi and Low,
  but there were 3 controls per row (Date, Hi, Low). The result was:
    i=0 (Date)  → treated as Hi  ← WRONG
    i=1 (Hi)    → treated as Low ← WRONG
    i=2 (Low)   → treated as Hi  ← WRONG
  Our Python version explicitly indexes by field name — no ambiguity.
"""

from typing import Optional


# ── Average Hi / Low (original Bazaar feature, corrected) ────────
def calculate_avg_hi_low(
    prices: list[dict],
    days: int
) -> tuple[float, float]:
    """
    Calculate the average daily High and average daily Low
    over the last N trading days.

    Args:
        prices: List of daily OHLCV dicts (oldest → newest)
        days:   How many days to average over

    Returns:
        (avg_hi, avg_low) rounded to 2 decimal places

    Example:
        prices = [
            {"date": "2024-01-01", "hi": 152.0, "low": 148.0, ...},
            {"date": "2024-01-02", "hi": 154.0, "low": 150.0, ...},
        ]
        calculate_avg_hi_low(prices, days=2)
        → (153.0, 149.0)
    """
    # Take only the most recent N days
    recent = prices[-days:] if len(prices) >= days else prices

    if not recent:
        return 0.0, 0.0

    avg_hi  = sum(p["hi"]  for p in recent) / len(recent)
    avg_low = sum(p["low"] for p in recent) / len(recent)

    return round(avg_hi, 2), round(avg_low, 2)


# ── Simple Moving Average ─────────────────────────────────────────
def calculate_moving_average(
    prices: list[dict],
    period: int
) -> Optional[float]:
    """
    Calculate Simple Moving Average (SMA) of the closing price.

    SMA = sum of last N closing prices / N

    Returns None if there aren't enough data points.

    Why SMA matters:
      - 10-day MA: short-term trend direction
      - 50-day MA: medium-term trend direction
      When the 10-day MA crosses above the 50-day MA → "Golden Cross"
      (historically a bullish signal)
    """
    if len(prices) < period:
        return None

    closes = [p["close"] for p in prices[-period:]]
    return round(sum(closes) / len(closes), 2)


# ── Relative Strength Index ────────────────────────────────────────
def calculate_rsi(
    prices: list[dict],
    period: int = 14
) -> Optional[float]:
    """
    Relative Strength Index (RSI) — momentum oscillator, 0-100.

    RSI = 100 - (100 / (1 + RS))
    RS  = average gain over `period` days / average loss over `period` days

    Conventionally: RSI > 70 is considered overbought, RSI < 30 oversold.
    Returns None if there aren't enough data points.
    """
    if len(prices) < period + 1:
        return None

    closes = [p["close"] for p in prices[-(period + 1):]]
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]

    gains  = [d if d > 0 else 0.0 for d in deltas]
    losses = [-d if d < 0 else 0.0 for d in deltas]

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


# ── MACD (Moving Average Convergence Divergence) ──────────────────
def _ema_series(values: list[float], period: int) -> list[float]:
    """Exponential moving average series (used internally by MACD)."""
    k = 2 / (period + 1)
    ema = [values[0]]
    for v in values[1:]:
        ema.append(v * k + ema[-1] * (1 - k))
    return ema


def calculate_macd(
    prices:        list[dict],
    fast_period:   int = 12,
    slow_period:   int = 26,
    signal_period: int = 9,
) -> Optional[dict]:
    """
    MACD — trend-following momentum indicator.

    MACD line   = 12-day EMA - 26-day EMA
    Signal line = 9-day EMA of the MACD line
    Histogram   = MACD line - Signal line

    A MACD line crossing above the signal line is a bullish signal;
    crossing below is bearish. Returns None if there isn't enough
    history for the slow EMA + signal smoothing to stabilize.
    """
    min_needed = slow_period + signal_period
    if len(prices) < min_needed:
        return None

    closes = [p["close"] for p in prices]

    fast_ema = _ema_series(closes, fast_period)
    slow_ema = _ema_series(closes, slow_period)
    macd_line = [f - s for f, s in zip(fast_ema, slow_ema)]

    # Signal line is the EMA of the MACD line itself, computed only
    # over the portion where the slow EMA has had time to stabilize.
    signal_series = _ema_series(macd_line[slow_period - 1:], signal_period)

    macd_value   = round(macd_line[-1], 4)
    signal_value = round(signal_series[-1], 4)

    return {
        "macd":      macd_value,
        "signal":    signal_value,
        "histogram": round(macd_value - signal_value, 4),
    }


# ── Percentage Change ─────────────────────────────────────────────
def calculate_pct_change(
    prices: list[dict],
    days: int
) -> Optional[float]:
    """
    Percentage change in closing price over the last N trading days.

    Formula: ((current_price - price_N_days_ago) / price_N_days_ago) * 100

    Returns None if there's not enough history.
    """
    if len(prices) < days + 1:
        return None

    price_n_days_ago = prices[-(days + 1)]["close"]
    current_price    = prices[-1]["close"]

    if price_n_days_ago == 0:
        return None

    pct = ((current_price - price_n_days_ago) / price_n_days_ago) * 100
    return round(pct, 2)


# ── Breakout Signal Detection ─────────────────────────────────────
def detect_breakout_signals(
    current_price: float,
    ma_10:  Optional[float],
    ma_50:  Optional[float],
    ma_200: Optional[float] = None,
    rsi:    Optional[float] = None,
    macd:   Optional[dict]  = None,
) -> list[str]:
    """
    Detect trading signals based on price vs moving averages, RSI, and MACD.

    Signals returned (as human-readable strings for display):
      "Golden Cross 🟢"    → 10-day MA crossed above 50-day MA (bullish)
      "Death Cross 🔴"     → 10-day MA crossed below 50-day MA (bearish)
      "Above 10-day MA"    → Current price is above short-term average
      "Above 50-day MA"    → Current price is above medium-term average
      "Below 10-day MA"    → Current price is below short-term average
      "Above 200-day MA"   → Current price is above the long-term trend line
      "Below 200-day MA"   → Current price is below the long-term trend line
      "RSI Overbought"     → RSI > 70
      "RSI Oversold"       → RSI < 30
      "MACD Bullish"       → MACD line above signal line
      "MACD Bearish"       → MACD line below signal line
    """
    signals = []

    if ma_10 is not None:
        if current_price > ma_10:
            signals.append("Above 10-day MA")
        else:
            signals.append("Below 10-day MA")

    if ma_50 is not None and current_price > ma_50:
        signals.append("Above 50-day MA")

    if ma_200 is not None:
        signals.append("Above 200-day MA" if current_price > ma_200 else "Below 200-day MA")

    # Golden Cross / Death Cross
    if ma_10 is not None and ma_50 is not None:
        if ma_10 > ma_50:
            signals.append("Golden Cross 🟢")
        elif ma_10 < ma_50:
            signals.append("Death Cross 🔴")

    if rsi is not None:
        if rsi > 70:
            signals.append("RSI Overbought")
        elif rsi < 30:
            signals.append("RSI Oversold")

    if macd is not None:
        signals.append("MACD Bullish" if macd["histogram"] > 0 else "MACD Bearish")

    return signals


# ── Full Screener Run (orchestrator) ──────────────────────────────
def run_screener(
    symbol:          str,
    name:            str,
    market:          str,
    currency:        Optional[str],
    prices:          list[dict],
    days:            int = 10,
    pct_change_days: int = 30,
) -> Optional[dict]:
    """
    Run all screener calculations for one stock and return a result dict.

    This is the main function called by the screener router.
    It orchestrates all the individual calculation functions above.

    Returns None if there's insufficient data to calculate anything useful.
    """
    if not prices or len(prices) < 2:
        return None

    current_price = prices[-1]["close"]

    # Run all calculations
    avg_hi, avg_low = calculate_avg_hi_low(prices, days)
    ma_10           = calculate_moving_average(prices, 10)
    ma_50           = calculate_moving_average(prices, 50)
    ma_200          = calculate_moving_average(prices, 200)
    rsi             = calculate_rsi(prices)
    macd            = calculate_macd(prices)
    pct_change      = calculate_pct_change(prices, pct_change_days)
    signals         = detect_breakout_signals(current_price, ma_10, ma_50, ma_200, rsi, macd)

    return {
        "symbol":        symbol,
        "name":          name,
        "market":        market,
        "currency":      currency,
        "current_price": round(current_price, 2),
        "avg_hi":        avg_hi,
        "avg_low":       avg_low,
        "ma_10":         ma_10,
        "ma_50":         ma_50,
        "ma_200":        ma_200,
        "rsi":           rsi,
        "macd":          macd,
        "pct_change":    pct_change,
        "signals":       signals,
    }
