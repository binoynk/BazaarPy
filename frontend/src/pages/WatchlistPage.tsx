import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { companiesAPI } from '../api/client';
import type { Company, Toast } from '../types';
import TickerAutocomplete from '../components/TickerAutocomplete';

const MARKET_FILTERS: string[] = ['All', 'BSE', 'NSE', 'TSX', 'NYSE', 'NASDAQ'];

export default function WatchlistPage(): React.JSX.Element {
  const [watchlist,    setWatchlist]    = useState<Company[]>([]);
  const [symbol,       setSymbol]       = useState<string>('');
  const [adding,       setAdding]       = useState<boolean>(false);
  const [loadingList,  setLoadingList]  = useState<boolean>(true);
  const [toast,        setToast]        = useState<Toast | null>(null);
  const [marketFilter, setMarketFilter] = useState<string>('All');

  const visibleWatchlist = marketFilter === 'All'
    ? watchlist
    : watchlist.filter((c: Company) => c.market === marketFilter);

  useEffect(() => { fetchWatchlist(); }, []);

  async function fetchWatchlist(): Promise<void> {
    try {
      const r = await companiesAPI.getWatchlist();
      setWatchlist(r.data);
    } catch {
      showToast('error', 'Could not load watchlist. Is the backend running?');
    } finally {
      setLoadingList(false);
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setAdding(true);
    try {
      await companiesAPI.addToWatchlist(sym);
      showToast('success', `${sym} added to watchlist`);
      setSymbol('');
      await fetchWatchlist();
    } catch (err: unknown) {
      // TypeScript: we must narrow the 'unknown' error type before accessing properties
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      showToast('error', detail ?? `Failed to add ${sym}`);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(sym: string): Promise<void> {
    try {
      await companiesAPI.removeFromWatchlist(sym);
      setWatchlist(prev => prev.filter((c: Company) => c.symbol !== sym));
      showToast('success', `${sym} removed`);
    } catch {
      showToast('error', `Could not remove ${sym}`);
    }
  }

  function showToast(type: Toast['type'], text: string): void {
    setToast({ type, text });
    // Clear after 4 seconds
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-5 max-w-3xl">

      <div>
        <h2 className="text-xl font-bold text-ink">Watchlist</h2>
        <p className="text-muted text-sm mt-1">
          Add stocks by ticker symbol. Company info is fetched automatically from Yahoo Finance.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-surface border border-line rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Add Stock
        </p>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">

          <div className="relative flex-1">
            <TickerAutocomplete
              value={symbol}
              onChange={setSymbol}
              onSelect={s => setSymbol(s.symbol)}
              placeholder="Search by ticker or company name… AAPL, Reliance, SHOP.TO"
            />
          </div>

          <button
            type="submit"
            disabled={adding || !symbol.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5
                       bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 dark:disabled:bg-gray-700
                       disabled:text-gray-400 dark:disabled:text-gray-500 text-white text-sm font-medium
                       rounded-lg transition-colors"
          >
            {adding
              ? <><Loader2 size={14} className="animate-spin" /> Adding…</>
              : <><Plus size={14} /> Add</>}
          </button>
        </form>
        <p className="text-xs text-faint mt-2.5">
          💡 The market (NASDAQ, NYSE, TSX, NSE, BSE) is detected automatically — pick a suggestion,
          or type a suffix yourself if you want a specific dual-listed exchange (e.g. .TO, .NS, .BO).
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
          ${toast.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20'
            : 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20'}`}>
          {toast.type === 'success'
            ? <CheckCircle size={14} />
            : <AlertCircle size={14} />}
          {toast.text}
        </div>
      )}

      {/* Watchlist table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-semibold text-ink text-sm">
            Your Stocks
            <span className="ml-2 font-normal text-gray-500">({visibleWatchlist.length})</span>
          </h3>

          {/* Market filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {MARKET_FILTERS.map((m: string) => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                  ${marketFilter === m
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'text-muted border-line hover:text-ink hover:border-line2 active:text-ink active:border-line2'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {loadingList ? (
          <div className="flex justify-center p-12">
            <Loader2 size={20} className="animate-spin text-gray-500" />
          </div>
        ) : visibleWatchlist.length === 0 ? (
          <div className="text-center py-14 text-faint">
            <Search size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {watchlist.length === 0 ? 'No stocks yet. Add one above.' : `No stocks in ${marketFilter}.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visibleWatchlist.map((co: Company) => (
              <li key={co.symbol}
                  className="flex items-center justify-between px-5 py-3.5
                             hover:bg-gray-100/60 active:bg-gray-100/60 dark:hover:bg-gray-800/40 dark:active:bg-gray-800/40 transition-colors">
                <Link to={`/prices/${co.symbol}`} className="flex items-center gap-4 min-w-0 group">
                  <div className="flex-shrink-0">
                    <span className="font-semibold text-ink text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {co.symbol}
                    </span>
                    <span className="ml-1.5 text-[10px] text-faint font-mono">{co.market}</span>
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <p className="text-sm text-muted truncate">{co.name}</p>
                    {co.sector && (
                      <p className="text-xs text-faint truncate">{co.sector}</p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {co.currency && (
                    <span className="text-xs text-faint hidden sm:block">{co.currency}</span>
                  )}
                  <button
                    onClick={() => handleRemove(co.symbol)}
                    className="p-2.5 rounded-lg text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400
                               hover:bg-red-500/10 active:bg-red-500/15 active:text-red-500 dark:active:text-red-400 transition-colors"
                    title={`Remove ${co.symbol}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
