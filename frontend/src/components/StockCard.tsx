import { TrendingUp, TrendingDown } from 'lucide-react';
import SignalBadge from './SignalBadge';
import type { ScreenerResult } from '../types';

// ── Types ────────────────────────────────────────────────────────
interface StockCardProps {
  stock: ScreenerResult;
}

interface MetricProps {
  label:           string;
  value:           string;
  highlight?:      boolean;   // optional prop — defaults to false
  valueClassName?: string;    // override text color, e.g. for RSI/MACD extremes
}

// Currency symbol lookup
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', CAD: 'C$', INR: '₹', GBP: '£', EUR: '€',
};

// ── Main component ───────────────────────────────────────────────
export default function StockCard({ stock }: StockCardProps): React.JSX.Element {
  const {
    symbol, name, market, currency,
    current_price, avg_hi, avg_low,
    ma_10, ma_50, ma_200, rsi, macd, pct_change, signals,
  } = stock;

  const isUp = (pct_change ?? 0) >= 0;
  const cur  = currency ? (CURRENCY_SYMBOLS[currency] ?? '') : '';

  // Helper: format a nullable number as a currency string
  const fmt = (n: number | undefined): string =>
    n != null ? `${cur}${n.toFixed(2)}` : '—';

  const rsiColor = rsi == null ? ''
    : rsi > 70 ? 'text-red-500 dark:text-red-400'
    : rsi < 30 ? 'text-emerald-500 dark:text-emerald-400'
    : undefined;

  const macdColor = macd == null ? ''
    : macd.histogram >= 0 ? 'text-emerald-500 dark:text-emerald-400'
    : 'text-red-500 dark:text-red-400';

  return (
    <div className="bg-surface border border-line rounded-xl p-4
                    hover:border-line2 active:border-line2 transition-colors flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ink text-base">{symbol}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-surface2 text-muted
                             rounded font-mono border border-gray-200 dark:border-gray-700">
              {market}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5 truncate">{name}</p>
        </div>

        {/* % Change */}
        {pct_change != null && (
          <div className={`flex items-center gap-1 text-sm font-semibold flex-shrink-0
            ${isUp ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {isUp ? '+' : ''}{pct_change}%
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-1.5">
        <Metric label="Price"    value={fmt(current_price)} highlight />
        <Metric label="Avg Hi"   value={fmt(avg_hi)} />
        <Metric label="Avg Low"  value={fmt(avg_low)} />
        <Metric label="MA 10"    value={fmt(ma_10)} />
        <Metric label="MA 50"    value={fmt(ma_50)} />
        <Metric label="MA 200"   value={fmt(ma_200)} />
        <Metric label="RSI (14)" value={rsi != null ? rsi.toFixed(1) : '—'} valueClassName={rsiColor} />
        <Metric label="MACD"     value={macd != null ? macd.histogram.toFixed(2) : '—'} valueClassName={macdColor} />
        {currency && <Metric label="Currency" value={currency} />}
      </div>

      {/* Signals */}
      {signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-line">
          {signals.map((s: string, i: number) => (
            <SignalBadge key={i} signal={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-component ────────────────────────────────────────────────
function Metric({ label, value, highlight = false, valueClassName }: MetricProps): React.JSX.Element {
  return (
    <div className="bg-surface2/60 rounded-lg p-2">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={`text-xs font-semibold font-mono truncate
        ${valueClassName || (highlight ? 'text-ink' : 'text-ink2')}`}>
        {value}
      </p>
    </div>
  );
}
