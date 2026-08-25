import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, Zap, Globe, BarChart2, ArrowRight, type LucideIcon } from 'lucide-react';
import { companiesAPI } from '../api/client';
import type { Company } from '../types';

export default function Dashboard(): React.JSX.Element {
  const [watchlist, setWatchlist] = useState<Company[]>([]);
  const [loading,   setLoading]   = useState<boolean>(true);

  useEffect(() => {
    companiesAPI.getWatchlist()
      .then(r => setWatchlist(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derive unique markets from the watchlist using Set
  const markets: string[] = [...new Set(watchlist.map((c: Company) => c.market))];

  return (
    <div className="space-y-6 max-w-4xl">

      <div>
        <h2 className="text-xl font-bold text-ink">Welcome to Bazaar</h2>
        <p className="text-muted text-sm mt-1">
          Automated stock screener — powered by Yahoo Finance, built in Python + React.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={BookmarkCheck} label="Watchlist"          value={loading ? '…' : String(watchlist.length)} color="emerald" />
        <StatCard icon={Globe}         label="Markets tracked"    value={loading ? '…' : String(markets.length)}   color="blue" />
        <StatCard icon={BarChart2}     label="Screener signals"   value="4"                                         color="purple" />
        <StatCard icon={Zap}           label="Exchanges supported" value="5"                                         color="amber" />
      </div>

      {/* Quick-action cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <ActionCard
          to="/watchlist"
          icon={BookmarkCheck}
          title="Manage Watchlist"
          description="Search any ticker across TSX, NASDAQ, NYSE, NSE, or BSE. Company info is fetched automatically."
          accent="emerald"
        />
        <ActionCard
          to="/screener"
          icon={Zap}
          title="Run Screener"
          description="N-day Hi/Low averages, 10/50-day moving averages, and Golden/Death Cross breakout signals."
          accent="blue"
        />
      </div>

      {/* Watchlist preview */}
      {watchlist.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink2">Your Watchlist</h3>
            <Link to="/screener"
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500
                             dark:text-emerald-400 dark:hover:text-emerald-300">
              Run Screener <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {watchlist.map((c: Company) => (
              <div key={c.symbol}
                   className="bg-surface border border-line rounded-lg p-3
                              hover:border-line2 active:border-line2 transition-colors">
                <p className="font-semibold text-ink text-sm">{c.symbol}</p>
                <p className="text-gray-500 text-xs truncate">{c.name}</p>
                <span className="text-[10px] text-faint font-mono">{c.market}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && watchlist.length === 0 && (
        <div className="bg-surface border border-dashed border-line2
                        rounded-xl p-8 text-center">
          <BookmarkCheck size={28} className="mx-auto text-faint mb-3" />
          <p className="text-muted text-sm">Your watchlist is empty.</p>
          <Link to="/watchlist"
                className="inline-block mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500
                           text-white text-sm rounded-lg transition-colors">
            Add your first stock
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

interface StatCardProps {
  icon:  LucideIcon;
  label: string;
  value: string;
  color: 'emerald' | 'blue' | 'purple' | 'amber';   // Union type — only these values allowed
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps): React.JSX.Element {
  const styles: Record<StatCardProps['color'], string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15',
    blue:    'text-blue-400 bg-blue-500/10 border-blue-500/15',
    purple:  'text-purple-400 bg-purple-500/10 border-purple-500/15',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/15',
  };
  const [textClass, bgClass, borderClass] = styles[color].split(' ');
  return (
    <div className={`bg-surface border ${borderClass} rounded-xl p-4`}>
      <div className={`inline-flex p-1.5 rounded-lg mb-2 ${bgClass}`}>
        <Icon size={14} className={textClass} />
      </div>
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

interface ActionCardProps {
  to:          string;
  icon:        LucideIcon;
  title:       string;
  description: string;
  accent:      'emerald' | 'blue';
}

function ActionCard({ to, icon: Icon, title, description, accent }: ActionCardProps): React.JSX.Element {
  const border    = accent === 'emerald'
    ? 'border-emerald-500/15 hover:border-emerald-500/35 active:border-emerald-500/50'
    : 'border-blue-500/15 hover:border-blue-500/35 active:border-blue-500/50';
  const iconColor = accent === 'emerald' ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400';

  return (
    <Link to={to}
          className={`group block bg-surface border ${border} rounded-xl p-5 transition-colors`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={iconColor} />
        <h3 className="font-semibold text-ink text-sm">{title}</h3>
        <ArrowRight size={13} className="ml-auto text-gray-300 group-hover:text-gray-500 dark:text-gray-700 dark:group-hover:text-gray-400 transition-colors" />
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </Link>
  );
}
