import { currentToken } from './auth';
import { supabase } from './supabase';

function resolveBase() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  if (!__DEV__) {
    console.warn(
      '[api] EXPO_PUBLIC_API_URL is not set in a production build — ' +
      'falling back to http://localhost:3710, which will not reach a real server.'
    );
  }
  return 'http://localhost:3710';
}

const BASE = resolveBase();
const TIMEOUT_MS = 20000;

// Pull the freshest token we can: prefer the live session (which auto-refreshes),
// fall back to the module-level token captured by the auth listener.
async function freshToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || currentToken;
  } catch {
    return currentToken;
  }
}

async function doFetch(path, options, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE}${path}`, { ...options, headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function api(path, options = {}) {
  let token = await freshToken();
  let res = await doFetch(path, options, token);

  // On a 401, the token may be stale — refresh the session once and retry.
  if (res.status === 401) {
    try {
      const { data } = await supabase.auth.getSession();
      const retried = data?.session?.access_token;
      if (retried && retried !== token) {
        res = await doFetch(path, options, retried);
      }
    } catch {}
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
  }
  return res.json();
}

export const get  = (path) => api(path);
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const put  = (path, body) => api(path, { method: 'PUT',  body: JSON.stringify(body) });
export const patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del  = (path) => api(path, { method: 'DELETE' });
