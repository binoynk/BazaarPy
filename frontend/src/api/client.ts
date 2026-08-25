/**
 * src/api/client.ts — Typed API client
 *
 * Uses Axios generics: API.get<ResponseType>('/path') tells TypeScript
 * exactly what shape the response data will be.
 *
 * Example:
 *   const res = await companiesAPI.getWatchlist();
 *   res.data   ← TypeScript knows this is Company[]
 *   res.data[0].symbol  ← autocomplete works, typos are caught at compile time
 */

import axios from 'axios';
import type {
  Company,
  AddToWatchlistResponse,
  TickerSearchResult,
  TickerSuggestion,
  PriceHistoryResponse,
  MarketSummaryItem,
  WatchlistScreenerResponse,
  IndexScreenerResponse,
  MarketOption,
} from '../types';

const API = axios.create({
  baseURL: '/api',
  timeout: 90_000,   // 90s — index scans with 20+ stocks can be slow
});

// ── Screener filter params (shared shape) ────────────────────────
interface ScreenerParams {
  days?:            number;
  pct_change_days?: number;
  min_pct_change?:  number;
  max_pct_change?:  number;
}

interface IndexScreenerParams extends ScreenerParams {
  limit?: number;
}

// ── Companies & Watchlist ────────────────────────────────────────
export const companiesAPI = {
  getWatchlist: () =>
    API.get<Company[]>('/companies/watchlist'),

  addToWatchlist: (symbol: string) =>
    API.post<AddToWatchlistResponse>('/companies/watchlist', { symbol }),

  removeFromWatchlist: (symbol: string) =>
    API.delete<{ message: string }>(`/companies/watchlist/${symbol}`),

  searchTicker: (query: string) =>
    API.get<TickerSearchResult>(`/companies/search/${encodeURIComponent(query)}`),

  suggestTickers: (query: string, signal?: AbortSignal) =>
    API.get<TickerSuggestion[]>(`/companies/search-suggest/${encodeURIComponent(query)}`, { signal }),
};

// ── Prices ───────────────────────────────────────────────────────
export const pricesAPI = {
  getPrices: (symbol: string, days = 60, avgDays = 10) =>
    API.get<PriceHistoryResponse>(`/prices/${symbol}`, { params: { days, avg_days: avgDays } }),

  // Preset duration (e.g. "3mo", "ytd") — avg Hi/Low spans the whole
  // returned range server-side. See DURATION_OPTIONS in StockHistoryPage.tsx.
  getPricesForPeriod: (symbol: string, period: string) =>
    API.get<PriceHistoryResponse>(`/prices/${symbol}`, { params: { period } }),

  getMarketSummary: () =>
    API.get<MarketSummaryItem[]>('/prices/market-summary'),
};

// ── Screener ─────────────────────────────────────────────────────
export const screenerAPI = {
  screenWatchlist: (params: ScreenerParams = {}) =>
    API.get<WatchlistScreenerResponse>('/screener/watchlist', { params }),

  screenIndex: (market: string, params: IndexScreenerParams = {}) =>
    API.get<IndexScreenerResponse>(`/screener/index/${market}`, { params }),

  getMarkets: () =>
    API.get<MarketOption[]>('/screener/markets'),
};
