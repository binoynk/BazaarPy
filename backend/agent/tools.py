"""
agent/tools.py — the functions the model is allowed to call.

A TOOL has two halves:
  1. A SCHEMA (JSON) — the model only ever sees this: a name, a description,
     and the arguments. The description is what the model uses to decide
     WHEN to call the tool, so write it like instructions to a colleague.
  2. A PYTHON FUNCTION — what actually runs when the model asks.

The model never executes anything itself. It *requests* a call; our code
runs it and hands back the result. That boundary is where safety lives:
we only register read-only tools, and we validate the arguments.

Our first tool wraps your existing pure function `run_screener`.
We don't change that code — the agent just calls it.
"""

import asyncio
import json
from typing import Any, Awaitable, Callable

from services.screener_service import run_screener
from services.yfinance_service import get_price_history


# ── Tool 1: screen_stock ─────────────────────────────────────────
async def screen_stock(symbol: str, days: int = 10) -> dict[str, Any]:
    """Fetch prices for one symbol and run the existing screener on them."""
    symbol = str(symbol).strip().upper()
    days = max(5, min(int(days), 365))

    # yfinance is synchronous -> run it in a thread (same trick the routers use)
    prices = await asyncio.to_thread(get_price_history, symbol, 320)
    if not prices:
        return {"error": f"No price data found for '{symbol}'. "
                         "Check the symbol (e.g. AAPL, SHOP.TO, RELIANCE.NS)."}

    result = run_screener(
        symbol=symbol, name=symbol, market="", currency=None,
        prices=prices, days=days,
    )
    if result is None:
        return {"error": f"Not enough price history for '{symbol}'."}

    # Drop fields the model doesn't need; fewer tokens = better small-model accuracy.
    for key in ("name", "market", "currency"):
        result.pop(key, None)
    return result


SCREEN_STOCK_SCHEMA = {
    "type": "function",
    "function": {
        "name": "screen_stock",
        "description": (
            "Run the Bazaar screener on ONE stock. Returns current price, average "
            "daily high/low over N days, 10/50/200-day moving averages, RSI, MACD, "
            "percent change over 30 days, and a list of signals (e.g. Golden Cross, "
            "RSI Oversold). Use this for any question about a specific stock's "
            "technical position."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Yahoo Finance ticker, e.g. AAPL, SHOP.TO, RELIANCE.NS, 500325.BO",
                },
                "days": {
                    "type": "integer",
                    "description": "Days for the average high/low window (5-365). Default 10.",
                },
            },
            "required": ["symbol"],
        },
    },
}


# ── Registry: name -> (schema, function) ─────────────────────────
ToolFn = Callable[..., Awaitable[dict[str, Any]]]

REGISTRY: dict[str, tuple[dict, ToolFn]] = {
    "screen_stock": (SCREEN_STOCK_SCHEMA, screen_stock),
}


def tool_schemas() -> list[dict]:
    """What we send to the model."""
    return [schema for schema, _ in REGISTRY.values()]


async def execute_tool(name: str, raw_arguments: str | dict) -> str:
    """
    Run a tool the model asked for and return the result as a JSON string.

    Errors are returned AS TEXT instead of raised. That lets the model read
    the error and try again (e.g. fix a bad symbol) rather than crashing
    the whole request.
    """
    if name not in REGISTRY:
        return json.dumps({"error": f"Unknown tool '{name}'. Available: {list(REGISTRY)}"})

    # Models usually send arguments as a JSON *string*; some send a dict.
    try:
        args = json.loads(raw_arguments) if isinstance(raw_arguments, str) else dict(raw_arguments)
    except (json.JSONDecodeError, TypeError, ValueError):
        return json.dumps({"error": "Arguments were not valid JSON."})

    _, fn = REGISTRY[name]
    try:
        result = await fn(**args)
    except TypeError as exc:      # wrong / missing argument names
        return json.dumps({"error": f"Bad arguments for {name}: {exc}"})
    except Exception as exc:      # anything else: report, don't crash
        return json.dumps({"error": f"{name} failed: {exc}"})
    return json.dumps(result, default=str)
