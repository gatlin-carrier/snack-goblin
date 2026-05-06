// Face ID / WebAuthn integration. After first magic-link sign-in, the user
// can register a platform passkey. The flow caches the Supabase refresh
// token in IndexedDB; re-auth is a Face ID prompt that retrieves and
// re-applies the cached session, no email round-trip.

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase } from './supabase.js';

const LS_CRED_ID = 'mealhouse_passkey_cred_id';
const LS_CRED_EMAIL = 'mealhouse_passkey_email';
const IDB_NAME = 'mealhouse_passkeys';
const IDB_STORE = 'sessions';

export function isPasskeySupported() {
  return typeof window !== 'undefined'
    && 'credentials' in navigator
    && typeof PublicKeyCredential !== 'undefined';
}

export function getCachedCredentialId() {
  try { return localStorage.getItem(LS_CRED_ID); } catch { return null; }
}

export function getCachedEmail() {
  try { return localStorage.getItem(LS_CRED_EMAIL); } catch { return null; }
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: 'credential_id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(record) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(credentialId) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(credentialId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(credentialId) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(credentialId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Register a passkey for the current Supabase user. Caches the refresh
// token so future Face ID assertions can restore the session.
export async function registerPasskey(label) {
  if (!isPasskeySupported()) throw new Error('passkeys not supported on this device');
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (!session) throw new Error('sign in first');

  const optsRes = await fetch('/api/passkeys/register-options', { method: 'POST' });
  if (!optsRes.ok) throw new Error('could not get registration options');
  const options = await optsRes.json();

  const attestation = await startRegistration({ optionsJSON: options });

  const verifyRes = await fetch('/api/passkeys/register-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: attestation, label: label || null }),
  });
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.error || 'verification failed');
  }
  const { credential_id } = await verifyRes.json();

  // Cache the refresh token in IndexedDB, keyed by credential ID. Also save
  // the credential ID + email in localStorage for the Login screen to
  // detect on cold start.
  await idbPut({
    credential_id,
    refresh_token: session.refresh_token,
    email: session.user.email,
    cached_at: new Date().toISOString(),
  });
  try {
    localStorage.setItem(LS_CRED_ID, credential_id);
    localStorage.setItem(LS_CRED_EMAIL, session.user.email || '');
  } catch {}

  return { credential_id };
}

// Re-auth via Face ID. Calls the WebAuthn assertion, then uses the cached
// refresh_token to restore the Supabase session.
export async function authWithPasskey() {
  if (!isPasskeySupported()) throw new Error('passkeys not supported');
  const credId = getCachedCredentialId();
  if (!credId) throw new Error('no passkey on this device');

  const optsRes = await fetch('/passkeys/auth-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential_id: credId }),
  });
  if (!optsRes.ok) throw new Error('could not get auth options');
  const options = await optsRes.json();

  const assertion = await startAuthentication({ optionsJSON: options });

  const verifyRes = await fetch('/passkeys/auth-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: assertion }),
  });
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.error || 'verification failed');
  }

  // Retrieve the cached refresh_token and restore the Supabase session.
  const cached = await idbGet(credId);
  if (!cached?.refresh_token) {
    throw new Error('no cached session — sign in with email once to set it up again');
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: cached.refresh_token,
  });
  if (error) {
    // Refresh token expired or revoked. Clear cache so user falls back to magic link.
    await idbDelete(credId);
    try { localStorage.removeItem(LS_CRED_ID); localStorage.removeItem(LS_CRED_EMAIL); } catch {}
    throw new Error('your saved session expired. send a magic link to set it up again.');
  }

  // Update the cache with the new refresh token (Supabase rotates them).
  if (data.session?.refresh_token) {
    await idbPut({
      credential_id: credId,
      refresh_token: data.session.refresh_token,
      email: data.session.user?.email,
      cached_at: new Date().toISOString(),
    });
  }

  return { session: data.session };
}

export async function forgetPasskey() {
  const credId = getCachedCredentialId();
  if (credId) await idbDelete(credId).catch(() => {});
  try { localStorage.removeItem(LS_CRED_ID); localStorage.removeItem(LS_CRED_EMAIL); } catch {}
}
