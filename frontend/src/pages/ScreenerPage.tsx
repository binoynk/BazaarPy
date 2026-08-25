import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookmarkCheck, Globe, Play, Loader2,
  AlertCircle, SlidersHorizontal, ChevronDown, ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { screenerAPI } from '../api/client';
import StockCard from '../components/StockCard';
import type { ScreenerResult, MarketOption, ScreenerFilters } from '../types';

// ── Types ────────────────────────────────────────────────────────
type TabKey = 'watchlist' | 'index';

interface Tab {
  key:   TabKey;
  label: string;
  icon:  LucideIcon;
}

interface ScreenerMeta {
  count:    number;
  scanned?: number;
}

interface FilterInputProps {
  label:      string;
  value:      string | number;
  onChange:   (val: string) => void;
  min?:       number;
  max?:       number;
  placeholder?: string;
}

// ── Constants ────────────────────────────────────────────────────
const TABS: Tab[] = [
  { key: 'watchlist', label: 'My Watchlist', icon: BookmarkCheck },
  { key: 'index',     label: 'Scan Index',   icon: Globe },
];

const DEFAULT_FILTERS: ScreenerFilters = {
  days:            10,
  pct_change_days: 30,
  min_pct_change:  '',
  max_pct_change:  '',
};

// ── Page component ───────────────────────────────────────────────
export default function ScreenerPage(): React.JSX.Element {
  const [searchParams]                      = useSearchParams();
  const [tab,          setTab]              = useState<TabKey>(
    (searchParams.get('tab') as TabKey) ?? 'watchlist'
  );
  const [markets,      setMarkets]          = useState<MarketOption[]>([]);
  const [selMarket,    setSelMarket]        = useState<string>(
    searchParams.get('market') ?? 'NASDAQ'
  );
  const [scanLimit,    setScanLimit]        = useState<number>(20);
  const [filters,      setFilters]          = useState<ScreenerFilters>(DEFAULT_FILTERS);
  const [showFilters,  setShowFilters]      = useState<boolean>(true);
  const [results,      setResults]          = useState<ScreenerResult[]>([]);
  const [meta,         setMeta]             = useState<ScreenerMeta | null>(null);
  const [loading,      setLoading]          = useState<boolean>(false);
  const [error,        setError]            = useState<string>('');

  useEffect(() => {
    screenerAPI.getMarkets()
      .then(r => setMarkets(r.data))
      .catch(() => {});
  }, []);

  function handleTabChange(key: TabKey): void {
    setTab(key);
    setResults([]);
    setMeta(null);
    setError('');
  }

  // Helper to update one filter field at a time
  function updateFilter(key: keyof ScreenerFilters, value: string): void {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  async function runScreener(): Promise<void> {
    setLoading(true);
    setError('');
    setResults([]);
    setMeta(null);

    // Build params — omit empty optional strings
    const params = {
      days:            filters.days,
      pct_change_days: filters.pct_change_days,
      ...(filters.min_pct_change !== '' && { min_pct_change: Number(filters.min_pct_change) }),
      ...(filters.max_pct_change !== '' && { max_pct_change: Number(filters.max_pct_change) }),
    };

    try {
      if (tab === 'watchlist') {
        const res = await screenerAPI.screenWatchlist(params);
        setResults(res.data.results);
        setMeta({ count: res.data.count });
      } else {
        const res = await screenerAPI.screenIndex(selMarket, { ...params, limit: scanLimit });
        setResults(res.data.results);
        setMeta({ count: res.data.returned, scanned: res.data.scanned });
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } }; message?: string })
        ?.response?.data?.detail;
      setError(detail ?? 'Screener failed. Check the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">

      <div>
        <h2 className="text-xl font-bold text-ink">Screener</h2>
        <p className="text-muted text-sm mt-1">
          N-day Hi/Low averages · 10/50-day MAs · Breakout signals · % change filters
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-line rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === key
                ? 'bg-emerald-600 text-white shadow'
                : 'text-gray-500 hover:text-gray-900 active:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 dark:active:text-gray-200'}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Index options */}
      {tab === 'index' && (
        <div className="bg-surface border border-line rounded-xl p-4
                        flex flex-col sm:flex-row gap-4 items-start">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Market Index</label>
            <select
              value={selMarket}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelMarket(e.target.value)}
              className="bg-surface2 border border-line2
                         text-ink text-sm rounded-lg
                         px-3 py-2 focus:border-emerald-500 focus:outline-none"
            >
              {markets.map((m: MarketOption) => (
                <option key={m.key} value={m.key}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Symbols to scan (max 50)</label>
            <input
              type="number"
              min={5} max={50}
              value={scanLimit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setScanLimit(Number(e.target.value))
              }
              className="w-24 bg-surface2 border border-line2
                         text-ink text-sm rounded-lg
                         px-3 py-2 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end pb-2">
            <p className="text-xs text-faint">⏱ ~{Math.round(scanLimit * 2.5)}s estimated</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex items-center justify-between w-full px-5 py-3
                     text-sm font-medium text-gray-500 hover:text-gray-900 active:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 dark:active:text-gray-200"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={14} />
            Filters
          </span>
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showFilters && (
          <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-4
                          border-t border-line pt-4">
            <FilterInput
              label="Avg Hi/Low days"
              value={filters.days}
              onChange={v => updateFilter('days', v)}
              min={5} max={100}
            />
            <FilterInput
              label="% Change days"
              value={filters.pct_change_days}
              onChange={v => updateFilter('pct_change_days', v)}
              min={5} max={365}
            />
            <FilterInput
              label="Min % change"
              value={filters.min_pct_change}
              onChange={v => updateFilter('min_pct_change', v)}
              placeholder="e.g. 5"
            />
            <FilterInput
              label="Max % change"
              value={filters.max_pct_change}
              onChange={v => updateFilter('max_pct_change', v)}
              placeholder="e.g. 50"
            />
          </div>
        )}
      </div>

      {/* Run button */}
      <button
        onClick={runScreener}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500
                   disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500
                   text-white font-semibold text-sm rounded-xl transition-colors"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Running… (fetching live data)</>
          : <><Play size={15} /> Run Screener</>}
      </button>

      {loading && (
        <p className="text-xs text-faint -mt-3">
          Each symbol makes a live request to Yahoo Finance — allow 30–90s for larger scans.
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-500/10 border border-red-500/20
                        rounded-xl text-red-600 dark:text-red-300 text-sm">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Meta */}
      {meta && !loading && (
        <p className="text-xs text-gray-500">
          {meta.count} result{meta.count !== 1 ? 's' : ''}
          {meta.scanned !== undefined ? ` from ${meta.scanned} symbols scanned` : ''}
        </p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((stock: ScreenerResult) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && meta && results.length === 0 && (
        <div className="text-center py-14 text-faint">
          <Globe size={28} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No results matched your filters.</p>
          <p className="text-xs mt-1">Try removing the Min % Change filter or scanning more symbols.</p>
        </div>
      )}
    </div>
  );
}

// ── FilterInput sub-component ────────────────────────────────────
function FilterInput({ label, value, onChange, min, max, placeholder }: FilterInputProps): React.JSX.Element {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="w-full bg-surface2 border border-line2
                   text-ink text-sm rounded-lg
                   px-3 py-2 focus:border-emerald-500 focus:outline-none"
      />
    </div>
  );
}
