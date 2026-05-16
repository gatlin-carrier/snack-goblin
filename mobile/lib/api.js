import { currentToken } from './auth';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3710';

export async function api(path, options = {}) {
  const token = currentToken;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
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
