// WebAuthn passkey support for "trust this device" Face ID re-auth.
//
// Architecture:
//   1. After magic-link sign-in, the client offers "set up Face ID for next time"
//   2. POST /api/passkeys/register-options → returns WebAuthn challenge
//   3. Client calls navigator.credentials.create() with platform authenticator
//   4. POST /api/passkeys/register-verify → backend stores public key
//   5. Client also caches its current Supabase refresh_token in IndexedDB
//      keyed by the passkey credential ID
//
//   On next visit (Login screen):
//   1. Client checks IndexedDB for any stored credential
//   2. If found: shows "👁 use Face ID" button
//   3. POST /api/passkeys/auth-options → returns challenge for that user
//   4. Client calls navigator.credentials.get() — Face ID prompts
//   5. POST /api/passkeys/auth-verify → backend verifies signature, returns
//      user_id + email. Client retrieves the cached refresh_token from
//      IndexedDB and calls supabase.auth.setSession() to restore the session.
//
// No SUPABASE_SERVICE_ROLE_KEY required — we never mint sessions
// server-side. We just verify "this is the same person who registered
// the passkey" and let the client restore its own cached session.

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const RP_NAME = 'Snack Goblin';
const RP_ID = process.env.PASSKEY_RP_ID || 'meal-planner.lumi-server.dev';
const ORIGIN = process.env.PASSKEY_ORIGIN || `https://${RP_ID}`;

// In-memory challenge store. Challenges are short-lived (60s) and tied
// to a userId — fine for a single-process app.
const challenges = new Map();
function setChallenge(key, value) {
  challenges.set(key, { value, expires: Date.now() + 60_000 });
}
function getChallenge(key) {
  const entry = challenges.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) { challenges.delete(key); return null; }
  challenges.delete(key);
  return entry.value;
}

// Public routes — mounted before requireAuth middleware so unauthenticated
// users can use Face ID to sign back in.
function attachPublic(app, db) {
  app.post('/passkeys/auth-options', async (req, res) => {
    const { credential_id } = req.body || {};
    let allowCredentials = [];
    if (credential_id) {
      const row = db.prepare('SELECT user_id FROM user_passkeys WHERE credential_id = ?').get(credential_id);
      if (!row) return res.status(404).json({ error: 'unknown credential' });
      allowCredentials = [{ id: credential_id, transports: ['internal'] }];
    }
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      timeout: 60_000,
      userVerification: 'required',
      allowCredentials,
    });
    setChallenge(`auth:${credential_id || 'discoverable'}`, options.challenge);
    res.json(options);
  });

  app.post('/passkeys/auth-verify', async (req, res) => {
    const { response } = req.body || {};
    if (!response) return res.status(400).json({ error: 'response required' });

    const credId = response.id;
    const row = db.prepare('SELECT * FROM user_passkeys WHERE credential_id = ?').get(credId);
    if (!row) return res.status(404).json({ error: 'unknown credential' });

    const expected = getChallenge(`auth:${credId}`) || getChallenge('auth:discoverable');
    if (!expected) return res.status(400).json({ error: 'no pending challenge' });

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: expected,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: row.credential_id,
          publicKey: new Uint8Array(row.public_key),
          counter: row.counter,
        },
        requireUserVerification: true,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!verification.verified) return res.status(400).json({ error: 'verification failed' });

    db.prepare('UPDATE user_passkeys SET counter = ?, last_used_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(verification.authenticationInfo.newCounter, row.id);

    res.json({ ok: true, user_id: row.user_id });
  });

  app.get('/passkeys/configured', (req, res) => {
    const credId = req.query.credential_id;
    if (!credId) return res.json({ configured: false });
    const row = db.prepare('SELECT 1 FROM user_passkeys WHERE credential_id = ?').get(credId);
    res.json({ configured: !!row });
  });
}

// Private routes — mounted after requireAuth.
function attachPrivate(app, db) {
  // ─── Registration ─────────────────────────────────────────────────

  app.post('/api/passkeys/register-options', async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: 'sign in first' });
    const existing = db.prepare('SELECT credential_id FROM user_passkeys WHERE user_id = ?').all(req.userId);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Buffer.from(req.userId),
      userName: req.user.email,
      userDisplayName: req.member?.display_name || req.user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
      excludeCredentials: existing.map(e => ({ id: e.credential_id })),
      timeout: 60_000,
    });

    setChallenge(`register:${req.userId}`, options.challenge);
    res.json(options);
  });

  app.post('/api/passkeys/register-verify', async (req, res) => {
    if (!req.userId) return res.status(401).json({ error: 'sign in first' });
    const expected = getChallenge(`register:${req.userId}`);
    if (!expected) return res.status(400).json({ error: 'no pending challenge — request options first' });

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: req.body.response,
        expectedChallenge: expected,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: true,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'verification failed' });
    }

    const { credential } = verification.registrationInfo;
    const credentialID = credential.id;
    const publicKey = credential.publicKey;
    const counter = credential.counter;

    db.prepare(`
      INSERT INTO user_passkeys (user_id, credential_id, public_key, counter, transports, label)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(credential_id) DO UPDATE SET counter = excluded.counter, last_used_at = CURRENT_TIMESTAMP
    `).run(
      req.userId,
      credentialID,
      Buffer.from(publicKey),
      counter,
      JSON.stringify(req.body.response?.response?.transports || []),
      req.body.label || null
    );

    res.json({ ok: true, credential_id: credentialID });
  });

  // ─── Management ───────────────────────────────────────────────────

  app.get('/api/passkeys', (req, res) => {
    if (!req.userId) return res.status(401).json({ error: 'sign in first' });
    const rows = db.prepare('SELECT id, label, created_at, last_used_at FROM user_passkeys WHERE user_id = ? ORDER BY id DESC').all(req.userId);
    res.json(rows);
  });

  app.delete('/api/passkeys/:id', (req, res) => {
    if (!req.userId) return res.status(401).json({ error: 'sign in first' });
    const r = db.prepare('DELETE FROM user_passkeys WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    if (!r.changes) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  });

}

module.exports = { attachPublic, attachPrivate };
