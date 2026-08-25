"""
models/company.py — Company table and schemas

Two kinds of models live here:
  1. SQLAlchemy ORM model (CompanyORM) — maps to a PostgreSQL table
  2. Pydantic schemas (CompanyCreate, CompanyResponse) — validate HTTP data

Keeping them in the same file makes it easy to see how they relate.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

from database import Base


# ── SQLAlchemy ORM Model ─────────────────────────────────────────
# This class IS the 'companies' table. Each attribute = one column.
class CompanyORM(Base):
    __tablename__ = "companies"

    id         = Column(Integer, primary_key=True, index=True)
    symbol     = Column(String(20),  unique=True, nullable=False, index=True)
    name       = Column(String(200), nullable=False)
    market     = Column(String(10),  nullable=False, index=True)
    currency   = Column(String(10),  nullable=True)
    sector     = Column(String(100), nullable=True)
    in_watchlist = Column(Boolean, default=True, nullable=False)

    # server_default=func.now() means PostgreSQL sets this, not Python.
    # More reliable across timezones.
    added_at   = Column(DateTime(timezone=True), server_default=func.now())


# ── Pydantic Schemas ─────────────────────────────────────────────
# Pydantic validates incoming data from HTTP requests and outgoing
# data in responses. If something doesn't match, FastAPI returns a
# clear 422 error instead of crashing with a cryptic Python error.

class CompanyCreate(BaseModel):
    """
    What the frontend sends when adding a stock to the watchlist.
    Market is no longer chosen by the user — it's inferred server-side
    from Yahoo's own exchange code (see routers/companies.py, index_symbols.infer_market).
    """
    symbol: str

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, v: str) -> str:
        """Always store symbols uppercase and trimmed. e.g. ' aapl ' → 'AAPL'"""
        return v.upper().strip()


class CompanyResponse(BaseModel):
    """What the API returns when listing watchlist companies."""
    id:           int
    symbol:       str
    name:         str
    market:       str
    currency:     Optional[str] = None
    sector:       Optional[str] = None
    in_watchlist: bool
    added_at:     datetime

    # 'from_attributes=True' lets Pydantic read from SQLAlchemy ORM objects
    # (not just plain dicts). Required when returning ORM instances.
    model_config = {"from_attributes": True}


class AddToWatchlistResponse(BaseModel):
    """What the API returns after successfully adding a stock."""
    message: str
    id:      int


class MessageResponse(BaseModel):
    """Generic {"message": "..."} response, e.g. after a delete."""
    message: str


class TickerInfoResponse(BaseModel):
    """What the API returns for an exact ticker lookup (search_ticker)."""
    symbol:             str
    name:               str
    sector:             Optional[str] = None
    currency:           Optional[str] = None
    exchange:           Optional[str] = None
    full_exchange_name: Optional[str] = None
    current_price:      Optional[float] = None


class TickerSuggestion(BaseModel):
    """One autocomplete suggestion from search_tickers()."""
    symbol:     str
    name:       Optional[str] = None
    exchange:   Optional[str] = None
    quote_type: Optional[str] = None
