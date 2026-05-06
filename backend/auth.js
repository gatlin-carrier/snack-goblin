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

// Founder bootstrap email — first ALLOWED_EMAILS entry. On their first authed
// request, we create a household if one doesn't exist, add them as founder,
// and backfill all NULL household_id rows. Idempotent — only runs once.
const FOUNDER_EMAIL = ALLOWED[0] || null;

const SCOPED_TABLES = [
  'recipes', 'meal_plans', 'shopping_lists', 'pantry_items', 'equipment',
  'preferences', 'allergen_exposures', 'cook_log', 'freezer_items',
  'leftovers', 'first_foods', 'collections', 'plan_templates',
];

function bootstrapFounder(db, user, displayNameHint) {
  // Returns the household row for this user, creating + backfilling on first run.
  let existing = db.prepare(`
    SELECT h.* FROM households h
    JOIN household_members m ON m.household_id = h.id
    WHERE m.user_id = ? OR LOWER(m.email) = LOWER(?)
    LIMIT 1
  `).get(user.id, user.email);
  if (existing) {
    // Make sure the row is linked to this user_id (handles invite-then-login)
    db.prepare('UPDATE household_members SET user_id = ?, joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP) WHERE LOWER(email) = LOWER(?) AND household_id = ?')
      .run(user.id, user.email, existing.id);
    return existing;
  }

  // No household yet for this user. If they're the founder email, create one
  // and claim NULL data rows.
  if (FOUNDER_EMAIL && (user.email || '').toLowerCase() === FOUNDER_EMAIL) {
    const result = db.prepare('INSERT INTO households (name, founder_user_id) VALUES (?, ?)')
      .run(`${(displayNameHint || user.email || 'the').split('@')[0]}'s den`, user.id);
    const householdId = result.lastInsertRowid;
    db.prepare('INSERT INTO household_members (household_id, user_id, email, display_name, role, joined_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run(householdId, user.id, user.email, displayNameHint || null, 'founder');

    // Backfill household_id on all existing user-scoped rows. This mirrors
    // the Phase 1B claimFounderData but for households.
    let total = 0;
    for (const table of SCOPED_TABLES) {
      try {
        const r = db.prepare(`UPDATE ${table} SET household_id = ? WHERE household_id IS NULL`).run(householdId);
        total += r.changes;
      } catch (err) {
        console.warn(`[auth] household backfill failed on ${table}:`, err.message);
      }
    }
    console.log(`[auth] founder ${user.email} created household #${householdId}, claimed ${total} pre-existing rows`);
    return db.prepare('SELECT * FROM households WHERE id = ?').get(householdId);
  }

  return null;
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
      const displayHint = data.user.user_metadata?.full_name || data.user.user_metadata?.name || null;

      let household = db ? bootstrapFounder(db, data.user, displayHint) : null;

      if (!household) {
        // Not a founder, not yet a household member. Fall back to ALLOWED_EMAILS
        // for break-glass / legacy. Otherwise reject — invitation IS the gate.
        if (ALLOWED.length > 0 && !ALLOWED.includes(email)) {
          console.warn(`[auth] denied — not a household member and not allowlisted: ${email}`);
          return res.status(403).json({ error: 'This account is not part of any household. Ask the founder to invite you.' });
        }
      }

      // Re-fetch the member row so we have the role + display_name
      const member = db ? db.prepare('SELECT * FROM household_members WHERE LOWER(email) = LOWER(?) AND household_id = ?').get(email, household?.id || -1) : null;

      req.user = data.user;
      req.userId = data.user.id;
      req.householdId = household?.id || null;
      req.member = member || null;
      next();
    } catch (err) {
      console.error('[auth] verification error:', err.message);
      res.status(500).json({ error: 'Auth verification failed' });
    }
  };
}

const requireAuth = makeRequireAuth();

function getFounderUserId() {
  // Legacy compat for Phase 1B. Households supersede the per-user founder
  // pattern but cron still calls saveRecipes() with no req.
  return null;
}

module.exports = { requireAuth, makeRequireAuth, getFounderUserId };
