"""
services/index_symbols.py — Stock symbol lists for each market index

yfinance uses ticker suffixes to identify which exchange a stock trades on:
  - No suffix  → US markets (NASDAQ, NYSE)
  - .TO suffix → TSX (Toronto Stock Exchange)
  - .NS suffix → NSE (National Stock Exchange, India)
  - .BO suffix → BSE (Bombay Stock Exchange, India)

Index tickers (for the market summary bar):
  ^GSPTSE  → TSX Composite
  ^IXIC    → NASDAQ Composite
  ^NYA     → NYSE Composite
  ^NSEI    → NIFTY 50 (NSE)
  ^BSESN   → SENSEX (BSE)
"""

from typing import Optional

# ── Market metadata ──────────────────────────────────────────────
MARKETS = {
    "TSX":    "TSX (Toronto Stock Exchange)",
    "NASDAQ": "NASDAQ Composite",
    "NYSE":   "NYSE / S&P 500",
    "NSE":    "NSE — NIFTY 50 (India)",
    "BSE":    "BSE — SENSEX (India)",
}

# Index tickers used in the market summary bar
INDEX_TICKERS = {
    "TSX":    {"symbol": "^GSPTSE", "name": "TSX"},
    "NASDAQ": {"symbol": "^IXIC",   "name": "NASDAQ"},
    "NYSE":   {"symbol": "^NYA",    "name": "NYSE"},
    "NSE":    {"symbol": "^NSEI",   "name": "NIFTY 50"},
    "BSE":    {"symbol": "^BSESN",  "name": "SENSEX"},
}

# ── TSX 60 ───────────────────────────────────────────────────────
TSX_SYMBOLS = [
    # Banks
    "RY.TO", "TD.TO", "BNS.TO", "BMO.TO", "CM.TO",
    # Energy
    "SU.TO", "CNQ.TO", "CVE.TO", "IMO.TO",
    # Tech
    "SHOP.TO", "CSU.TO", "OTEX.TO", "BB.TO",
    # Railways
    "CP.TO", "CNR.TO",
    # Retail
    "ATD.TO", "L.TO", "MRU.TO", "DOL.TO",
    # Telecom / Media
    "TRI.TO", "BCE.TO", "T.TO",
    # Mining / Gold
    "ABX.TO", "WPM.TO", "AEM.TO",
    # Brookfield
    "BAM.TO", "BIP-UN.TO", "BEP-UN.TO",
    # Insurance
    "MFC.TO", "SLF.TO", "GWO.TO", "IFC.TO",
    # Others
    "WCN.TO", "FNV.TO", "QSR.TO", "NTR.TO",
    "AC.TO", "CAE.TO", "EMA.TO", "CCO.TO",
]

# ── NASDAQ 100 ───────────────────────────────────────────────────
NASDAQ_SYMBOLS = [
    "AAPL", "MSFT", "NVDA", "AMZN", "META",
    "GOOGL", "TSLA", "AVGO", "COST", "NFLX",
    "AMD", "ADBE", "QCOM", "INTC", "INTU",
    "AMAT", "MU", "LRCX", "MRVL", "PANW",
    "SNPS", "CDNS", "KLAC", "CRWD", "ABNB",
    "ORLY", "MNST", "REGN", "PYPL", "MELI",
    "FTNT", "ISRG", "BIIB", "MRNA", "WDAY",
    "ZS", "TEAM", "VEEV", "DXCM", "ASML",
]

# ── NYSE / S&P 500 large caps ────────────────────────────────────
NYSE_SYMBOLS = [
    "JPM", "JNJ", "V",   "WMT", "PG",
    "UNH", "MA",  "HD",  "BAC", "DIS",
    "VZ",  "KO",  "PFE", "MRK", "CVX",
    "XOM", "ABT", "TMO", "ACN", "LLY",
    "NEE", "MDT", "HON", "IBM", "TXN",
    "BMY", "AMGN","LIN", "RTX", "SBUX",
    "BLK", "GILD","CAT", "GE",  "MMM",
    "BA",  "GS",  "MS",  "AXP", "SPGI",
    "C",   "WFC", "USB", "CB",  "CI",
]

# ── NIFTY 50 (NSE, India) ────────────────────────────────────────
NSE_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS",       "HDFCBANK.NS", "INFY.NS",      "ICICIBANK.NS",
    "HINDUNILVR.NS","ITC.NS",      "SBIN.NS",     "BHARTIARTL.NS","KOTAKBANK.NS",
    "LT.NS",       "AXISBANK.NS",  "ASIANPAINT.NS","MARUTI.NS",   "HCLTECH.NS",
    "SUNPHARMA.NS","BAJFINANCE.NS","TITAN.NS",     "WIPRO.NS",    "NESTLEIND.NS",
    "ULTRACEMCO.NS","POWERGRID.NS","NTPC.NS",      "TECHM.NS",    "TATAMOTORS.NS",
    "HDFCLIFE.NS", "CIPLA.NS",    "DIVISLAB.NS",  "DRREDDY.NS",  "GRASIM.NS",
    "BAJAJFINSV.NS","TATASTEEL.NS","INDUSINDBK.NS","ADANIPORTS.NS","COALINDIA.NS",
    "BRITANNIA.NS","ONGC.NS",     "JSWSTEEL.NS",  "APOLLOHOSP.NS","BPCL.NS",
    "EICHERMOT.NS","HEROMOTOCO.NS","TATACONSUM.NS","SBILIFE.NS",  "HINDALCO.NS",
    "UPL.NS",      "SHREECEM.NS",
]

# ── SENSEX 30 (BSE, India) ───────────────────────────────────────
BSE_SYMBOLS = [
    "RELIANCE.BO", "TCS.BO",       "HDFCBANK.BO", "INFY.BO",     "ICICIBANK.BO",
    "HINDUNILVR.BO","ITC.BO",      "SBIN.BO",     "BHARTIARTL.BO","KOTAKBANK.BO",
    "LT.BO",       "AXISBANK.BO",  "ASIANPAINT.BO","MARUTI.BO",  "HCLTECH.BO",
    "SUNPHARMA.BO","BAJFINANCE.BO","TITAN.BO",     "WIPRO.BO",   "NESTLEIND.BO",
    "ULTRACEMCO.BO","POWERGRID.BO","NTPC.BO",      "TECHM.BO",   "TATAMOTORS.BO",
    "TATASTEEL.BO","INDUSINDBK.BO","BAJAJFINSV.BO","DRREDDY.BO", "ONGC.BO",
]

# ── Lookup helpers ───────────────────────────────────────────────
MARKET_SYMBOLS: dict[str, list[str]] = {
    "TSX":    TSX_SYMBOLS,
    "NASDAQ": NASDAQ_SYMBOLS,
    "NYSE":   NYSE_SYMBOLS,
    "NSE":    NSE_SYMBOLS,
    "BSE":    BSE_SYMBOLS,
}

def get_symbols_for_market(market: str) -> list[str]:
    """Return the symbol list for a given market key."""
    return MARKET_SYMBOLS.get(market.upper(), [])


# ── Exchange → Market inference ────────────────────────────────────
# Maps Yahoo Finance's internal 'exchange' code (returned by
# yf.Ticker(x).info['exchange']) to our 5 supported market buckets.
# This is how we auto-detect a stock's market on add — see
# routers/companies.py:add_to_watchlist — rather than asking the user
# to pick from a dropdown or rely on remembering a ticker suffix.
# Verified live against AAPL/MSFT (NMS), JPM/KO (NYQ), SHOP.TO/ENB.TO
# (TOR), RELIANCE.NS (NSI), RELIANCE.BO (BSE).
EXCHANGE_TO_MARKET: dict[str, str] = {
    "NMS": "NASDAQ",  # Nasdaq Global Select
    "NGM": "NASDAQ",  # Nasdaq Global Market
    "NCM": "NASDAQ",  # Nasdaq Capital Market
    "NYQ": "NYSE",
    "ASE": "NYSE",    # NYSE American
    "TOR": "TSX",
    "NSI": "NSE",
    "BSE": "BSE",
}


def infer_market(exchange_code: Optional[str]) -> Optional[str]:
    """
    Map a Yahoo exchange code to one of our supported markets.
    Returns None if the code isn't recognized (e.g. LSE, ASX) —
    callers should reject the add rather than guess.
    """
    if not exchange_code:
        return None
    return EXCHANGE_TO_MARKET.get(exchange_code.upper())
