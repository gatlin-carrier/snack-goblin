// Provide a WebSocket implementation for supabase-js realtime client (Node < 22)
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws');
}
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const ALLOWED = (process.env.ALLOWED_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[auth] SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY not set — all /api/* requests will be rejected');
}

const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

// Founder is the first allowlisted email. Their first authed request claims
// any pre-existing NULL user_id rows. Idempotent — subsequent requests no-op.
const FOUNDER_EMAIL = ALLOWED[0] || null;
let claimedForUserId = null;

const SCOPED_TABLES = [
  'recipes', 'meal_plans', 'shopping_lists', 'pantry_items', 'equipment',
  'preferences', 'allergen_exposures', 'cook_log', 'freezer_items',
  'leftovers', 'first_foods', 'collections', 'plan_templates',
];

function claimFounderData(db, userId) {
  if (claimedForUserId === userId) return;
  let total = 0;
  for (const table of SCOPED_TABLES) {
    try {
      const r = db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(userId);
      total += r.changes;
    } catch (err) {
      console.warn(`[auth] claim failed on ${table}:`, err.message);
    }
  }
  claimedForUserId = userId;
  if (total > 0) console.log(`[auth] founder ${userId} claimed ${total} pre-existing rows`);
}

function makeRequireAuth({ db } = {}) {
  return async function requireAuth(req, res, next) {
    if (!supabase) return res.status(503).json({ error: 'Auth not configured on server' });

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired session' });

      const email = (data.user.email || '').toLowerCase();
      if (ALLOWED.length > 0 && !ALLOWED.includes(email)) {
        console.warn(`[auth] denied non-allowlisted email: ${email}`);
        return res.status(403).json({ error: 'This account is not authorized for this app' });
      }

      req.user = data.user;
      req.userId = data.user.id;

      if (db && FOUNDER_EMAIL && email === FOUNDER_EMAIL) {
        claimFounderData(db, data.user.id);
      }

      next();
    } catch (err) {
      console.error('[auth] verification error:', err.message);
      res.status(500).json({ error: 'Auth verification failed' });
    }
  };
}

// Backwards-compat default export — unscoped (no claim). Prefer makeRequireAuth({db}).
const requireAuth = makeRequireAuth();

function getFounderUserId() {
  return claimedForUserId;
}

module.exports = { requireAuth, makeRequireAuth, getFounderUserId };
