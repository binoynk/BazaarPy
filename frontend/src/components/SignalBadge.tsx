// Props interface — TypeScript enforces this at every call site
interface SignalBadgeProps {
  signal: string;
}

export default function SignalBadge({ signal }: SignalBadgeProps): React.JSX.Element {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStyle(signal)}`}>
      {signal}
    </span>
  );
}

// TypeScript return type annotation — function always returns a string
function getStyle(signal: string): string {
  if (signal.includes('Golden Cross'))     return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/25';
  if (signal.includes('Death Cross'))      return 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/25';
  if (signal.includes('RSI Oversold'))     return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/25';
  if (signal.includes('RSI Overbought'))   return 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/25';
  if (signal.includes('MACD Bullish'))     return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/25';
  if (signal.includes('MACD Bearish'))     return 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/25';
  if (signal.includes('Above 200'))        return 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/25';
  if (signal.includes('Above 50'))         return 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/25';
  if (signal.includes('Above 10'))         return 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/25';
  return 'bg-gray-200/60 text-gray-600 border-gray-300/50 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600/30';
}
