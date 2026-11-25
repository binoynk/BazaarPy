/**
 * src/types/index.ts — Shared TypeScript type definitions
 *
 * These interfaces mirror the Pydantic models in the FastAPI backend.
 * Keeping them in one place means:
 *   - Every component imports from '../types' (one source of truth)
 *   - If the API response shape changes, you update it here only
 *
 * TypeScript key concept:
 *   'interface' describes the SHAPE of an object.
 *   'string | null' means "string OR null" (union type).
 *   'field?: string' means the field is optional (may be undefined).
 *   These are both different: null means explicitly absent; undefined means not set.
 */

export interface AgentAskResponse {
  answer: string;
  steps:  number;
  trace:  { step: number; tool: string; arguments: string; result: string }[];
}


// ── Watchlist ────────────────────────────────────────────────────

/** A company stored in PostgreSQL — mirrors CompanyResponse in backend */
export interface Company {
  id:           number;
  symbol:       string;
  name:         string;
  market:       string;
  currency?:    string;
  sector?:      string;
  in_watchlist: boolean;
  added_at:     string;   // ISO 8601 datetime string from PostgreSQL
}

/** Request body for adding a stock — mirrors CompanyCreate in backend */
export interface CompanyCreate {
  symbol: string;
  market: string;
}

/** Response from POST /api/companies/watchlist */
export interface AddToWatchlistResponse {
  message: string;
  id:      number;
}

// ── Prices ───────────────────────────────────────────────────────

/** One day's Open/High/Low/Close/Volume data */
export interface DailyPrice {
  date:    string;
  open?:   number;
  hi:      number;
  low:     number;
  close:   number;
  volume?: number;
}

/** Response from GET /api/prices/{symbol} */
export interface PriceHistoryResponse {
  symbol:         string;
  days_requested: number | null;
  days_returned:  number;
  avg_days:       number;
  avg_hi:         number;
  avg_low:        number;
  period:         string | null;
  prices:         DailyPrice[];
}

// ── Screener ─────────────────────────────────────────────────────

/**
 * Full screener result for one stock.
 * Mirrors ScreenerResult Pydantic model in backend/models/price.py
 */
export interface MACDResult {
  macd:      number;
  signal:    number;
  histogram: number;
}

export interface ScreenerResult {
  symbol:        string;
  name:          string;
  market:        string;
  currency?:     string;
  current_price: number;
  avg_hi:        number;    // N-day average High (original Bazaar feature)
  avg_low:       number;    // N-day average Low
  ma_10?:        number;    // 10-day Simple Moving Average
  ma_50?:        number;    // 50-day Simple Moving Average
  ma_200?:       number;    // 200-day Simple Moving Average
  rsi?:          number;    // 14-day Relative Strength Index (0-100)
  macd?:         MACDResult;
  pct_change?:   number;    // % change over M days
  signals:       string[];  // e.g. ["Golden Cross 🟢", "Above 50-day MA"]
}

/** Response from GET /api/screener/watchlist */
export interface WatchlistScreenerResponse {
  count:    number;
  results:  ScreenerResult[];
  message?: string;
}

/** Response from GET /api/screener/index/{market} */
export interface IndexScreenerResponse {
  market:      string;
  market_name: string;
  scanned:     number;
  returned:    number;
  results:     ScreenerResult[];
}

/** One item in the market selector dropdown */
export interface MarketOption {
  key:  string;   // e.g. "NASDAQ"
  name: string;   // e.g. "NASDAQ Composite"
}

// ── Market Summary Bar ───────────────────────────────────────────

/** One index in the horizontal market summary strip */
export interface MarketSummaryItem {
  market:      string;   // e.g. "TSX"
  name:        string;   // e.g. "TSX Composite"
  symbol:      string;   // e.g. "^GSPTSE"
  price:       number;
  change:      number;
  pct_change:  number;
  is_positive: boolean;
}

// ── Search ───────────────────────────────────────────────────────

/** Response from GET /api/companies/search/{query} */
export interface TickerSearchResult {
  symbol:         string;
  name:           string;
  sector?:        string;
  currency?:      string;
  exchange?:      string;
  current_price?: number;
}

/** One item in GET /api/companies/search-suggest/{query} */
export interface TickerSuggestion {
  symbol:     string;
  name?:      string;
  exchange?:  string;
  quote_type?: string;
}

/** One tool call the agent made — mirrors a trace entry in POST /api/agent/ask */
export interface AgentTraceStep {
  step:      number;
  tool:      string;
  arguments: string;
  result:    string;
}

/** Response from POST /api/agent/ask — mirrors AskResponse in backend/agent/router.py */
export interface AgentAskResponse {
  answer: string;
  steps:  number;
  trace:  AgentTraceStep[];
}

/** One turn in the on-page chat history (local UI state — not from API) */
export interface AgentChatMessage {
  role:    'user' | 'assistant';
  content: string;
  trace?:  AgentTraceStep[];
}

// ── UI-only types ────────────────────────────────────────────────

/** Toast notification (local UI state — not from API) */
export interface Toast {
  type: 'success' | 'error';   // Union type: only these two string values allowed
  text: string;
}

/** Screener filter form state */
export interface ScreenerFilters {
  days:            number;
  pct_change_days: number;
  min_pct_change:  string;   // Kept as string for controlled <input> — parsed before API call
  max_pct_change:  string;
}
