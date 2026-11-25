import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'signIn' | 'signUp';

export default function LoginPage(): React.JSX.Element {
  const [mode,     setMode]     = useState<Mode>('signIn');
  const [email,    setEmail]    = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading,  setLoading]  = useState<boolean>(false);
  const [error,    setError]    = useState<string>('');
  const [message,  setMessage]  = useState<string>('');

  const { signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = mode === 'signIn'
      ? await signInWithPassword(email, password)
      : await signUpWithPassword(email, password);

    setLoading(false);

    if (error) {
      setError(error);
      return;
    }

    if (mode === 'signUp') {
      setMessage('Check your email to confirm your account, then sign in.');
      setMode('signIn');
    } else {
      navigate('/');
    }
  }

  async function handleGoogle(): Promise<void> {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) setError(error);
    // On success, Supabase redirects to Google and back — nothing more to do here.
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm bg-surface border border-line rounded-xl p-6">
        <h1 className="text-lg font-semibold text-ink mb-1">
          {mode === 'signIn' ? 'Sign in' : 'Create an account'}
        </h1>
        <p className="text-sm text-ink2 mb-5">
          {mode === 'signIn'
            ? 'Sign in to save and manage your own portfolio.'
            : 'Sign up to save and manage your own portfolio.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-gray-100 dark:bg-gray-900 border border-line2
                       rounded-lg px-3 py-2 text-sm text-ink
                       placeholder-faint focus:border-emerald-500 focus:outline-none transition-colors"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-gray-100 dark:bg-gray-900 border border-line2
                       rounded-lg px-3 py-2 text-sm text-ink
                       placeholder-faint focus:border-emerald-500 focus:outline-none transition-colors"
          />

          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
          {message && <p className="text-emerald-600 dark:text-emerald-400 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60
                       text-white text-sm font-medium rounded-lg transition-colors
                       flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {mode === 'signIn' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-line" />
          <span className="text-xs text-faint">or</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full py-2 border border-line2 hover:bg-gray-100 dark:hover:bg-gray-800
                     text-ink text-sm font-medium rounded-lg transition-colors"
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(''); setMessage(''); }}
          className="w-full mt-4 text-xs text-ink2 hover:text-ink transition-colors"
        >
          {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
