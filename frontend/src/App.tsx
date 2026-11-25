/**
 * App.tsx — Shell layout (Yahoo Finance-inspired)
 * No props needed — this is the root component, so no interface required.
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar       from './components/Sidebar';
import TopBar        from './components/TopBar';
import BottomNav     from './components/BottomNav';
import MarketBar     from './components/MarketBar';
import Dashboard        from './pages/Dashboard';
import WatchlistPage    from './pages/WatchlistPage';
import ScreenerPage     from './pages/ScreenerPage';
import StockHistoryPage from './pages/StockHistoryPage';
import LoginPage        from './pages/LoginPage';
import { useTheme }     from './hooks/useTheme';
import { AuthProvider } from './context/AuthContext';

export default function App(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();

  return (
    <AuthProvider>
      <Router>
        <div className="flex min-h-screen bg-bg text-ink">

          {/* Sidebar — desktop only (lg breakpoint = 1024px+) */}
          <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 z-40">
            <Sidebar />
          </aside>

          {/* Main content — offset right by sidebar width on desktop */}
          <div className="flex-1 flex flex-col lg:pl-60 min-h-screen min-w-0">
            <TopBar theme={theme} onToggleTheme={toggleTheme} />
            <MarketBar />
            <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 overflow-y-auto">
              <Routes>
                <Route path="/"                 element={<Dashboard />} />
                <Route path="/watchlist"        element={<WatchlistPage />} />
                <Route path="/screener"         element={<ScreenerPage />} />
                <Route path="/prices/:symbol"   element={<StockHistoryPage />} />
                <Route path="/login"            element={<LoginPage />} />
              </Routes>
            </main>
          </div>

          {/* Bottom nav — mobile only */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
            <BottomNav />
          </div>

        </div>
      </Router>
    </AuthProvider>
  );
}
