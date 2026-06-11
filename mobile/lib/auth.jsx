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
    // Only process our own auth-callback URLs — parse out the `code` query param
    // and exchange just that (not the whole URL). Surface provider errors when
    // the redirect carries error_code/error_description instead of a code.
    async function handleDeepLink({ url }) {
      if (!url) return;
      if (!url.startsWith('snack-goblin://auth-callback')) return;
      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code;
      const errCode = queryParams?.error_code;
      const errDesc = queryParams?.error_description;
      if (errCode || errDesc) {
        setError(decodeURIComponent(String(errDesc || errCode)).replace(/\+/g, ' ').toLowerCase());
        return;
      }
      if (!code) return;
      const { error } = await supabase.auth.exchangeCodeForSession(String(code));
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
    // `signInWithOAuth` alone is a no-op on native — it never opens a browser.
    // We ask Supabase for the URL (skipBrowserRedirect) and open it ourselves.
    // The provider redirects back to snack-goblin://auth-callback?code=…, which
    // `handleDeepLink` above picks up and exchanges for a session.
    //
    // TODO: once `expo-web-browser` is added as a dependency, switch to
    // WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL) and feed the
    // returned url's code through exchangeCodeForSession for a cleaner in-app
    // session that auto-dismisses. Until then, Linking.openURL is the
    // non-crashing fallback (kicks out to the system browser and back).
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
    });
    if (error) { setError(error.message); return; }
    if (data?.url) {
      try { await Linking.openURL(data.url); }
      catch (e) { setError(e.message); }
    }
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
