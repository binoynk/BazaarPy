import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { companiesAPI } from '../api/client';
import type { TickerSuggestion } from '../types';

const DEBOUNCE_MS = 350;
const MIN_CHARS   = 2;

interface TickerAutocompleteProps {
  value:       string;
  onChange:    (value: string) => void;
  onSelect:    (suggestion: TickerSuggestion) => void;
  placeholder?: string;
  className?:  string;
}

// Debounced ticker/company-name search box. Fires one request ~350ms
// after the user stops typing (not per-keystroke) to stay well clear
// of Yahoo's rate limits — see backend/services/yfinance_service.py.
export default function TickerAutocomplete({
  value, onChange, onSelect, placeholder, className,
}: TickerAutocompleteProps): React.JSX.Element {
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [open,        setOpen]        = useState<boolean>(false);
  const [loading,     setLoading]     = useState<boolean>(false);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    const query = value.trim();
    if (query.length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      companiesAPI.suggestTickers(query, controller.signal)
        .then(r => {
          setSuggestions(r.data);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(s: TickerSuggestion): void {
    onSelect(s);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
      <input
        type="text"
        value={value}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.toUpperCase())}
        placeholder={placeholder}
        className={className ?? `w-full bg-surface2 border border-line2
                   text-ink text-sm rounded-lg
                   pl-9 pr-3 py-2.5 placeholder-faint
                   focus:border-emerald-500 focus:outline-none`}
      />

      {open && (loading || suggestions.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-line
                        rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50">
          {loading && (
            <p className="px-3 py-2 text-xs text-muted">Searching…</p>
          )}
          {!loading && suggestions.map((s: TickerSuggestion) => (
            <button
              key={s.symbol}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left
                         hover:bg-surface2 active:bg-surface2 transition-colors"
            >
              <div className="min-w-0">
                <span className="font-semibold text-ink text-sm">{s.symbol}</span>
                {s.name && <span className="ml-2 text-xs text-muted truncate">{s.name}</span>}
              </div>
              {s.exchange && (
                <span className="text-[10px] text-faint font-mono flex-shrink-0">{s.exchange}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
