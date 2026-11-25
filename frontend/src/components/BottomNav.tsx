import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Star, Zap, Sparkles, type LucideIcon } from 'lucide-react';

interface TabItem {
  to:    string;
  label: string;
  icon:  LucideIcon;
}

const TABS: TabItem[] = [
  { to: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/screener',  label: 'Screener',  icon: Zap },
  { to: '/agent',     label: 'Agent',     icon: Sparkles },
];

export default function BottomNav(): React.JSX.Element {
  return (
    <nav className="bg-surface/95 backdrop-blur border-t border-line
                    flex items-center justify-around px-2 pt-2 pb-4">
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }: { isActive: boolean }) =>
            `flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors
             ${isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-500'}`
          }
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
