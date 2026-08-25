import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { pricesAPI } from '../api/client';
import type { MarketSummaryItem } from '../types';

export default function MarketBar(): React.JSX.Element | null {
  // TypeScript: state is an array of MarketSummaryItem objects
  const [indices, setIndices] = useState<MarketSummaryItem[]>([]);

  useEffect(() => {
    const fetchSummary = (): void => {
      pricesAPI.getMarketSummary()
        .then(res => setIndices(res.data))
        .catch(() => {});  // Silently fail — market bar is non-critical UI
    };

    fetchSummary();
    // Refresh every 60s — frequent enough to feel live, infrequent
    // enough to stay well clear of Yahoo's rate limits.
    const interval = setInterval(fetchSummary, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Return null (render nothing) until data loads
  if (indices.length === 0) return null;

  return (
    <div className="bg-surface border-b border-line px-4 sm:px-6">
      <div className="flex items-center gap-6 overflow-x-auto py-2">
        {indices.map((idx: MarketSummaryItem) => (
          <IndexItem key={idx.market} {...idx} />
        ))}
      </div>
    </div>
  );
}

// ── Sub-component with explicit prop type ────────────────────────
// Using 'Pick' to extract only the fields this component needs
type IndexItemProps = Pick<
  MarketSummaryItem,
  'name' | 'price' | 'pct_change' | 'is_positive'
>;

function IndexItem({ name, price, pct_change, is_positive }: IndexItemProps): React.JSX.Element {
  const color = is_positive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
  const Icon  = is_positive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="text-xs text-muted font-medium">{name}</span>
      <span className="text-xs text-gray-700 dark:text-gray-200 font-mono">{price.toLocaleString()}</span>
      <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
        <Icon size={11} />
        {is_positive ? '+' : ''}{pct_change}%
      </span>
    </div>
  );
}
