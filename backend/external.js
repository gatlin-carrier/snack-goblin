// External integrations API — read-only endpoints for sibling apps on the
// same homelab (currently Goblin Calendar). Auth is a single shared bearer
// token (`INTEGRATION_TOKEN` env var) rather than the Supabase JWT flow:
// these consumers are server-side, single-tenant, and live on the same
// trusted network as Snack Goblin, so the operator-managed secret is the
// right model.
//
// Must be mounted BEFORE `app.use('/api', makeRequireAuth(...))` in
// server.js so requests skip the household auth pipeline.

function getMondayISO(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

const crypto = require('crypto');

// Constant-time token comparison to avoid leaking the token via response timing.
function tokensMatch(provided, expected) {
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false; // timingSafeEqual requires equal lengths
  return crypto.timingSafeEqual(a, b);
}

function bearerAuth(req, res, next) {
  const expected = process.env.INTEGRATION_TOKEN;
  if (!expected) return res.status(503).json({ error: 'INTEGRATION_TOKEN not configured' });
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!tokensMatch(provided, expected)) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Find the active meal plan: prefer the one matching this week's Monday;
// fall back to the most recent. External callers don't have a user/household
// context so we treat the latest plan as canonical (single-household setup).
function currentPlan(db) {
  const monday = getMondayISO();
  let plan = db.prepare('SELECT * FROM meal_plans WHERE week_start = ? ORDER BY id DESC LIMIT 1').get(monday);
  if (!plan) plan = db.prepare('SELECT * FROM meal_plans ORDER BY week_start DESC, id DESC LIMIT 1').get();
  return plan;
}

function planItems(db, planId) {
  return db.prepare(`
    SELECT mpi.id, mpi.meal_type, mpi.day_of_week, mpi.servings_adult, mpi.servings_toddler, mpi.notes,
           r.name, r.prep_time_min, r.cook_time_min, r.image_url
    FROM meal_plan_items mpi
    JOIN recipes r ON r.id = mpi.recipe_id
    WHERE mpi.meal_plan_id = ?
    ORDER BY mpi.day_of_week, mpi.meal_type
  `).all(planId);
}

// Map plan day_of_week (Snack Goblin uses 0=Mon..6=Sun) onto a real date
// relative to the plan's week_start.
function dateForDayOfWeek(weekStart, dow) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (dow ?? 0));
  return d.toISOString().slice(0, 10);
}

function attach(app, db) {
  app.get('/api/external/v1/health', bearerAuth, (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // Meals planned for a specific date (defaults to today).
  app.get('/api/external/v1/meals', bearerAuth, (req, res) => {
    try {
      const date = (req.query.date || new Date().toISOString().slice(0, 10)).toString();
      const plan = currentPlan(db);
      if (!plan) return res.json({ date, meals: [] });
      const items = planItems(db, plan.id);
      const meals = items
        .filter((it) => dateForDayOfWeek(plan.week_start, it.day_of_week) === date)
        .map((it) => ({
          mealType: it.meal_type || 'dinner',
          name: it.name,
          prepMin: it.prep_time_min ?? null,
          cookMin: it.cook_time_min ?? null,
          servings: (it.servings_adult ?? 0) + (it.servings_toddler ?? 0),
          imageUrl: it.image_url ?? null,
          notes: it.notes ?? null,
        }));
      res.json({ date, weekStart: plan.week_start, meals });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Flattened shopping list for the current plan. Only unchecked items by
  // default (the kiosk uses these to seed a Goblin Calendar list).
  app.get('/api/external/v1/shopping-list/current', bearerAuth, (req, res) => {
    try {
      const includeChecked = req.query.includeChecked === '1';
      const plan = currentPlan(db);
      if (!plan) return res.json({ weekStart: null, items: [] });
      const list = db
        .prepare('SELECT * FROM shopping_lists WHERE meal_plan_id = ? ORDER BY created_at DESC LIMIT 1')
        .get(plan.id);
      if (!list) return res.json({ weekStart: plan.week_start, items: [] });
      const rows = db
        .prepare(
          `SELECT ingredient_name, quantity, unit, category, checked
           FROM shopping_list_items
           WHERE shopping_list_id = ? ${includeChecked ? '' : 'AND checked = 0'}
           ORDER BY category, ingredient_name`,
        )
        .all(list.id);
      res.json({
        weekStart: plan.week_start,
        items: rows.map((r) => ({
          name: r.ingredient_name,
          quantity: r.quantity,
          unit: r.unit,
          category: r.category || 'pantry',
          checked: r.checked === 1,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Derived prep reminders. We turn each meal into a "start prepping at X"
  // timestamp anchored on a configurable dinner time (default 18:00) minus
  // (prep_time_min + cook_time_min). Caller can override via ?dinnerAt=HH:MM.
  app.get('/api/external/v1/prep-tasks', bearerAuth, (req, res) => {
    try {
      const date = (req.query.date || new Date().toISOString().slice(0, 10)).toString();
      const dinnerAt = (req.query.dinnerAt || '18:00').toString();
      const [hh, mm] = dinnerAt.split(':').map((n) => Number(n));
      const plan = currentPlan(db);
      if (!plan) return res.json({ date, tasks: [] });
      const items = planItems(db, plan.id);
      const todays = items.filter((it) => dateForDayOfWeek(plan.week_start, it.day_of_week) === date);
      const tasks = todays
        .filter((it) => (it.meal_type || 'dinner') === 'dinner')
        .map((it) => {
          const lead = (it.prep_time_min ?? 0) + (it.cook_time_min ?? 0);
          const dinner = new Date(`${date}T00:00:00`);
          dinner.setHours(hh, mm, 0, 0);
          const startAt = new Date(dinner.getTime() - lead * 60 * 1000);
          return {
            at: startAt.toISOString(),
            label: `Start ${it.name}`,
            leadMin: lead,
          };
        })
        .filter((t) => t.leadMin > 0)
        .sort((a, b) => a.at.localeCompare(b.at));
      res.json({ date, tasks });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { attach };
