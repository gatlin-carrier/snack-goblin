import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const AuthCtx = createContext(null);

let currentToken = null;

if (typeof window !== 'undefined' && !window.__mealhouseFetchPatched) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input?.url || '');
    const isApi = url.startsWith('/api/') || url.includes('//') === false && url.startsWith('api/');
    if (isApi && currentToken) {
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${currentToken}`);
      init = { ...init, headers };
    }
    return originalFetch(input, init);
  };
  window.__mealhouseFetchPatched = true;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    // No ref-guard here: under React 18 StrictMode the effect runs mount→cleanup
    // →mount. A ref guard would skip the second subscribe after the first was torn
    // down, leaving no auth listener (sign-in + token refresh would never update).
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      currentToken = data?.session?.access_token || null;
      setSession(data?.session || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      currentToken = newSession?.access_token || null;
      setSession(newSession || null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithMagicLink(email) {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) { setError(error.message); return false; }
    return true;
  }

  async function signInWithProvider(provider) {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    currentToken = null;
  }

  return (
    <AuthCtx.Provider value={{
      session,
      user: session?.user || null,
      loading: session === undefined,
      error,
      signInWithMagicLink,
      signInWithProvider,
      signOut,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
