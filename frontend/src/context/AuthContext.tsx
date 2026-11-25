/**
 * src/context/AuthContext.tsx — Auth session state
 *
 * Wraps Supabase's client-side auth so the rest of the app can just call
 * useAuth() instead of talking to `supabase.auth` directly everywhere.
 *
 * Guests are a first-class state here, not an error: `user`/`session` are
 * simply null until someone signs in. Nothing in the app should require
 * being signed in to render — see App.tsx, no routes are gated.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextValue {
  user:    User | null;
  session: Session | null;
  loading: boolean;
  signUpWithPassword:   (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPassword:   (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle:     () => Promise<{ error: string | null }>;
  signOut:              () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore whatever session Supabase already has persisted in localStorage.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Keep in sync with sign in / sign out / token refresh, including
    // the redirect back from Google OAuth.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUpWithPassword = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithPassword = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const value: AuthContextValue = {
    user:    session?.user ?? null,
    session,
    loading,
    signUpWithPassword,
    signInWithPassword,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}
