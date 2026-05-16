import { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

const REDIRECT_URL = 'snack-goblin://auth-callback';

const AuthCtx = createContext(null);

export let currentToken = null;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [error, setError] = useState(null);
  const initRan = useRef(false);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    supabase.auth.getSession().then(({ data }) => {
      currentToken = data?.session?.access_token || null;
      setSession(data?.session || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      currentToken = newSession?.access_token || null;
      setSession(newSession || null);
    });

    // Exchange PKCE code when app is opened via magic link.
    // Only process our own auth-callback URLs that carry a fresh code — anything
    // else (dev-client launch URLs, already-consumed links on reload) is ignored.
    async function handleDeepLink({ url }) {
      if (!url) return;
      if (!url.startsWith('snack-goblin://auth-callback') || !url.includes('code=')) return;
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) {
        // PKCE verifier already consumed or expired — ask them to try again
        if (error.message?.includes('flow state')) {
          setError('this link has already been used or expired. request a new one.');
        } else {
          setError(error.message);
        }
      }
    }

    Linking.getInitialURL().then(url => { if (url) handleDeepLink({ url }); });
    const linkSub = Linking.addEventListener('url', handleDeepLink);

    return () => {
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  async function signInWithMagicLink(email) {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: REDIRECT_URL },
    });
    if (error) { setError(error.message); return false; }
    return true;
  }

  async function signInWithProvider(provider) {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) setError(error.message);
  }

  async function signInWithApple() {
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) setError(error.message);
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') setError(e.message);
    }
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
      signInWithApple,
      signOut,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
