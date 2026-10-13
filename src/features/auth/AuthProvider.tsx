import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { configurationError, requireSupabase, supabase } from '../../lib/supabase';
import { AuthContext } from './authContext';
import { resolveUser, type AppUser, type LoginPayload } from './authService';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(configurationError);
  const generation = useRef(0);
  const authIntent = useRef(0);
  const identity = useRef<string | null>(null);
  const cache = useQueryClient();
  const invalidateRequests = useCallback(() => { ++generation.current; }, []);
  const acceptUser = useCallback((next: AppUser | null) => {
    const scope=next ? `${next.id}:${next.organizationId}:${next.role}:${next.identifier}` : null;
    if (identity.current !== scope) cache.clear();
    identity.current = scope;
    setUser(next);
  }, [cache]);
  const refreshUser = useCallback(async () => {
    const request = ++generation.current;
    try {
      if (!supabase) { acceptUser(null); return; }
      const next = await resolveUser();
      if (request !== generation.current) return;
      acceptUser(next);
      setError(next ? null : 'Sign in with an active organization account.');
    } catch {
      if (request === generation.current) { acceptUser(null); setError('Unable to verify your session. Sign in again or retry.'); }
    } finally { if (request === generation.current) setLoading(false); }
  }, [acceptUser]);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || event === 'SIGNED_OUT') { if (event==='SIGNED_OUT') ++authIntent.current; ++generation.current; acceptUser(null); setLoading(false); }
      else {
        // Return before another Supabase request acquires the auth callback's lock.
        queueMicrotask(() => { if (alive) void refreshUser(); });
      }
    });
    void refreshUser();
    const onFocus = () => { void refreshUser(); };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 60000);
    return () => { alive = false; invalidateRequests(); subscription.unsubscribe(); window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [acceptUser, refreshUser, invalidateRequests]);
  async function login(payload: LoginPayload) {
    const attempt=++authIntent.current;
    ++generation.current;
    try {
    const client = requireSupabase();
    const { error: authError } = await client.auth.signInWithPassword({ email: payload.identifier.trim(), password: payload.password });
    if (authError) throw new Error('Unable to sign in. Check your email and password.');
    const next = await resolveUser();
    if (!next) { await client.auth.signOut(); throw new Error('An active organization account is required. Contact your administrator.'); }
    if (attempt!==authIntent.current) throw new Error('Sign-in changed. Please try again.');
    acceptUser(next); setError(null); return next;
    } finally {setLoading(false);}
  }
  async function logout() {
    ++authIntent.current;
    ++generation.current;
    const { error: logoutError } = await requireSupabase().auth.signOut();
    if (logoutError) throw new Error('Unable to log out. Please retry.');
    ++generation.current; acceptUser(null);
  }
  return <AuthContext.Provider value={{user,loading,error,login,logout,refreshUser}}>{children}</AuthContext.Provider>;
}
