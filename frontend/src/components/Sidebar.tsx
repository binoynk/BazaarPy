import { NavLink, useNavigate } from 'react-router-dom';
import { TrendingUp, LayoutDashboard, Star, Zap, Sparkles, type LucideIcon } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────
interface NavItem {
  to:    string;
  label: string;
  icon:  LucideIcon;   // LucideIcon is the TypeScript type for any Lucide icon component
}

// ── Data ─────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { to: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/screener',  label: 'Screener',  icon: Zap },
  { to: '/agent',     label: 'Ask Bazaar', icon: Sparkles },
];

const MARKETS: string[] = ['TSX', 'NASDAQ', 'NYSE', 'NSE', 'BSE'];

// ── Component ────────────────────────────────────────────────────
export default function Sidebar(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-surface border-r border-line">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-line">
        <TrendingUp size={20} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
        <div>
          <span className="font-bold text-emerald-500 dark:text-emerald-400 tracking-wider text-base">BAZAAR</span>
          <p className="text-[10px] text-faint font-mono leading-none mt-0.5">
            Stock Screener v2.0
          </p>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }: { isActive: boolean }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                 : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
               }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Market quick-links */}
      <div className="px-3 pb-4 border-t border-line pt-3">
        <p className="text-[10px] font-semibold text-faint uppercase tracking-wider px-3 mb-2">
          Scan Market
        </p>
        {MARKETS.map((market: string) => (
          <button
            key={market}
            onClick={() => navigate(`/screener?market=${market}&tab=index`)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg
                       text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100
                       dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <span>{market}</span>
            <span className="text-gray-300 dark:text-gray-700">→</span>
          </button>
        ))}
      </div>

    </div>
  );
}
