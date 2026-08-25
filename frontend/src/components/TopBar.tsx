import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, Sun, Moon } from 'lucide-react';
import { companiesAPI } from '../api/client';
import type { TickerSearchResult } from '../types';

// Map URL paths to page titles
const PAGE_TITLES: Record<string, string> = {
  '/':          'Dashboard',
  '/watchlist': 'Watchlist',
  '/screener':  'Screener',
};

interface TopBarProps {
  theme:         'light' | 'dark';
  onToggleTheme: () => void;
}

export default function TopBar({ theme, onToggleTheme }: TopBarProps): React.JSX.Element {
  // TypeScript typed state:
  //   useState<string>('')        → state is always a string
  //   useState<TickerSearchResult | null>(null) → state is a typed object or null
  const [query,   setQuery]   = useState<string>('');
  const [result,  setResult]  = useState<TickerSearchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error,   setError]   = useState<string>('');

  const location = useLocation();
  const navigate = useNavigate();
  const title    = PAGE_TITLES[location.pathname] ?? 'Bazaar';

  // React.FormEvent<HTMLFormElement> is the TypeScript type for a form submit event
  const handleSearch = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await companiesAPI.searchTicker(query.trim());
      setResult(res.data);
    } catch {
      setError(`'${query.toUpperCase()}' not found. Check the symbol and suffix.`);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = (): void => {
    setQuery('');
    setResult(null);
    setError('');
  };

  const goToWatchlist = (): void => {
    clearSearch();
    navigate('/watchlist');
  };

  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur
                       border-b border-line">
      <div className="flex items-center gap-4 px-4 sm:px-6 h-14">

        {/* Page title */}
        <h1 className="hidden sm:block text-sm font-semibold text-ink2 min-w-[90px]">
          {title}
        </h1>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setQuery(e.target.value.toUpperCase());
              setResult(null);
              setError('');
            }}
            placeholder="Search ticker… AAPL, SHOP.TO, RELIANCE.NS"
            className="w-full bg-gray-100 dark:bg-gray-900 border border-line2
                       rounded-lg pl-8 pr-8 py-2 text-sm text-ink
                       placeholder-faint
                       focus:border-emerald-500 focus:outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-3 -m-3 text-gray-400 hover:text-gray-700
                         active:text-gray-800 dark:text-gray-600 dark:hover:text-gray-300 dark:active:text-gray-200"
            >
              <X size={13} />
            </button>
          )}
        </form>

        {loading && <span className="text-xs text-gray-500 animate-pulse">Searching…</span>}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100
                     dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Search result dropdown */}
        {(result ?? error) && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 w-80 max-w-[calc(100vw-2rem)]
                          bg-surface border border-gray-200 dark:border-gray-700
                          rounded-xl shadow-2xl p-4 z-50">
            {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            {result && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-ink">{result.symbol}</span>
                  <span className="text-xs text-gray-500">{result.exchange}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{result.name}</p>
                <button
                  onClick={goToWatchlist}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500
                             text-white text-sm rounded-lg transition-colors"
                >
                  Add to Watchlist →
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
}
