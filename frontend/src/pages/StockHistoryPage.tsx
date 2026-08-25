import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { pricesAPI } from '../api/client';
import type { PriceHistoryResponse, DailyPrice } from '../types';

interface DurationOption {
  label:  string;  // shown on the chip and in stat labels, e.g. "3M"
  period: string;  // yfinance preset passed to the API, e.g. "3mo"
}

const DURATION_OPTIONS: DurationOption[] = [
  { label: '1D',  period: '1d'  },
  { label: '5D',  period: '5d'  },
  { label: '3M',  period: '3mo' },
  { label: '6M',  period: '6mo' },
  { label: '1Y',  period: '1y'  },
  { label: '5Y',  period: '5y'  },
  { label: 'YTD', period: 'ytd' },
];

const DEFAULT_PERIOD = '3mo';

export default function StockHistoryPage(): React.JSX.Element {
  const { symbol } = useParams<{ symbol: string }>();
  const [period,  setPeriod]  = useState<string>(DEFAULT_PERIOD);
  const [data,    setData]    = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error,   setError]   = useState<string>('');

  const durationLabel = DURATION_OPTIONS.find(d => d.period === period)?.label ?? period;

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError('');
    pricesAPI.getPricesForPeriod(symbol, period)
      .then(r => setData(r.data))
      .catch(() => setError(`Could not load price history for '${symbol}'.`))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  // Most recent day first — easier to scan than oldest-first
  const rows: DailyPrice[] = data ? [...data.prices].reverse() : [];
  const latest  = rows[0];
  const oldest  = data?.prices[0];
  const periodChange = latest && oldest
    ? ((latest.close - oldest.close) / oldest.close) * 100
    : null;

  return (
    <div className="space-y-5 max-w-4xl">

      <div>
        <Link to="/watchlist"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-2">
          <ArrowLeft size={12} /> Back to Watchlist
        </Link>
        <h2 className="text-xl font-bold text-ink">{symbol}</h2>
        <p className="text-muted text-sm mt-1">
          Historical daily prices, powered by Yahoo Finance.
        </p>
      </div>

      {/* Duration selector */}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Duration">
        {DURATION_OPTIONS.map(d => (
          <button
            key={d.period}
            type="button"
            role="radio"
            aria-checked={period === d.period}
            onClick={() => setPeriod(d.period)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${period === d.period
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'text-muted border-line hover:text-ink hover:border-line2 active:text-ink active:border-line2'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center p-12">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-500/10 border border-red-500/20
                        rounded-xl text-red-600 dark:text-red-300 text-sm">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Current Price" value={latest ? latest.close.toFixed(2) : '—'} />
            <Stat
              label={`Avg High (${durationLabel})`}
              value={data.avg_hi.toFixed(2)}
              accent="emerald"
            />
            <Stat
              label={`Avg Low (${durationLabel})`}
              value={data.avg_low.toFixed(2)}
              accent="red"
            />
            <Stat
              label={`${durationLabel} Change`}
              value={periodChange != null ? `${periodChange >= 0 ? '+' : ''}${periodChange.toFixed(2)}%` : '—'}
              accent={periodChange != null && periodChange >= 0 ? 'emerald' : 'red'}
              icon={periodChange != null ? (periodChange >= 0 ? TrendingUp : TrendingDown) : undefined}
            />
          </div>

          {/* OHLCV table */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-semibold text-ink text-sm">
                Daily Prices
                <span className="ml-2 font-normal text-muted">({rows.length} days)</span>
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-xs text-faint border-b border-line">
                    <th className="px-3 sm:px-5 py-2 font-medium whitespace-nowrap sticky left-0 bg-surface z-10">Date</th>
                    <th className="px-2 sm:px-3 py-2 font-medium text-right whitespace-nowrap">Open</th>
                    <th className="px-2 sm:px-3 py-2 font-medium text-right whitespace-nowrap">High</th>
                    <th className="px-2 sm:px-3 py-2 font-medium text-right whitespace-nowrap">Low</th>
                    <th className="px-2 sm:px-3 py-2 font-medium text-right whitespace-nowrap">Close</th>
                    <th className="px-3 sm:px-5 py-2 font-medium text-right whitespace-nowrap">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((p: DailyPrice) => (
                    <tr key={p.date} className="group hover:bg-surface2/60 transition-colors">
                      <td className="px-3 sm:px-5 py-2 text-ink2 font-mono text-xs whitespace-nowrap sticky left-0 bg-surface group-hover:bg-surface2/60 transition-colors">{p.date}</td>
                      <td className="px-2 sm:px-3 py-2 text-right font-mono text-xs text-ink2 whitespace-nowrap">{p.open?.toFixed(2) ?? '—'}</td>
                      <td className="px-2 sm:px-3 py-2 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{p.hi.toFixed(2)}</td>
                      <td className="px-2 sm:px-3 py-2 text-right font-mono text-xs text-red-600 dark:text-red-400 whitespace-nowrap">{p.low.toFixed(2)}</td>
                      <td className="px-2 sm:px-3 py-2 text-right font-mono text-xs font-semibold text-ink whitespace-nowrap">{p.close.toFixed(2)}</td>
                      <td className="px-3 sm:px-5 py-2 text-right font-mono text-xs text-muted whitespace-nowrap">{p.volume?.toLocaleString() ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-component ────────────────────────────────────────────────
interface StatProps {
  label:  string;
  value:  string;
  accent?: 'emerald' | 'red';
  icon?:  LucideIcon;
}

function Stat({ label, value, accent, icon: Icon }: StatProps): React.JSX.Element {
  const color = accent === 'emerald'
    ? 'text-emerald-600 dark:text-emerald-400'
    : accent === 'red'
      ? 'text-red-600 dark:text-red-400'
      : 'text-ink';

  return (
    <div className="bg-surface border border-line rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono flex items-center gap-1.5 ${color}`}>
        {Icon && <Icon size={15} />}
        {value}
      </p>
    </div>
  );
}
