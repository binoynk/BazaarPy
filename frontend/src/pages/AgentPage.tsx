/**
 * AgentPage.tsx — chat UI for the optional LLM agent (POST /api/agent/ask)
 *
 * This only works when the backend has AGENT_ENABLED=true and a model
 * server (e.g. Ollama) reachable at AGENT_BASE_URL — see docs/SETUP.md.
 * If the feature is off, the backend 404s and we show a friendly error.
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { agentAPI } from '../api/client';
import type { AgentChatMessage } from '../types';

const EXAMPLE_QUESTIONS: string[] = [
  'Why is TSLA flagged Death Cross?',
  'What is the RSI for AAPL?',
  'Give me the technical position of SHOP.TO',
];

export default function AgentPage(): React.JSX.Element {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [question,  setQuestion]  = useState<string>('');
  const [asking,    setAsking]    = useState<boolean>(false);
  const [error,     setError]     = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, asking]);

  async function handleAsk(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setAsking(true);
    setError(null);

    try {
      const r = await agentAPI.ask(q);
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: r.data.answer,
        trace:   r.data.trace,
      }]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail  = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(
        status === 404
          ? 'The agent is disabled on the backend. Set AGENT_ENABLED=true in backend/.env and restart it.'
          : detail ?? 'Could not reach the agent. Is the model server (e.g. Ollama) running?'
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl flex flex-col h-[calc(100vh-11rem)] lg:h-[calc(100vh-7rem)]">

      <div>
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          <Sparkles size={18} className="text-emerald-500 dark:text-emerald-400" />
          Ask Bazaar
        </h2>
        <p className="text-muted text-sm mt-1">
          Ask about a stock's technical position in plain English. Experimental — information only, not financial advice.
        </p>
      </div>

      {/* Chat history */}
      <div className="flex-1 bg-surface border border-line rounded-xl p-4 sm:p-5 overflow-y-auto space-y-4">
        {messages.length === 0 && !asking && (
          <div className="text-center py-10 text-faint space-y-3">
            <p className="text-sm">Try asking:</p>
            <div className="flex flex-col items-center gap-2">
              {EXAMPLE_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-line text-muted
                             hover:text-ink hover:border-line2 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}

        {asking && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" />
            Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
                         bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20">
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleAsk} className="flex gap-3">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="e.g. Why is AAPL flagged Golden Cross?"
          disabled={asking}
          className="flex-1 px-4 py-2.5 rounded-lg border border-line bg-bg text-ink text-sm
                     placeholder:text-faint focus:outline-none focus:border-emerald-500/50"
        />
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5
                     bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 dark:disabled:bg-gray-700
                     disabled:text-gray-400 dark:disabled:text-gray-500 text-white text-sm font-medium
                     rounded-lg transition-colors"
        >
          {asking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}

// ── Chat bubble (+ collapsible tool trace for assistant turns) ───
function ChatBubble({ message }: { message: AgentChatMessage }): React.JSX.Element {
  const [showTrace, setShowTrace] = useState<boolean>(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap
        ${isUser
          ? 'bg-emerald-600 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-ink'}`}>
        {message.content}

        {!isUser && message.trace && message.trace.length > 0 && (
          <div className="mt-2 pt-2 border-t border-line/50">
            <button
              onClick={() => setShowTrace(v => !v)}
              className="flex items-center gap-1 text-[11px] text-faint hover:text-muted"
            >
              {showTrace ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {message.trace.length} tool call{message.trace.length > 1 ? 's' : ''}
            </button>
            {showTrace && (
              <pre className="mt-1.5 text-[11px] text-faint bg-bg/50 rounded-lg p-2 overflow-x-auto">
                {JSON.stringify(message.trace, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
