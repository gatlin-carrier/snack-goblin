'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const https = require('https');
const http = require('http');
const { chat } = require('./llm');

const app = express();
const PORT = process.env.PORT || 3710;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'meal-planner.db');

// ─── Middleware ───────────────────────────────────────────────────────────────

app.set('trust proxy', 1);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://meal-planner.lumi-server.dev';
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));

app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const llmLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

// Optional bearer-token auth — activate by setting APP_SECRET env var.
// When set, every /api/* request must include: Authorization: Bearer <secret>
const APP_SECRET = process.env.APP_SECRET;
if (APP_SECRET) {
  app.use('/api', (req, res, next) => {
    if (req.headers.authorization === `Bearer ${APP_SECRET}`) return next();
    res.status(401).json({ error: 'Unauthorized' });
  });
}

// ─── Security helpers ─────────────────────────────────────────────────────────

// Block SSRF: reject private IPs, loopback, link-local, and non-http(s) schemes.
function isSafeExternalUrl(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const h = parsed.hostname.toLowerCase();
  if (h === 'localhost') return false;
  if (/^127\./.test(h)) return false;
  if (/^0\.0\.0\.0/.test(h)) return false;
  if (/^10\./.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  if (/^192\.168\./.test(h)) return false;
  if (/^169\.254\./.test(h)) return false;
  if (/^::1$/.test(h)) return false;
  if (/^(fc|fd|fe80)[0-9a-f:]+/.test(h)) return false;
  return true;
}

// Safe integer parse with bounds clamping.
function clampInt(val, min, max, fallback) {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ─── Database ─────────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    meal_type TEXT DEFAULT 'dinner',
    servings_adult INTEGER DEFAULT 2,
    prep_time_min INTEGER,
    cook_time_min INTEGER,
    cuisine TEXT,
    ingredients TEXT NOT NULL DEFAULT '[]',
    instructions TEXT NOT NULL DEFAULT '[]',
    nutrition TEXT DEFAULT '{}',
    toddler_safe INTEGER DEFAULT 1,
    choking_hazards TEXT DEFAULT '[]',
    toddler_notes TEXT,
    batch_prep_notes TEXT,
    oven_temp INTEGER,
    tags TEXT DEFAULT '[]',
    star_rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    in_rotation INTEGER DEFAULT 1,
    last_used DATE,
    use_count INTEGER DEFAULT 0,
    assigned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start DATE NOT NULL,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS meal_plan_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    meal_type TEXT DEFAULT 'dinner',
    day_of_week INTEGER,
    servings_adult INTEGER DEFAULT 2,
    servings_toddler INTEGER DEFAULT 1,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS shopping_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER REFERENCES meal_plans(id),
    status TEXT DEFAULT 'pending',
    instacart_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shopping_list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopping_list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    category TEXT DEFAULT 'pantry',
    checked INTEGER DEFAULT 0,
    instacart_product_id TEXT
  );

  CREATE TABLE IF NOT EXISTS pantry_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_name TEXT NOT NULL UNIQUE,
    quantity REAL,
    unit TEXT,
    category TEXT DEFAULT 'pantry',
    item_type TEXT DEFAULT 'food',
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    preference TEXT NOT NULL,
    UNIQUE(type, name)
  );

  CREATE TABLE IF NOT EXISTS allergen_exposures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    allergen TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'not_introduced',
    first_introduced_date DATE,
    last_in_plan_date DATE,
    reaction TEXT,
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cook_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    cooked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS llm_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT,
    api_key TEXT,
    base_url TEXT,
    is_active INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS freezer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_name TEXT NOT NULL,
    servings INTEGER DEFAULT 2,
    frozen_date DATE,
    use_by_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leftovers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_name TEXT NOT NULL,
    servings_remaining INTEGER DEFAULT 2,
    cooked_date DATE,
    use_by_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS first_foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_name TEXT NOT NULL,
    date_tried DATE,
    reaction TEXT DEFAULT 'none',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS collection_recipes (
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    PRIMARY KEY (collection_id, recipe_id)
  );

  CREATE TABLE IF NOT EXISTS plan_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS plan_template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    meal_type TEXT DEFAULT 'dinner',
    day_of_week INTEGER,
    servings_adult INTEGER DEFAULT 2,
    servings_toddler INTEGER DEFAULT 1
  );
`);

// Schema migrations for existing DBs
const migrations = [
  "ALTER TABLE recipes ADD COLUMN meal_type TEXT DEFAULT 'dinner'",
  "ALTER TABLE recipes ADD COLUMN star_rating REAL DEFAULT 0",
  "ALTER TABLE recipes ADD COLUMN rating_count INTEGER DEFAULT 0",
  "ALTER TABLE recipes ADD COLUMN in_rotation INTEGER DEFAULT 1",
  "ALTER TABLE recipes ADD COLUMN last_used DATE",
  "ALTER TABLE recipes ADD COLUMN use_count INTEGER DEFAULT 0",
  "ALTER TABLE recipes ADD COLUMN cook_count INTEGER DEFAULT 0",
  "ALTER TABLE recipes ADD COLUMN last_cooked_at DATETIME",
  "ALTER TABLE meal_plan_items ADD COLUMN meal_type TEXT DEFAULT 'dinner'",
  "ALTER TABLE pantry_items ADD COLUMN item_type TEXT DEFAULT 'food'",
  "ALTER TABLE pantry_items ADD COLUMN notes TEXT",
  "ALTER TABLE pantry_items ADD COLUMN expiry_date DATE",
  "ALTER TABLE pantry_items ADD COLUMN low_stock_threshold REAL",
  "ALTER TABLE recipes ADD COLUMN cost_per_serving REAL",
  "ALTER TABLE recipes ADD COLUMN cost_currency TEXT DEFAULT 'USD'",
  "ALTER TABLE recipes ADD COLUMN cost_fetched_at DATETIME",
  "ALTER TABLE meal_plan_items ADD COLUMN is_alternate INTEGER DEFAULT 0",
  "ALTER TABLE recipes ADD COLUMN image_url TEXT",
  "ALTER TABLE recipes ADD COLUMN image_attribution TEXT",
  "ALTER TABLE recipes ADD COLUMN image_source_url TEXT",
];
for (const sql of migrations) {
  try { db.exec(sql); } catch {}
}

db.exec(`
  CREATE TABLE IF NOT EXISTS ingredient_prices (
    name TEXT PRIMARY KEY,
    price_per_unit REAL NOT NULL,
    unit TEXT NOT NULL,
    source TEXT,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskKey(key) {
  if (!key || key.length < 8) return key ? '••••••••' : '';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

function serializeLLMConfig(cfg) {
  return {
    id: cfg.id,
    name: cfg.name,
    provider: cfg.provider,
    model: cfg.model || '',
    api_key_hint: maskKey(cfg.api_key),
    base_url: cfg.base_url || '',
    is_active: cfg.is_active === 1,
  };
}

function getLLMSettings() {
  // 1. Active llm_config row
  const cfg = db.prepare('SELECT * FROM llm_configs WHERE is_active = 1').get();
  if (cfg) {
    let apiKey = cfg.api_key;
    if (!apiKey) {
      if (cfg.provider === 'anthropic') apiKey = process.env.ANTHROPIC_API_KEY;
      else if (cfg.provider === 'openai') apiKey = process.env.OPENAI_API_KEY;
      else if (cfg.provider === 'google') apiKey = process.env.GOOGLE_API_KEY;
    }
    return { provider: cfg.provider, model: cfg.model || undefined, api_key: apiKey, ollama_base_url: cfg.base_url || undefined };
  }
  // 2. Legacy flat settings table
  const row = db.prepare("SELECT value FROM settings WHERE key = 'llm_config'").get();
  if (row) { try { return JSON.parse(row.value); } catch {} }
  // 3. Env-var fallback
  return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', api_key: process.env.ANTHROPIC_API_KEY };
}

function safeError(err) {
  // Never leak stack traces or internal details to the client.
  if (process.env.NODE_ENV !== 'production') console.error(err);
  return 'An error occurred';
}

// ─── Child Age & Guidelines ───────────────────────────────────────────────────

function getChildAgeMonths() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'child_dob'").get();
  if (!row?.value) return null;
  const dob = new Date(row.value);
  if (isNaN(dob)) return null;
  const now = new Date();
  return (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
}

// Returns per-day DRI targets and prompt context for the child's age bracket.
// Sources: IOM DRI tables, AAP guidelines, EFSA DHA AI, DGA 2025.
function getGuidelineBracket(ageMonths) {
  if (ageMonths === null || ageMonths < 12) {
    // No DOB set or infant — default to 16-month guidelines
    ageMonths = 16;
  }

  if (ageMonths < 24) {
    return {
      label: `${ageMonths}-month-old toddler`,
      ageRange: '12–23 months',
      rdas: { calories: 900, iron_mg: 7, zinc_mg: 3, calcium_mg: 700, vitamin_d_iu: 600, dha_mg: 100, choline_mg: 200, sodium_mg: 1200, added_sugar_g: 0 },
      fatTarget: '30–40% of calories — DO NOT restrict fat (brain myelination)',
      sodiumNote: 'HARD CAP 1,200 mg/day — toddler portion of each meal should stay under 300 mg',
      sugarNote: 'STRICTLY 0 g under age 2 — includes honey (counts as added sugar), flavored yogurt, ketchup with HFCS, sweetened sauces',
      honeyRule: 'NEVER — honey counts as added sugar under AAP guidelines for under-2s',
      chokingLevel: 'strict',
      juiceNote: 'No juice of any kind under 12 months; 100% fruit juice not recommended under 24 months',
      milkNote: 'Whole cow milk (12+ months), full-fat dairy only',
    };
  }

  if (ageMonths < 48) {
    const yrs = Math.floor(ageMonths / 12);
    const mo = ageMonths % 12;
    const label = mo === 0 ? `${yrs}-year-old` : `${yrs} year ${mo}-month-old`;
    return {
      label,
      ageRange: '2–3 years',
      rdas: { calories: 1200, iron_mg: 7, zinc_mg: 3, calcium_mg: 700, vitamin_d_iu: 600, dha_mg: 125, choline_mg: 200, sodium_mg: 1500, added_sugar_g: 25 },
      fatTarget: '30–35% of calories',
      sodiumNote: 'Aim under 1,500 mg/day total; toddler portion under 400 mg',
      sugarNote: 'Minimize added sugar — AAP recommends <25 g/day for children under 6. Avoid sugary drinks entirely.',
      honeyRule: 'Allowed in small amounts as an occasional ingredient (botulism risk gone after 12 months, added sugar cap lifted at 2)',
      chokingLevel: 'moderate',
      juiceNote: '100% fruit juice allowed, max 4 oz/day — whole fruit strongly preferred',
      milkNote: 'Whole or 2% cow milk, full-fat dairy',
    };
  }

  const yrs = Math.floor(ageMonths / 12);
  const mo = ageMonths % 12;
  const label = mo === 0 ? `${yrs}-year-old` : `${yrs} year ${mo}-month-old`;
  return {
    label,
    ageRange: '4–8 years',
    rdas: { calories: 1400, iron_mg: 10, zinc_mg: 5, calcium_mg: 1000, vitamin_d_iu: 600, dha_mg: 250, choline_mg: 250, sodium_mg: 1900, added_sugar_g: 25 },
    fatTarget: '25–35% of calories',
    sodiumNote: 'Under 1,900 mg/day; child portion under 500 mg',
    sugarNote: 'Limit added sugar to <25 g/day. Avoid sugary drinks.',
    honeyRule: 'Allowed',
    chokingLevel: 'low',
    juiceNote: '100% fruit juice, max 4–6 oz/day',
    milkNote: 'Low-fat or whole milk, dairy as desired',
  };
}

function getToddlerRDAs() {
  const ageMonths = getChildAgeMonths();
  return getGuidelineBracket(ageMonths).rdas;
}

// Per-day DRI targets — kept for backward compat, but now resolved dynamically at request time
const TODDLER_DAILY_RDAS = {
  calories: 900, iron_mg: 7, zinc_mg: 3, calcium_mg: 700,
  vitamin_d_iu: 600, dha_mg: 100, choline_mg: 200, sodium_mg: 1200, added_sugar_g: 0,
};

// Weekly totals (×7) used for the nutrition dashboard — resolved dynamically
const TODDLER_WEEKLY_RDAS = Object.fromEntries(
  Object.entries(TODDLER_DAILY_RDAS).map(([k, v]) => [k, v * 7])
);

const CHOKING_HAZARD_PATTERNS = [
  'grape', 'cherry tomato', 'grape tomato', 'hot dog', 'hotdog', 'popcorn',
  'raisin', 'dried cranberry', 'dried fruit', 'whole nut', 'whole almond',
  'whole cashew', 'whole walnut', 'whole peanut', 'raw carrot', 'carrot stick',
  'raw apple', 'apple chunk', 'marshmallow', 'hard candy', 'string cheese',
  'sausage', 'celery stick', 'large blueberry', 'whole blueberry',
];

function detectChokingHazards(ingredients) {
  const hazards = [];
  for (const ing of ingredients) {
    const name = (ing.name || ing).toLowerCase();
    for (const pattern of CHOKING_HAZARD_PATTERNS) {
      if (name.includes(pattern)) {
        hazards.push(`${ing.name || ing} — cut small or modify for toddler`);
        break;
      }
    }
  }
  return hazards;
}

function parseRecipeRow(row) {
  return {
    ...row,
    ingredients: JSON.parse(row.ingredients || '[]'),
    instructions: JSON.parse(row.instructions || '[]'),
    nutrition: JSON.parse(row.nutrition || '{}'),
    choking_hazards: JSON.parse(row.choking_hazards || '[]'),
    tags: JSON.parse(row.tags || '[]'),
  };
}

function getPreferences() {
  const rows = db.prepare('SELECT type, name, preference FROM preferences').all();
  const cuisines = { liked: [], disliked: [], excluded: [] };
  const ingredients = { liked: [], disliked: [], excluded: [] };
  for (const r of rows) {
    if (r.type === 'cuisine') cuisines[r.preference]?.push(r.name);
    if (r.type === 'ingredient') ingredients[r.preference]?.push(r.name);
  }
  return { cuisines, ingredients };
}

function getTopRatedContext() {
  const top = db.prepare(
    'SELECT name, cuisine, meal_type, tags FROM recipes WHERE rating_count > 0 ORDER BY star_rating DESC LIMIT 10'
  ).all();
  return top.map(r => `${r.name} (${r.cuisine}, ${r.meal_type}, ★${r.star_rating?.toFixed(1)})`).join(', ');
}

// ─── Recipe Generation ────────────────────────────────────────────────────────

const MEAL_TYPE_CONTEXT = {
  breakfast: {
    desc: 'morning breakfast meals',
    guidance: 'Under 25 min active time. Interesting, not just "scrambled eggs" — think shakshuka, jammy-egg toast with whipped ricotta, miso oatmeal, crispy smashed potatoes with a fried egg, Korean-style egg bowls. Should feel worth making. Eggs are the nutritional anchor. No added sugar.',
    minVariety: 'Include: 2 egg-based dishes with an interesting angle (not plain scrambled), 1 oat/grain dish with a twist, 1 yogurt or dairy-forward dish, remaining varied. Every dish must have a fruit or vegetable component.',
  },
  lunch: {
    desc: 'midday lunch meals',
    guidance: 'Under 30 min active time. Blue Apron-style composed dishes — think grain bowls with interesting dressings, warm salads with a protein, larb, bánh mì bowls, smashed chickpea salad sandwiches, Turkish red lentil soup. Should feel like something you would order at a good café, not a boring work lunch.',
    minVariety: 'Include: 1 legume-based dish with a global spin, 1 egg-based dish, 1 grain or noodle bowl, remaining varied. Pair iron sources with vitamin C in every dish.',
  },
  dinner: {
    desc: 'evening dinner meals',
    guidance: '30–45 min active weeknight cooking. Serious Eats / NYT Cooking style — well-developed flavor, a technique worth learning, a sauce or element that elevates the dish. Think: seared salmon with miso-ginger glaze, Moroccan-spiced lamb meatballs, crispy tofu mapo-style, spiced lentil dal with crispy shallots, harissa chicken thighs. Each should have a "why is this delicious" angle. Light weeknight prep is encouraged — some components can be prepped a day ahead.',
    minVariety: 'Include: 1 fatty-fish dish (salmon, sardines, trout) with an interesting preparation, 1 red meat dish (beef, lamb) with bold seasoning, 1 bean/lentil dish with a global accent, 1 poultry dish, remaining varied. Every dinner must include a vegetable. Pair plant-iron dishes with vitamin C.',
  },
  snack: {
    desc: 'snacks and small bites',
    guidance: 'Nutrient-dense, interesting enough to look forward to. Not just "apple and peanut butter" — think labneh with za\'atar and cucumber, smashed avocado on seed crackers, quick muhammara with veggies, whipped cottage cheese with berries. Under 10 min, no cooking required preferred. No added sugar.',
    minVariety: 'Include: 2 fruit + protein pairings with an elevated twist, 1 vegetable + interesting dip (muhammara, labneh, whipped feta), 1 dairy-based with texture or flavor interest, remaining varied.',
  },
};

function getEquipmentContext() {
  try {
    const items = db.prepare('SELECT name, notes FROM equipment ORDER BY name').all();
    if (!items.length) return '';
    const list = items.map(e => e.notes ? `${e.name} (${e.notes})` : e.name).join(', ');
    return `AVAILABLE KITCHEN EQUIPMENT: ${list}. Leverage these when they speed things up or improve results (e.g., rice cooker for perfect rice, instant pot for quick braises). Call out equipment-specific steps in instructions.`;
  } catch { return ''; }
}

function buildSystemPrompt(mealType, prefs, mode = 'batch') {
  const ctx = MEAL_TYPE_CONTEXT[mealType] || MEAL_TYPE_CONTEXT.dinner;
  const excludedCuisines = prefs.cuisines.excluded.length ? `Exclude these cuisines entirely: ${prefs.cuisines.excluded.join(', ')}.` : '';
  const excludedIngredients = prefs.ingredients.excluded.length ? `Never use these ingredients: ${prefs.ingredients.excluded.join(', ')}.` : '';
  const likedCuisines = prefs.cuisines.liked.length ? `Preferred cuisines: ${prefs.cuisines.liked.join(', ')}.` : '';
  const dislikedIngredients = prefs.ingredients.disliked.length ? `Minimize: ${prefs.ingredients.disliked.join(', ')}.` : '';
  const equipmentCtx = getEquipmentContext();

  const ageMonths = getChildAgeMonths();
  const guide = getGuidelineBracket(ageMonths);
  const rdas = guide.rdas;

  const chokingSection = guide.chokingLevel === 'strict'
    ? `CHOKING HAZARD PREP (always document in toddler_notes):
• Round foods — grapes, cherry tomatoes, olives, large blueberries, cherries: QUARTER or halve
• Cylindrical foods — hot dogs, string cheese, large carrots, sausage: slice LENGTHWISE then chop
• All pieces for child: ≤ ½ inch
• Nut butter: thinly spread only — never spoonfuls
• Whole nuts/seeds: grind or blend — never whole
• NEVER serve: popcorn, hard candy, marshmallows, raw carrot rounds, raw apple chunks, raisins (whole)`
    : guide.chokingLevel === 'moderate'
    ? `CHOKING HAZARD PREP: Still cut grapes, cherry tomatoes, and round foods in half. Pieces ≤ ¾ inch. Nut butter thinly spread. No whole nuts under 4 years.`
    : `CHOKING HAZARD PREP: Most hazards resolved. Use common sense — cut large pieces, avoid very hard foods.`;

  return `You are an expert recipe developer in the style of Serious Eats, NYT Cooking, and Blue Apron — technique-forward, well-developed flavor, interesting but achievable on a weeknight. Generate ${ctx.desc} for a family of 2 adults and a ${guide.label}.

RECIPE QUALITY STANDARD: Every recipe must have a clear "why is this delicious" angle — a technique, a sauce, a spice combination, or an ingredient that elevates it above the ordinary. Descriptions should communicate what makes the dish special, not just what it is. Novelty and variety are essential; never default to generic or predictable versions of dishes.

${ctx.guidance}

${mode === 'quick'
  ? '⚡ QUICK MODE — Every recipe MUST have prep_time_min + cook_time_min ≤ 30 combined. No braises, slow cooks, or marinating. Choose fast techniques only: stir-fry, sauté, one-pan, quick assembly. State this clearly in instructions.'
  : 'TIMING CONSTRAINT: Active hands-on cooking time must be realistic for a weeknight. Write instructions in clear, confidence-building steps with technique reasoning where helpful ("pat the chicken dry — this helps browning"). Include a batch_prep_notes field noting what can be prepped 1–3 days ahead for this specific recipe (e.g., "the marinade keeps 3 days refrigerated; the vegetables can be chopped the night before").'}

${equipmentCtx ? equipmentCtx + '\n' : ''}FAMILY PREFERENCES:
${likedCuisines}
${excludedCuisines}
${excludedIngredients}
${dislikedIngredients}

━━━ CHILD NUTRITION RULES (${guide.label}, age range ${guide.ageRange}) — MUST FOLLOW ━━━

DAILY NUTRIENT TARGETS (per child; child portion ≈ ¼–⅓ adult serving):
• Calories: ~${rdas.calories} kcal/day | Fat: ${guide.fatTarget}
• Iron: ${rdas.iron_mg} mg/day — HIGHEST PRIORITY. Biggest deficiency risk; impacts cognition irreversibly
• Zinc: ${rdas.zinc_mg} mg/day | Calcium: ${rdas.calcium_mg} mg/day | Vitamin D: ${rdas.vitamin_d_iu} IU/day
• DHA: ${rdas.dha_mg} mg/day — from fatty fish and eggs
• Choline: ${rdas.choline_mg} mg/day — eggs are the single best source; prioritize them
• Sodium: ${guide.sodiumNote}
• Added sugar: ${guide.sugarNote}

PRIORITY FOODS — embed naturally into recipes every week:
• Eggs (4–5×/week ideally): highest-impact food — choline, DHA, B12, vitamin D, iron. Feature prominently in breakfasts.
• Fatty fish — salmon, sardines, anchovies, trout (1–2×/week, 1–2 oz toddler portion): DHA, vitamin D, B12, iodine. Use "Best Choices" FDA/EPA species only.
• Lean red meat (1–2×/week): most bioavailable iron source; critical for iron-cognition pathway
• Beans/lentils/chickpeas (3–4×/week): non-heme iron, zinc, fiber, folate — pair with vitamin C
• Full-fat plain yogurt and cheese: calcium, fat, protein — use unsweetened only
• Avocado and olive oil: monounsaturated fat for the 50%-fat calorie target
• Vitamin C produce — berries, citrus, bell peppers, kiwi, tomatoes: ALWAYS pair with iron-rich foods in the same meal to multiply non-heme iron absorption several-fold
• Beta-carotene produce — sweet potato, butternut squash, carrots, mango: vitamin A, immunity
• Dark leafy greens — spinach, kale: iron, folate, vitamin K
• Iron-fortified whole-grain cereals: best bridge for toddlers needing extra iron

IRON ABSORPTION RULE: Whenever a recipe contains non-heme iron (beans, lentils, spinach, fortified grains), it MUST include a vitamin C source in the same meal. Do NOT serve large amounts of dairy alongside iron-rich foods.

HARD BLOCKS — never include in any form:
• Honey: ${guide.honeyRule}
• High-mercury fish: shark, swordfish, king mackerel, tilefish (Gulf), marlin, orange roughy, bigeye tuna — NEVER
• Ultra-processed ingredients: deli meats, hot dogs, sausage, sweetened cereals, packaged snack pouches
• High-sodium staples: soy sauce (use low-sodium or coconut aminos), canned goods (rinse or use no-salt-added), bouillon cubes — always flag sodium sources
• Unpasteurized dairy, cheese, or juice
• Juice notes: ${guide.juiceNote}

${chokingSection}

CHILD_NOTES FIELD must include: (1) exact prep modifications for age-appropriate safety, (2) child portion size, (3) which key nutrients this meal contributes, (4) any vitamin C pairing tip if iron-rich.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUTPUT: Respond ONLY with a valid JSON array. No markdown, no explanation.
Each object must have exactly these fields:
{
  "name": string,
  "description": string (1-2 sentences),
  "meal_type": "${mealType}",
  "cuisine": string,
  "prep_time_min": number,
  "cook_time_min": number,
  "servings_adult": 2,
  "ingredients": [{"name": string, "quantity": number, "unit": string, "category": string}],
  "instructions": [string],
  "nutrition": {
    "calories": number,
    "iron_mg": number,
    "zinc_mg": number,
    "calcium_mg": number,
    "vitamin_d_iu": number,
    "dha_mg": number,
    "choline_mg": number,
    "sodium_mg": number,
    "added_sugar_g": number,
    "fat_g": number,
    "protein_g": number,
    "carbs_g": number
  },
  "toddler_safe": boolean,
  "choking_hazards": [string],
  "toddler_notes": string,
  "batch_prep_notes": string,
  "oven_temp": number|null,
  "tags": [string],
  "estimated_cost_usd": number
}
Ingredient categories: produce, dairy, meat, seafood, pantry, frozen, bakery.
Tags should include relevant nutrition markers: "iron-rich", "dha-rich", "egg-based", "legume", "vitamin-c-boost", "low-sodium", etc.

COST ESTIMATION: "estimated_cost_usd" is the per-serving cost in USD at current 2026 US grocery prices. If you have access to web search, USE IT to look up current prices for the main ingredients (especially proteins and produce, which have inflated significantly in 2026). Do NOT rely on outdated training data — 2024/2025 prices are too low. If you cannot search, give a conservative high estimate based on a US national average mid-2026 (assume meat/seafood is 25-40% higher than 2024). Round to nearest dollar.`;
}

// Provider-aware capability matrix. Drives prompt shape, batch size, and pipeline.
function getProviderCapabilities(settings) {
  const provider = settings.provider || 'anthropic';
  const isLocal = ['ollama', 'lmstudio', 'custom'].includes(provider);
  return {
    provider,
    isLocal,
    webSearch: provider === 'anthropic',
    // OpenAI-compat servers (incl. Ollama since v0.5) honor response_format json_object
    jsonMode: provider === 'openai' || isLocal,
    // Local context windows are typically 8k; cloud is much larger
    contextWindow: isLocal ? 8000 : 100000,
    // Single-shot batch size — cloud models can write 12 full recipes in one go, local can't
    recommendedBatchSize: isLocal ? 4 : 12,
    // Local models get the full schema only via chained generation (multiple narrow calls)
    chainedGeneration: isLocal,
    // Only Anthropic with web search produces grounded 2026 prices
    canEstimateCostInline: provider === 'anthropic',
  };
}

function tryParseJSON(text, expectArray = true) {
  const raw = text.replace(/```(?:json)?/g, '').trim();
  const match = expectArray ? raw.match(/\[[\s\S]*\]/) : raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON ${expectArray ? 'array' : 'object'} in response`);
  return JSON.parse(match[0]);
}

// ─── Chained generation (for local models) ────────────────────────────────────

function buildBaseRecipePrompt(mealType, count, prefs, mode) {
  const ctx = MEAL_TYPE_CONTEXT[mealType] || MEAL_TYPE_CONTEXT.dinner;
  const quickLine = mode === 'quick' ? '\nEVERY recipe must be completable in 30 minutes total.' : '';
  const excluded = (prefs?.ingredients?.excluded || []).join(', ') || 'none';
  return `You are a thoughtful family-meal recipe generator. Generate ${count} diverse ${mealType} recipes.
${ctx.guidance}
Vary cuisines and flavors — avoid repeating the same cuisine more than twice.${quickLine}
Excluded ingredients: ${excluded}.

Respond ONLY with a JSON object of the form: {"recipes": [...]} where each recipe has these fields and NOTHING else:
{
  "name": string,
  "description": string,
  "meal_type": "${mealType}",
  "cuisine": string,
  "prep_time_min": number,
  "cook_time_min": number,
  "servings_adult": 2,
  "ingredients": [{"name": string, "quantity": number, "unit": string, "category": "produce|dairy|meat|seafood|pantry|frozen|bakery"}],
  "instructions": [string],
  "tags": [string]
}
No nutrition data, no toddler notes — those come later. Keep ingredient lists realistic and complete.`;
}

function buildNutritionPrompt(recipe) {
  return `For the following recipe, estimate the nutrition per single adult serving. Respond ONLY with a JSON object: {"calories": number, "iron_mg": number, "zinc_mg": number, "calcium_mg": number, "vitamin_d_iu": number, "dha_mg": number, "choline_mg": number, "sodium_mg": number, "added_sugar_g": number, "fat_g": number, "protein_g": number, "carbs_g": number}.

Recipe: ${recipe.name}
Ingredients: ${(recipe.ingredients || []).map(i => `${i.quantity || ''} ${i.unit || ''} ${i.name}`).join(', ')}
Servings: ${recipe.servings_adult || 2}`;
}

function buildToddlerPrompt(recipe) {
  return `For the following recipe and a 16-month-old toddler, return ONLY a JSON object:
{
  "toddler_safe": boolean,
  "choking_hazards": [string],
  "toddler_notes": string,
  "batch_prep_notes": string
}
Choking hazards = any whole-shape items the toddler should NOT eat as-served (e.g. "whole grapes", "round carrot coins"). toddler_notes = 1-2 sentences on how to prep this for the toddler safely (cut shape, texture, portion). batch_prep_notes = 1 line on what can be made ahead.

Recipe: ${recipe.name}
Description: ${recipe.description || ''}
Ingredients: ${(recipe.ingredients || []).map(i => i.name).join(', ')}`;
}

async function generateRecipesChained(mealType, count, prefs, mode) {
  const settings = getLLMSettings();
  const caps = getProviderCapabilities(settings);

  // Stage 1: base recipes (slim schema)
  const baseText = await chat(buildBaseRecipePrompt(mealType, count, prefs, mode), settings, {
    maxTokens: 4000,
    jsonMode: caps.jsonMode,
  });
  let parsed;
  try {
    const obj = tryParseJSON(baseText, false);
    parsed = Array.isArray(obj) ? obj : (obj.recipes || obj.items || []);
  } catch {
    // Fallback: try parsing as bare array
    parsed = tryParseJSON(baseText, true);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Stage 1 produced no recipes');
  }

  // Stage 2 + 3 in parallel per recipe
  await Promise.all(parsed.map(async (r) => {
    try {
      const [nutritionText, toddlerText] = await Promise.all([
        chat(buildNutritionPrompt(r), settings, { maxTokens: 800, jsonMode: caps.jsonMode }),
        chat(buildToddlerPrompt(r), settings, { maxTokens: 600, jsonMode: caps.jsonMode }),
      ]);
      try { r.nutrition = tryParseJSON(nutritionText, false); } catch { r.nutrition = {}; }
      try {
        const t = tryParseJSON(toddlerText, false);
        r.toddler_safe = t.toddler_safe;
        r.choking_hazards = t.choking_hazards || [];
        r.toddler_notes = t.toddler_notes || '';
        r.batch_prep_notes = t.batch_prep_notes || '';
      } catch {
        r.toddler_safe = true;
        r.choking_hazards = [];
        r.toddler_notes = '';
        r.batch_prep_notes = '';
      }
    } catch (err) {
      console.warn(`[chained] enrichment failed for "${r.name}":`, err.message);
    }
    // No cost from local — set to null so it shows up in the "needs prices" backfill
    r.estimated_cost_usd = null;
  }));

  return parsed;
}

async function generateRecipesSingleShot(mealType, count, prefs, topRatedCtx, mode) {
  const settings = getLLMSettings();
  const caps = getProviderCapabilities(settings);
  const ctx = MEAL_TYPE_CONTEXT[mealType] || MEAL_TYPE_CONTEXT.dinner;
  const topRatedLine = topRatedCtx ? `\nHighly rated recipes to draw inspiration from (style/cuisine): ${topRatedCtx}` : '';
  const quickLine = mode === 'quick' ? '\nEVERY recipe must be completable in 30 minutes total — choose only fast-cooking ingredients and techniques.' : '';

  const prompt = `Generate ${count} diverse ${mealType} recipes.
${ctx.minVariety}
Vary cuisines and flavors — avoid repeating the same cuisine more than twice.${topRatedLine}${quickLine}`;

  const text = await chat(prompt, settings, {
    systemPrompt: buildSystemPrompt(mealType, prefs, mode),
    maxTokens: 8000,
    useWebSearch: caps.webSearch,
    jsonMode: caps.jsonMode,
  });

  return tryParseJSON(text, true);
}

async function generateRecipesForType(mealType, count, prefs, topRatedCtx, mode = 'batch') {
  const settings = getLLMSettings();
  const caps = getProviderCapabilities(settings);
  // Chunk to provider's recommended batch size; loop if needed
  const batchSize = Math.min(count, caps.recommendedBatchSize);
  const out = [];
  let remaining = count;
  while (remaining > 0) {
    const thisBatch = Math.min(remaining, batchSize);
    const batch = caps.chainedGeneration
      ? await generateRecipesChained(mealType, thisBatch, prefs, mode)
      : await generateRecipesSingleShot(mealType, thisBatch, prefs, topRatedCtx, mode);
    out.push(...batch);
    remaining -= thisBatch;
    if (batch.length < thisBatch) break; // model gave up early; don't loop forever
  }
  return out;
}

const insertRecipe = db.prepare(`
  INSERT INTO recipes (name, description, meal_type, cuisine, prep_time_min, cook_time_min,
    servings_adult, ingredients, instructions, nutrition, toddler_safe,
    choking_hazards, toddler_notes, batch_prep_notes, oven_temp, tags,
    cost_per_serving, cost_fetched_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function saveRecipes(recipes, mealType) {
  let saved = 0;
  const newIds = [];
  for (const r of recipes) {
    if (!r.name?.trim()) { console.warn('[saveRecipes] Skipping recipe with no name'); continue; }
    try {
      const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
      const hazards = detectChokingHazards(ingredients);
      const cost = Number.isFinite(r.estimated_cost_usd) ? r.estimated_cost_usd : null;
      const result = insertRecipe.run(
        r.name, r.description, r.meal_type || mealType, r.cuisine,
        r.prep_time_min, r.cook_time_min, r.servings_adult || 2,
        JSON.stringify(ingredients),
        JSON.stringify(r.instructions || []),
        JSON.stringify(r.nutrition || {}),
        r.toddler_safe !== false ? 1 : 0,
        JSON.stringify(hazards),
        r.toddler_notes || null,
        r.batch_prep_notes || null,
        r.oven_temp || null,
        JSON.stringify(r.tags || []),
        cost,
        cost != null ? new Date().toISOString() : null
      );
      newIds.push({ id: result.lastInsertRowid, name: r.name, cuisine: r.cuisine, meal_type: r.meal_type || mealType });
      saved++;
    } catch (err) {
      console.error(`[saveRecipes] Failed to insert "${r.name}":`, err.message);
    }
  }
  // Fire image fetches in background — non-blocking, won't slow down save
  if (getPexelsKey()) {
    for (const r of newIds) {
      backgroundFetchImage(r.id, r.name, r.cuisine, r.meal_type);
    }
  }
  return saved;
}

// ─── Pexels image search ──────────────────────────────────────────────────────

function getPexelsKey() {
  if (process.env.PEXELS_API_KEY) return process.env.PEXELS_API_KEY;
  const row = db.prepare("SELECT value FROM settings WHERE key = 'pexels_api_key'").get();
  return row?.value || null;
}

async function searchPexelsPhoto(query) {
  const key = getPexelsKey();
  if (!key) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  try {
    const r = await fetch(url, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.warn(`[pexels] search "${query}" returned ${r.status}`);
      return null;
    }
    const data = await r.json();
    const photo = data.photos?.[0];
    if (!photo) return null;
    return {
      image_url: photo.src?.medium || photo.src?.large || photo.src?.original,
      image_attribution: photo.photographer || 'Pexels',
      image_source_url: photo.url || 'https://www.pexels.com',
    };
  } catch (err) {
    console.warn(`[pexels] search "${query}" failed:`, err.message);
    return null;
  }
}

// Try recipe name → cuisine + meal_type → fallback null
async function findRecipeImage({ name, cuisine, meal_type }) {
  if (name) {
    const r = await searchPexelsPhoto(name);
    if (r) return r;
  }
  if (cuisine && meal_type) {
    const r = await searchPexelsPhoto(`${cuisine} ${meal_type}`);
    if (r) return r;
  }
  if (cuisine) {
    const r = await searchPexelsPhoto(`${cuisine} food`);
    if (r) return r;
  }
  return null;
}

const updateRecipeImage = db.prepare(
  'UPDATE recipes SET image_url = ?, image_attribution = ?, image_source_url = ? WHERE id = ?'
);

// Fire-and-forget image fetch — don't block the caller
async function backgroundFetchImage(recipeId, name, cuisine, meal_type) {
  try {
    const img = await findRecipeImage({ name, cuisine, meal_type });
    if (img) {
      updateRecipeImage.run(img.image_url, img.image_attribution, img.image_source_url, recipeId);
    }
  } catch (err) {
    console.warn(`[image] fetch failed for recipe ${recipeId}:`, err.message);
  }
}

// ─── Routes: Health ───────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/pexels/configured', (req, res) => {
  res.json({ configured: !!getPexelsKey() });
});

// Re-fetch image for one recipe (forces refresh)
app.post('/api/recipes/:id/refresh-image', async (req, res) => {
  try {
    if (!getPexelsKey()) return res.status(400).json({ error: 'Pexels API key not configured' });
    const r = db.prepare('SELECT id, name, cuisine, meal_type FROM recipes WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    const img = await findRecipeImage(r);
    if (!img) return res.json({ ok: false, message: 'No image found' });
    updateRecipeImage.run(img.image_url, img.image_attribution, img.image_source_url, r.id);
    res.json({ ok: true, ...img });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// Refresh recipe prices via Claude + web search, regardless of which model generated them.
// Useful when generation ran on a local model (no web access → no grounded prices).
let priceRefreshInProgress = false;

function getAnthropicSettings() {
  // Find an Anthropic config in llm_configs (active or otherwise) for price grounding.
  const cfg = db.prepare("SELECT * FROM llm_configs WHERE provider = 'anthropic' ORDER BY is_active DESC LIMIT 1").get();
  if (cfg) {
    return {
      provider: 'anthropic',
      model: cfg.model || 'claude-haiku-4-5-20251001',
      api_key: cfg.api_key || process.env.ANTHROPIC_API_KEY,
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', api_key: process.env.ANTHROPIC_API_KEY };
  }
  return null;
}

app.post('/api/recipes/refresh-prices', async (req, res) => {
  const settings = getAnthropicSettings();
  if (!settings?.api_key) return res.status(400).json({ error: 'Anthropic API key not configured (needed for web search)' });
  if (priceRefreshInProgress) return res.status(409).json({ error: 'Price refresh already running' });

  const onlyMissing = req.body?.only_missing !== false;
  const recipes = onlyMissing
    ? db.prepare('SELECT id, name, ingredients FROM recipes WHERE cost_per_serving IS NULL').all()
    : db.prepare('SELECT id, name, ingredients FROM recipes').all();

  res.json({ ok: true, queued: recipes.length });

  priceRefreshInProgress = true;
  (async () => {
    let succeeded = 0;
    for (const r of recipes) {
      try {
        const ingredients = JSON.parse(r.ingredients || '[]')
          .map(i => `${i.quantity || ''} ${i.unit || ''} ${i.name}`.trim())
          .filter(Boolean);
        const prompt = `Estimate the per-serving grocery cost in USD at current 2026 US prices for this recipe. Use web search to look up current prices for the main proteins and produce — 2024/2025 prices are too low. Recipe makes 2 servings.

Recipe: ${r.name}
Ingredients: ${ingredients.join('; ')}

Respond with ONLY a JSON object: {"cost_per_serving": number} where the number is rounded to the nearest dollar.`;
        const text = await chat(prompt, settings, { maxTokens: 800, useWebSearch: true });
        const parsed = tryParseJSON(text, false);
        const cost = Number(parsed.cost_per_serving);
        if (Number.isFinite(cost) && cost > 0) {
          db.prepare('UPDATE recipes SET cost_per_serving = ?, cost_fetched_at = ? WHERE id = ?')
            .run(cost, new Date().toISOString(), r.id);
          succeeded++;
        }
      } catch (err) {
        console.warn(`[refresh-prices] failed for "${r.name}":`, err.message);
      }
      // Tiny gap to avoid rate-limit spikes
      await new Promise(rs => setTimeout(rs, 250));
    }
    console.log(`[refresh-prices] ${succeeded}/${recipes.length} updated`);
    priceRefreshInProgress = false;
  })();
});

app.get('/api/recipes/refresh-prices/status', (req, res) => {
  const remaining = db.prepare('SELECT COUNT(*) as c FROM recipes WHERE cost_per_serving IS NULL').get().c;
  res.json({ in_progress: priceRefreshInProgress, remaining });
});

// Backfill images for all recipes that don't have one yet.
// Runs asynchronously and reports counts.
let backfillInProgress = false;
app.post('/api/recipes/backfill-images', async (req, res) => {
  if (!getPexelsKey()) return res.status(400).json({ error: 'Pexels API key not configured' });
  if (backfillInProgress) return res.status(409).json({ error: 'Backfill already running' });
  const recipes = db.prepare('SELECT id, name, cuisine, meal_type FROM recipes WHERE image_url IS NULL').all();
  res.json({ ok: true, queued: recipes.length });

  backfillInProgress = true;
  (async () => {
    let succeeded = 0;
    for (const r of recipes) {
      try {
        const img = await findRecipeImage(r);
        if (img) {
          updateRecipeImage.run(img.image_url, img.image_attribution, img.image_source_url, r.id);
          succeeded++;
        }
      } catch (err) {
        console.warn(`[backfill] failed for "${r.name}":`, err.message);
      }
      // Throttle: Pexels free tier = 200/hour. 350ms gap = ~170/min cap, fine for short bursts.
      await new Promise(rs => setTimeout(rs, 350));
    }
    console.log(`[backfill] images: ${succeeded}/${recipes.length} fetched`);
    backfillInProgress = false;
  })();
});

app.get('/api/recipes/backfill-images/status', (req, res) => {
  const remaining = db.prepare('SELECT COUNT(*) as c FROM recipes WHERE image_url IS NULL').get().c;
  res.json({ in_progress: backfillInProgress, remaining });
});

// ─── Routes: Recipes ──────────────────────────────────────────────────────────

function extractLDJsonRecipe(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]);
      const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
      for (const item of items) {
        const types = [].concat(item['@type'] || []);
        if (types.includes('Recipe')) return item;
      }
    } catch {}
  }
  return null;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 12000); // cap to avoid token overflow
}

app.post('/api/recipes/import-url', llmLimiter, async (req, res) => {
  const { url, meal_type } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  if (!isSafeExternalUrl(url)) return res.status(400).json({ error: 'Invalid or disallowed URL' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MealPlanner/1.0; +https://meal-planner.lumi-server.dev)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return res.status(400).json({ error: `Failed to fetch URL: ${response.status}` });
    const html = await response.text();

    const ldJson = extractLDJsonRecipe(html);
    const sourceContent = ldJson
      ? `Structured recipe data (JSON-LD):\n${JSON.stringify(ldJson, null, 2)}`
      : `Raw page text (no structured data found):\n${stripHtml(html)}`;

    const settings = getLLMSettings();
    const systemPrompt = `You are a recipe parser. Extract and normalize recipe data into a strict JSON object matching the schema below.
Fill in any missing fields with reasonable estimates. Always add toddler_notes (adaptations for a 16-month-old), batch_prep_notes (how to prep ahead), and nutrition estimates.
Output ONLY a single valid JSON object — no markdown, no explanation.

Schema:
{
  "name": string,
  "description": string (1-2 sentences),
  "meal_type": "${meal_type || 'dinner'}" (breakfast|lunch|dinner|snack),
  "cuisine": string,
  "prep_time_min": number,
  "cook_time_min": number,
  "servings_adult": number,
  "ingredients": [{"name": string, "quantity": number, "unit": string, "category": string}],
  "instructions": [string],
  "nutrition": {"calories": number, "iron_mg": number, "calcium_mg": number, "vitamin_d_iu": number, "dha_mg": number, "fat_g": number, "protein_g": number, "carbs_g": number},
  "toddler_safe": boolean,
  "toddler_notes": string,
  "batch_prep_notes": string,
  "oven_temp": number|null,
  "tags": [string],
  "choking_hazards": [string]
}
Ingredient categories: produce, dairy, meat, seafood, pantry, frozen, bakery.`;

    const text = await chat(
      `Parse this recipe into the required JSON format:\n\n${sourceContent}`,
      settings,
      { systemPrompt, maxTokens: 8000 },
    );

    const raw = text.replace(/```(?:json)?/g, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Could not parse recipe from page' });

    const recipe = JSON.parse(match[0]);
    const saved = saveRecipes([recipe], recipe.meal_type || meal_type || 'dinner');
    const inserted = db.prepare('SELECT * FROM recipes ORDER BY id DESC LIMIT 1').get();
    res.json({ ok: true, saved, recipe: inserted });
  } catch (err) {
    console.error('Import URL error:', err);
    res.status(500).json({ error: safeError(err) });
  }
});

app.post('/api/recipes/generate', llmLimiter, async (req, res) => {
  const counts = {
    breakfast: clampInt(req.body.breakfast, 0, 20, 0),
    lunch:     clampInt(req.body.lunch,     0, 20, 0),
    dinner:    clampInt(req.body.dinner ?? req.body.count, 0, 20, 0),
    snack:     clampInt(req.body.snack,     0, 20, 0),
  };
  const mode = req.body.mode === 'quick' ? 'quick' : 'batch';
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return res.status(400).json({ error: 'Specify at least one meal type count' });
  if (total > 50) return res.status(400).json({ error: 'Total recipe count cannot exceed 50' });

  // SSE stream so the frontend gets per-type progress
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const emit = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const steps = Object.entries(counts).filter(([, c]) => c > 0);
  const prefs = getPreferences();
  const topRatedCtx = getTopRatedContext();
  let totalGenerated = 0;

  for (let i = 0; i < steps.length; i++) {
    const [mealType, count] = steps[i];
    emit({ type: 'start', mealType, count, step: i + 1, totalSteps: steps.length });
    try {
      const recipes = await generateRecipesForType(mealType, count, prefs, topRatedCtx, mode);
      const generated = saveRecipes(recipes, mealType);
      totalGenerated += generated;
      emit({ type: 'done', mealType, generated, step: i + 1, totalSteps: steps.length });
    } catch (err) {
      console.error(`Generation failed for ${mealType}:`, err);
      emit({ type: 'error', mealType, error: safeError(err), step: i + 1, totalSteps: steps.length });
    }
  }

  emit({ type: 'complete', totalGenerated });
  res.end();
});

app.get('/api/recipes', (req, res) => {
  try {
    let query = 'SELECT * FROM recipes WHERE 1=1';
    const params = [];
    if (req.query.meal_type) { query += ' AND meal_type = ?'; params.push(req.query.meal_type); }
    if (req.query.toddler_safe) { query += ' AND toddler_safe = 1'; }
    if (req.query.cuisine) { query += ' AND cuisine LIKE ?'; params.push(`%${req.query.cuisine}%`); }
    if (req.query.max_prep) { query += ' AND prep_time_min <= ?'; params.push(clampInt(req.query.max_prep, 1, 480, 60)); }
    if (req.query.unassigned) { query += ' AND assigned = 0'; }
    if (req.query.in_rotation !== undefined) { query += ' AND in_rotation = ?'; params.push(req.query.in_rotation === '1' ? 1 : 0); }
    // Sort: recommended sorts by score; default by created_at
    if (req.query.sort === 'recommended') {
      query += ' ORDER BY (star_rating * rating_count) DESC, last_used ASC NULLS FIRST, created_at DESC';
    } else if (req.query.sort === 'rating') {
      query += ' ORDER BY star_rating DESC, rating_count DESC';
    } else if (req.query.sort === 'cost') {
      query += ' ORDER BY cost_per_serving IS NULL, cost_per_serving ASC, created_at DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }
    const rows = db.prepare(query).all(...params);
    res.json(rows.map(parseRecipeRow));
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/recipes/recommendations', (req, res) => {
  try {
    const mealType = req.query.meal_type;
    const prefs = getPreferences();
    const excluded = prefs.ingredients.excluded.map(s => s.toLowerCase());
    const likedCuisines = prefs.cuisines.liked;
    const excludedCuisines = prefs.cuisines.excluded;

    let query = `SELECT * FROM recipes WHERE in_rotation = 1`;
    const params = [];
    if (mealType) { query += ' AND meal_type = ?'; params.push(mealType); }
    if (excludedCuisines.length) {
      query += ` AND cuisine NOT IN (${excludedCuisines.map(() => '?').join(',')})`;
      params.push(...excludedCuisines);
    }
    query += ' ORDER BY (star_rating * COALESCE(rating_count, 0)) DESC, last_used ASC NULLS FIRST, created_at DESC LIMIT 30';

    let rows = db.prepare(query).all(...params).map(parseRecipeRow);

    // Filter out excluded ingredients client-side (JSON field)
    if (excluded.length) {
      rows = rows.filter(r => !r.ingredients.some(i => excluded.some(ex => i.name.toLowerCase().includes(ex))));
    }

    // Boost liked cuisines to top
    if (likedCuisines.length) {
      rows.sort((a, b) => {
        const aLiked = likedCuisines.includes(a.cuisine) ? 1 : 0;
        const bLiked = likedCuisines.includes(b.cuisine) ? 1 : 0;
        return bLiked - aLiked;
      });
    }

    res.json(rows.slice(0, 20));
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(parseRecipeRow(row));
});

app.post('/api/recipes/:id/rate', (req, res) => {
  try {
    const stars = Number(req.body.stars);
    if (stars < 1 || stars > 5) return res.status(400).json({ error: 'stars must be 1-5' });
    const recipe = db.prepare('SELECT star_rating, rating_count FROM recipes WHERE id = ?').get(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Not found' });

    const newCount = (recipe.rating_count || 0) + 1;
    const newRating = ((recipe.star_rating || 0) * (recipe.rating_count || 0) + stars) / newCount;
    // Pull out of rotation if rated 1 star twice or average drops below 2
    const inRotation = newRating < 2 && newCount >= 2 ? 0 : 1;

    db.prepare(`
      UPDATE recipes SET star_rating = ?, rating_count = ?, in_rotation = ? WHERE id = ?
    `).run(newRating, newCount, inRotation, req.params.id);

    res.json({ star_rating: newRating, rating_count: newCount, in_rotation: inRotation });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.patch('/api/recipes/:id', (req, res) => {
  try {
    const { in_rotation } = req.body;
    if (in_rotation !== undefined) {
      db.prepare('UPDATE recipes SET in_rotation = ? WHERE id = ?').run(in_rotation ? 1 : 0, req.params.id);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.put('/api/recipes/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT id FROM recipes WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const {
      name, description, cuisine, meal_type,
      prep_time_min, cook_time_min, servings_adult,
      ingredients, instructions,
      toddler_notes, batch_prep_notes, choking_hazards,
      nutrition, tags,
    } = req.body;

    if (name !== undefined && (!name || typeof name !== 'string')) return res.status(400).json({ error: 'name must be a non-empty string' });

    const fields = [];
    const params = [];
    const set = (col, val) => { fields.push(`${col} = ?`); params.push(val); };

    if (name !== undefined)             set('name', String(name).trim().slice(0, 200));
    if (description !== undefined)      set('description', String(description).slice(0, 2000));
    if (cuisine !== undefined)          set('cuisine', String(cuisine).slice(0, 100));
    if (meal_type !== undefined)        set('meal_type', ['breakfast','lunch','dinner','snack'].includes(meal_type) ? meal_type : 'dinner');
    if (prep_time_min !== undefined)    set('prep_time_min', clampInt(prep_time_min, 0, 600, 0));
    if (cook_time_min !== undefined)    set('cook_time_min', clampInt(cook_time_min, 0, 600, 0));
    if (servings_adult !== undefined)   set('servings_adult', clampInt(servings_adult, 1, 20, 2));
    if (ingredients !== undefined)      set('ingredients', JSON.stringify(Array.isArray(ingredients) ? ingredients : []));
    if (instructions !== undefined)     set('instructions', JSON.stringify(Array.isArray(instructions) ? instructions : []));
    if (toddler_notes !== undefined)    set('toddler_notes', String(toddler_notes).slice(0, 2000));
    if (batch_prep_notes !== undefined) set('batch_prep_notes', String(batch_prep_notes).slice(0, 2000));
    if (choking_hazards !== undefined)  set('choking_hazards', JSON.stringify(Array.isArray(choking_hazards) ? choking_hazards : []));
    if (nutrition !== undefined)        set('nutrition', JSON.stringify(typeof nutrition === 'object' ? nutrition : {}));
    if (tags !== undefined)             set('tags', JSON.stringify(Array.isArray(tags) ? tags : []));

    if (fields.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    params.push(req.params.id);
    db.prepare(`UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
    res.json(parseRecipeRow(updated));
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.delete('/api/recipes/:id', (req, res) => {
  db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Routes: Collections ──────────────────────────────────────────────────────

app.get('/api/collections', (req, res) => {
  const cols = db.prepare('SELECT c.*, COUNT(cr.recipe_id) as recipe_count FROM collections c LEFT JOIN collection_recipes cr ON cr.collection_id = c.id GROUP BY c.id ORDER BY c.name').all();
  res.json(cols);
});

app.post('/api/collections', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' });
    const result = db.prepare('INSERT INTO collections (name) VALUES (?)').run(name.trim().slice(0, 100));
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Collection name already exists' });
    res.status(500).json({ error: safeError(err) });
  }
});

app.delete('/api/collections/:id', (req, res) => {
  db.prepare('DELETE FROM collections WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/collections/:id/recipes', (req, res) => {
  const rows = db.prepare(`
    SELECT r.* FROM recipes r
    JOIN collection_recipes cr ON cr.recipe_id = r.id
    WHERE cr.collection_id = ?
    ORDER BY r.name
  `).all(req.params.id);
  res.json(rows.map(parseRecipeRow));
});

app.post('/api/collections/:id/recipes/:recipeId', (req, res) => {
  try {
    db.prepare('INSERT OR IGNORE INTO collection_recipes (collection_id, recipe_id) VALUES (?, ?)').run(req.params.id, req.params.recipeId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.delete('/api/collections/:id/recipes/:recipeId', (req, res) => {
  db.prepare('DELETE FROM collection_recipes WHERE collection_id = ? AND recipe_id = ?').run(req.params.id, req.params.recipeId);
  res.json({ ok: true });
});

// Which collections contain a given recipe
app.get('/api/recipes/:id/collections', (req, res) => {
  const rows = db.prepare('SELECT collection_id FROM collection_recipes WHERE recipe_id = ?').all(req.params.id);
  res.json(rows.map(r => r.collection_id));
});

// ─── Routes: Preferences ──────────────────────────────────────────────────────

app.get('/api/preferences', (req, res) => {
  res.json(getPreferences());
});

app.post('/api/preferences', (req, res) => {
  try {
    const { type, name, preference } = req.body;
    if (!['cuisine', 'ingredient'].includes(type)) return res.status(400).json({ error: 'type must be cuisine or ingredient' });
    if (!['liked', 'disliked', 'excluded'].includes(preference)) return res.status(400).json({ error: 'preference must be liked, disliked, or excluded' });
    db.prepare(`
      INSERT INTO preferences (type, name, preference) VALUES (?, ?, ?)
      ON CONFLICT(type, name) DO UPDATE SET preference = excluded.preference
    `).run(type, name, preference);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.delete('/api/preferences', (req, res) => {
  try {
    const { type, name } = req.body;
    db.prepare('DELETE FROM preferences WHERE type = ? AND name = ?').run(type, name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// ─── Routes: Meal Plans ───────────────────────────────────────────────────────

app.get('/api/meal-plans/current', (req, res) => {
  try {
    const monday = getMonday(new Date());
    let plan = db.prepare('SELECT * FROM meal_plans WHERE week_start = ?').get(monday);
    if (!plan) {
      const result = db.prepare("INSERT INTO meal_plans (week_start, status) VALUES (?, 'draft')").run(monday);
      plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(result.lastInsertRowid);
    }
    const items = db.prepare(`
      SELECT mpi.*, r.name, r.description, r.cuisine, r.meal_type as recipe_meal_type,
             r.prep_time_min, r.cook_time_min, r.nutrition, r.toddler_safe,
             r.choking_hazards, r.toddler_notes, r.batch_prep_notes,
             r.oven_temp, r.tags, r.ingredients, r.star_rating, r.rating_count,
             r.cost_per_serving
      FROM meal_plan_items mpi
      JOIN recipes r ON r.id = mpi.recipe_id
      WHERE mpi.meal_plan_id = ?
      ORDER BY mpi.is_alternate ASC, mpi.day_of_week, mpi.meal_type
    `).all(plan.id);

    res.json({
      ...plan,
      items: items.map(row => ({
        ...row,
        nutrition: JSON.parse(row.nutrition || '{}'),
        choking_hazards: JSON.parse(row.choking_hazards || '[]'),
        tags: JSON.parse(row.tags || '[]'),
        ingredients: JSON.parse(row.ingredients || '[]'),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/meal-plans', (req, res) => {
  res.json(db.prepare('SELECT * FROM meal_plans ORDER BY week_start DESC LIMIT 20').all());
});

app.post('/api/meal-plans', (req, res) => {
  try {
    const { week_start, notes } = req.body;
    const result = db.prepare("INSERT INTO meal_plans (week_start, status, notes) VALUES (?, 'draft', ?)").run(week_start, notes || null);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.post('/api/meal-plans/:id/items', (req, res) => {
  try {
    const { recipe_id, meal_type, day_of_week, servings_adult, servings_toddler, notes } = req.body;
    const result = db.prepare(`
      INSERT INTO meal_plan_items (meal_plan_id, recipe_id, meal_type, day_of_week, servings_adult, servings_toddler, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, recipe_id, meal_type || 'dinner', day_of_week ?? null, servings_adult || 2, servings_toddler || 1, notes || null);
    db.prepare('UPDATE recipes SET assigned = 1 WHERE id = ?').run(recipe_id);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.put('/api/meal-plans/:id/items/:itemId', (req, res) => {
  try {
    const { day_of_week, meal_type, servings_adult, servings_toddler, notes } = req.body;
    db.prepare(`
      UPDATE meal_plan_items SET day_of_week = ?, meal_type = ?, servings_adult = ?, servings_toddler = ?, notes = ?
      WHERE id = ? AND meal_plan_id = ?
    `).run(day_of_week ?? null, meal_type || 'dinner', servings_adult || 2, servings_toddler || 1, notes || null, req.params.itemId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.delete('/api/meal-plans/:id/items/:itemId', (req, res) => {
  try {
    const item = db.prepare('SELECT recipe_id FROM meal_plan_items WHERE id = ? AND meal_plan_id = ?').get(req.params.itemId, req.params.id);
    if (item) {
      db.prepare('DELETE FROM meal_plan_items WHERE id = ?').run(req.params.itemId);
      const stillUsed = db.prepare('SELECT COUNT(*) as c FROM meal_plan_items WHERE recipe_id = ?').get(item.recipe_id).c;
      if (!stillUsed) db.prepare('UPDATE recipes SET assigned = 0 WHERE id = ?').run(item.recipe_id);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// Auto-curate: pick N recipes for the week + stash extras as alternates.
// Strategies: 'overlap' (default) maximizes shared ingredients to minimize shopping;
// 'top-rated' picks highest-scored recipes regardless of overlap.
app.post('/api/meal-plans/:id/auto-curate', (req, res) => {
  try {
    const planId = Number(req.params.id);
    const plan = db.prepare('SELECT id FROM meal_plans WHERE id = ?').get(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const strategy = req.body.strategy === 'top-rated' ? 'top-rated' : 'overlap';
    const days = clampInt(req.body.days, 1, 7, 5);
    const mealType = req.body.meal_type || 'dinner';
    const altCount = clampInt(req.body.alternates, 0, 20, 8);

    const candidates = db.prepare(`
      SELECT id, name, ingredients, star_rating, rating_count, cost_per_serving, last_used
      FROM recipes
      WHERE in_rotation = 1 AND meal_type = ?
      ORDER BY (star_rating * COALESCE(rating_count, 0)) DESC, last_used ASC NULLS FIRST
    `).all(mealType);

    if (candidates.length === 0) {
      return res.status(400).json({ error: 'No recipes available — generate some first' });
    }

    // Normalize ingredient names for overlap comparison
    const ingSet = (recipe) => {
      const ing = JSON.parse(recipe.ingredients || '[]');
      return new Set(ing.map(i => (i.name || '').toLowerCase().trim()).filter(Boolean));
    };

    let picked = [];
    if (strategy === 'overlap') {
      // Greedy: start with top-rated, then iteratively add the recipe with highest ingredient overlap with the running set
      const remaining = [...candidates];
      const first = remaining.shift();
      picked.push(first);
      const usedIngredients = new Set(ingSet(first));

      while (picked.length < days && remaining.length) {
        let bestIdx = 0;
        let bestScore = -1;
        for (let i = 0; i < remaining.length; i++) {
          const ing = ingSet(remaining[i]);
          let overlap = 0;
          for (const x of ing) if (usedIngredients.has(x)) overlap++;
          // Tiebreak by quality score
          const quality = (remaining[i].star_rating || 0) * (remaining[i].rating_count || 0);
          const score = overlap * 1000 + quality;
          if (score > bestScore) { bestScore = score; bestIdx = i; }
        }
        const next = remaining.splice(bestIdx, 1)[0];
        picked.push(next);
        for (const x of ingSet(next)) usedIngredients.add(x);
      }
    } else {
      picked = candidates.slice(0, days);
    }

    // Pool of alternates: top of remaining (excluding already picked)
    const pickedIds = new Set(picked.map(r => r.id));
    const alternates = candidates.filter(r => !pickedIds.has(r.id)).slice(0, altCount);

    db.transaction(() => {
      // Clear existing items (both primary and alternate) for this plan
      db.prepare('DELETE FROM meal_plan_items WHERE meal_plan_id = ?').run(planId);
      const insertItem = db.prepare(`
        INSERT INTO meal_plan_items (meal_plan_id, recipe_id, meal_type, day_of_week, servings_adult, servings_toddler, is_alternate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      picked.forEach((r, i) => insertItem.run(planId, r.id, mealType, i, 2, 1, 0));
      alternates.forEach(r => insertItem.run(planId, r.id, mealType, null, 2, 1, 1));

      // Update assigned flag on primary picks
      const setAssigned = db.prepare('UPDATE recipes SET assigned = 1 WHERE id = ?');
      picked.forEach(r => setAssigned.run(r.id));
    })();

    res.json({
      ok: true,
      strategy,
      days,
      picked: picked.length,
      alternates: alternates.length,
    });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// Swap a primary day item with one from the alternates pool — they trade roles.
app.post('/api/meal-plans/:id/items/:itemId/swap', (req, res) => {
  try {
    const planId = Number(req.params.id);
    const primaryId = Number(req.params.itemId);
    const alternateId = Number(req.body.alternate_id);
    if (!alternateId) return res.status(400).json({ error: 'alternate_id required' });

    const primary = db.prepare('SELECT * FROM meal_plan_items WHERE id = ? AND meal_plan_id = ?').get(primaryId, planId);
    const alternate = db.prepare('SELECT * FROM meal_plan_items WHERE id = ? AND meal_plan_id = ?').get(alternateId, planId);
    if (!primary || !alternate) return res.status(404).json({ error: 'Item not found' });

    db.transaction(() => {
      // Promote alternate to take the primary's day slot
      db.prepare(`
        UPDATE meal_plan_items SET day_of_week = ?, is_alternate = 0 WHERE id = ?
      `).run(primary.day_of_week, alternate.id);
      // Demote former primary into the alternates pool
      db.prepare(`
        UPDATE meal_plan_items SET day_of_week = NULL, is_alternate = 1 WHERE id = ?
      `).run(primary.id);
      // Assigned flag cleanup: alternate's recipe is now in use, primary's may not be
      db.prepare('UPDATE recipes SET assigned = 1 WHERE id = ?').run(alternate.recipe_id);
      const stillUsed = db.prepare(
        'SELECT COUNT(*) as c FROM meal_plan_items WHERE recipe_id = ? AND is_alternate = 0'
      ).get(primary.recipe_id).c;
      if (!stillUsed) db.prepare('UPDATE recipes SET assigned = 0 WHERE id = ?').run(primary.recipe_id);
    })();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/meal-plans/:id/nutrition', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT mpi.servings_toddler, mpi.servings_adult, r.nutrition
      FROM meal_plan_items mpi JOIN recipes r ON r.id = mpi.recipe_id
      WHERE mpi.meal_plan_id = ? AND COALESCE(mpi.is_alternate, 0) = 0
    `).all(req.params.id);

    const totals = { iron_mg: 0, calcium_mg: 0, vitamin_d_iu: 0, dha_mg: 0, zinc_mg: 0, choline_mg: 0, calories: 0 };
    const adultTotals = { protein_g: 0, calories: 0, dha_mg: 0, iron_mg: 0 };
    for (const item of items) {
      const n = JSON.parse(item.nutrition || '{}');
      const ts = item.servings_toddler || 1;
      const as_ = item.servings_adult || 2;
      totals.iron_mg += (n.iron_mg || 0) * ts;
      totals.calcium_mg += (n.calcium_mg || 0) * ts;
      totals.vitamin_d_iu += (n.vitamin_d_iu || 0) * ts;
      totals.dha_mg += (n.dha_mg || 0) * ts;
      totals.zinc_mg += (n.zinc_mg || 0) * ts;
      totals.choline_mg += (n.choline_mg || 0) * ts;
      totals.calories += (n.calories || 0) * ts;
      adultTotals.protein_g += (n.protein_g || 0) * as_;
      adultTotals.calories += (n.calories || 0) * as_;
      adultTotals.dha_mg += (n.dha_mg || 0) * as_;
      adultTotals.iron_mg += (n.iron_mg || 0) * as_;
    }

    const dailyRdas = getToddlerRDAs();
    const rdas = Object.fromEntries(Object.entries(dailyRdas).map(([k, v]) => [k, v * 7]));
    const pctOf = (k) => rdas[k] ? Math.round((totals[k] / rdas[k]) * 100) : 0;

    const goalsRow = db.prepare("SELECT value FROM settings WHERE key = 'adult_goals'").get();
    const adultGoals = goalsRow ? { ...{ protein_g: 150, calories: 2200, omega3_mg: 1600, iron_mg: 18 }, ...JSON.parse(goalsRow.value) } : { protein_g: 150, calories: 2200, omega3_mg: 1600, iron_mg: 18 };

    res.json({
      totals, rdas,
      pct: {
        iron_mg: pctOf('iron_mg'),
        calcium_mg: pctOf('calcium_mg'),
        vitamin_d_iu: pctOf('vitamin_d_iu'),
        dha_mg: pctOf('dha_mg'),
        zinc_mg: pctOf('zinc_mg'),
        choline_mg: pctOf('choline_mg'),
        calories: pctOf('calories'),
      },
      adult_totals: adultTotals,
      adult_goals: adultGoals,
      meal_count: items.length,
    });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// Sum estimated cost of primary (non-alternate) items in a plan
app.get('/api/meal-plans/:id/cost', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT mpi.servings_adult, mpi.servings_toddler, r.cost_per_serving
      FROM meal_plan_items mpi JOIN recipes r ON r.id = mpi.recipe_id
      WHERE mpi.meal_plan_id = ? AND COALESCE(mpi.is_alternate, 0) = 0
    `).all(req.params.id);

    let total = 0;
    let withCost = 0;
    let totalServings = 0;
    for (const item of items) {
      const servings = (item.servings_adult || 0) + (item.servings_toddler || 0) * 0.5;
      totalServings += servings;
      if (Number.isFinite(item.cost_per_serving) && item.cost_per_serving > 0) {
        total += item.cost_per_serving * servings;
        withCost++;
      }
    }
    res.json({
      total_usd: Math.round(total * 100) / 100,
      meals: items.length,
      meals_with_cost_data: withCost,
      total_servings: Math.round(totalServings * 10) / 10,
    });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// Mark plan as used — updates last_used and use_count on all recipes in the plan
app.post('/api/meal-plans/:id/complete', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Only mark primary items as used, not alternates
    const items = db.prepare('SELECT recipe_id FROM meal_plan_items WHERE meal_plan_id = ? AND COALESCE(is_alternate, 0) = 0').all(req.params.id);
    db.transaction(() => {
      for (const item of items) {
        db.prepare('UPDATE recipes SET last_used = ?, use_count = use_count + 1, assigned = 0 WHERE id = ?').run(today, item.recipe_id);
      }
      db.prepare("UPDATE meal_plans SET status = 'completed' WHERE id = ?").run(req.params.id);
    })();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// ─── Routes: Plan Templates ───────────────────────────────────────────────────

app.get('/api/plan-templates', (req, res) => {
  const templates = db.prepare('SELECT t.*, COUNT(ti.id) as meal_count FROM plan_templates t LEFT JOIN plan_template_items ti ON ti.template_id = t.id GROUP BY t.id ORDER BY t.created_at DESC').all();
  res.json(templates);
});

app.post('/api/plan-templates', (req, res) => {
  try {
    const { name, plan_id } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' });
    if (!plan_id) return res.status(400).json({ error: 'plan_id required' });

    const items = db.prepare('SELECT recipe_id, meal_type, day_of_week, servings_adult, servings_toddler FROM meal_plan_items WHERE meal_plan_id = ? AND COALESCE(is_alternate, 0) = 0').all(plan_id);
    if (!items.length) return res.status(400).json({ error: 'Plan has no meals to save' });

    const result = db.prepare('INSERT INTO plan_templates (name) VALUES (?)').run(name.trim().slice(0, 100));
    const templateId = result.lastInsertRowid;
    const insertItem = db.prepare('INSERT INTO plan_template_items (template_id, recipe_id, meal_type, day_of_week, servings_adult, servings_toddler) VALUES (?, ?, ?, ?, ?, ?)');
    db.transaction(() => {
      for (const item of items) insertItem.run(templateId, item.recipe_id, item.meal_type, item.day_of_week, item.servings_adult, item.servings_toddler);
    })();

    res.json({ id: templateId, name: name.trim(), meal_count: items.length });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.delete('/api/plan-templates/:id', (req, res) => {
  db.prepare('DELETE FROM plan_templates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/meal-plans/from-template/:id', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT ti.recipe_id, ti.meal_type, ti.day_of_week, ti.servings_adult, ti.servings_toddler, r.id as rid
      FROM plan_template_items ti JOIN recipes r ON r.id = ti.recipe_id
      WHERE ti.template_id = ?
    `).all(req.params.id);
    if (!items.length) return res.status(400).json({ error: 'Template has no items or recipes were deleted' });

    const monday = (() => {
      const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7);
      return d.toISOString().slice(0, 10);
    })();
    let plan = db.prepare('SELECT * FROM meal_plans WHERE week_start = ?').get(monday);
    if (!plan) {
      const r = db.prepare("INSERT INTO meal_plans (week_start, status) VALUES (?, 'draft')").run(monday);
      plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(r.lastInsertRowid);
    }
    // Clear existing items first
    db.prepare('DELETE FROM meal_plan_items WHERE meal_plan_id = ?').run(plan.id);
    const insertItem = db.prepare('INSERT INTO meal_plan_items (meal_plan_id, recipe_id, meal_type, day_of_week, servings_adult, servings_toddler) VALUES (?, ?, ?, ?, ?, ?)');
    db.transaction(() => {
      for (const item of items) insertItem.run(plan.id, item.recipe_id, item.meal_type, item.day_of_week, item.servings_adult, item.servings_toddler);
    })();
    res.json({ ok: true, plan_id: plan.id, loaded: items.length });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// ─── Routes: Shopping Lists ───────────────────────────────────────────────────

app.post('/api/shopping-lists', (req, res) => {
  try {
    const { meal_plan_id } = req.body;
    // Exclude alternates — they're not actually being cooked, so don't shop for them
    const items = db.prepare(`
      SELECT mpi.servings_adult, mpi.servings_toddler, r.ingredients
      FROM meal_plan_items mpi JOIN recipes r ON r.id = mpi.recipe_id
      WHERE mpi.meal_plan_id = ? AND COALESCE(mpi.is_alternate, 0) = 0
    `).all(meal_plan_id);

    const pantry = db.prepare('SELECT ingredient_name, quantity, unit FROM pantry_items').all();
    const pantryMap = {};
    for (const p of pantry) pantryMap[p.ingredient_name.toLowerCase()] = { quantity: p.quantity, unit: p.unit };

    const aggregated = {};
    for (const item of items) {
      const ingredients = JSON.parse(item.ingredients || '[]');
      const scale = (item.servings_adult + item.servings_toddler * 0.5) / 2;
      for (const ing of ingredients) {
        const key = ing.name.toLowerCase();
        if (!aggregated[key]) aggregated[key] = { ingredient_name: ing.name, quantity: 0, unit: ing.unit, category: ing.category || 'pantry' };
        aggregated[key].quantity += (ing.quantity || 0) * scale;
      }
    }

    for (const key of Object.keys(aggregated)) {
      if (pantryMap[key] && pantryMap[key].unit === aggregated[key].unit) {
        aggregated[key].quantity = Math.max(0, aggregated[key].quantity - (pantryMap[key].quantity || 0));
      }
    }

    const result = db.prepare("INSERT INTO shopping_lists (meal_plan_id, status) VALUES (?, 'pending')").run(meal_plan_id);
    const listId = result.lastInsertRowid;
    const insertItem = db.prepare('INSERT INTO shopping_list_items (shopping_list_id, ingredient_name, quantity, unit, category) VALUES (?, ?, ?, ?, ?)');
    const CATEGORY_ORDER = ['produce', 'meat', 'seafood', 'dairy', 'frozen', 'bakery', 'pantry'];
    const sorted = Object.values(aggregated).filter(i => i.quantity > 0).sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
    db.transaction(() => { for (const i of sorted) insertItem.run(listId, i.ingredient_name, Math.ceil(i.quantity * 10) / 10, i.unit, i.category); })();
    res.json({ id: listId });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/shopping-lists/:id', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
    if (!list) return res.status(404).json({ error: 'Not found' });
    const items = db.prepare('SELECT * FROM shopping_list_items WHERE shopping_list_id = ? ORDER BY category, ingredient_name').all(req.params.id);
    res.json({ ...list, items });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/shopping-lists/for-plan/:planId', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM shopping_lists WHERE meal_plan_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.planId);
    if (!list) return res.json(null);
    const items = db.prepare('SELECT * FROM shopping_list_items WHERE shopping_list_id = ? ORDER BY category, ingredient_name').all(list.id);
    res.json({ ...list, items });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.patch('/api/shopping-lists/:id/items/:itemId', (req, res) => {
  try {
    db.prepare('UPDATE shopping_list_items SET checked = ? WHERE id = ? AND shopping_list_id = ?').run(req.body.checked ? 1 : 0, req.params.itemId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

app.get('/api/shopping-lists/:id/export', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
    if (!list) return res.status(404).json({ error: 'Not found' });
    const items = db.prepare('SELECT * FROM shopping_list_items WHERE shopping_list_id = ? ORDER BY category, ingredient_name').all(req.params.id);
    const LABELS = { produce: '🥦 Produce', meat: '🥩 Meat & Poultry', seafood: '🐟 Seafood', dairy: '🧀 Dairy & Eggs', frozen: '🧊 Frozen', bakery: '🍞 Bakery', pantry: '🫙 Pantry & Dry Goods' };
    const grouped = {};
    for (const item of items) {
      const cat = item.category || 'pantry';
      if (!grouped[cat]) grouped[cat] = [];
      const qty = item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : '';
      grouped[cat].push(`  ${item.checked ? '☑' : '☐'} ${item.ingredient_name}${qty ? ` — ${qty}` : ''}`);
    }
    const lines = ['SHOPPING LIST', '='.repeat(40), ''];
    for (const [cat, catItems] of Object.entries(grouped)) { lines.push(LABELS[cat] || cat); lines.push(...catItems); lines.push(''); }
    res.setHeader('Content-Type', 'text/plain');
    res.send(lines.join('\n'));
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// ─── Routes: Prep Guide ───────────────────────────────────────────────────────

app.get('/api/meal-plans/:id/prep-guide', llmLimiter, async (req, res) => {
  try {
    const { prep_day = 'Saturday', prep_start = '10:00', prep_duration = '90' } = req.query;
    const duration = clampInt(prep_duration, 15, 480, 90);

    const items = db.prepare(
      `SELECT r.name, r.meal_type, r.ingredients, r.prep_time_min, r.cook_time_min, r.batch_prep_notes, mpi.day_of_week
       FROM meal_plan_items mpi
       JOIN recipes r ON r.id = mpi.recipe_id
       WHERE mpi.meal_plan_id = ?`
    ).all(req.params.id);

    if (!items.length) return res.status(400).json({ error: 'No recipes in this plan' });

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const recipeList = items.map(r => ({
      name: r.name,
      meal_type: r.meal_type,
      day: r.day_of_week != null ? DAYS[r.day_of_week] : 'Unscheduled',
      prep_min: r.prep_time_min,
      cook_min: r.cook_time_min,
      ingredients: JSON.parse(r.ingredients || '[]').map(i => `${i.quantity} ${i.unit} ${i.name}`.trim()),
      recipe_prep_tip: r.batch_prep_notes || '',
    }));

    const settings = getLLMSettings();
    const prompt = `Generate a time-blocked batch prep schedule for a ${duration}-minute session starting at ${prep_start} on ${prep_day}.

Planned meals:
${JSON.stringify(recipeList, null, 2)}

Output a JSON object with this exact structure:
{
  "prep_day": "${prep_day}",
  "start_time": "${prep_start}",
  "end_time": string (calculated finish time, e.g. "11:30"),
  "estimated_total_min": number (sum of all slot durations),
  "overage_warning": string|null (if total exceeds ${duration} min, a friendly suggestion of what to skip or do the night before),
  "slots": [
    {
      "time": string (start time of this slot, e.g. "10:00"),
      "duration_min": number,
      "task": string (specific and actionable — e.g. "Dice 2 onions and 3 carrots"),
      "used_in": [string] (recipe names this step serves),
      "tip": string|null (storage tip, technique note, or parallel task note)
    }
  ],
  "notes": string (overall advice — what NOT to prep ahead, fridge labeling tips, etc.)
}

Rules:
- Tasks MUST fit within ${duration} min total. If they don't, flag overage_warning and prioritize the highest-value prep.
- Combine parallel passive tasks into one slot (e.g. "Start grain cook while preheating oven — active 5 min, passive 20 min").
- Order: passive/hands-off tasks first (marinating, soaking, boiling water), then chopping aromatics, then portioning proteins.
- Group identical prep across recipes: "Mince garlic (4 cloves) for Meatballs and Grain Bowl — store in olive oil."
- Include oven preheat as a slot if any recipe needs it; batch oven tasks together.
- Only prep what's stable ahead: aromatics, grains, marinated proteins, roasted veg. Never raw fish, avocado, dressed salads, fresh herbs.
- Be specific with quantities (e.g. "3 medium onions" not "onions").
- Respond ONLY with valid JSON.`;

    const text = await chat(prompt, settings, { maxTokens: 4000 });
    const match = text.replace(/```(?:json)?/g, '').trim().match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Could not generate prep schedule' });

    res.json(JSON.parse(match[0]));
  } catch (err) {
    console.error('Prep guide error:', err);
    res.status(500).json({ error: safeError(err) });
  }
});

// ─── Routes: Pantry ───────────────────────────────────────────────────────────

app.get('/api/pantry', (req, res) => res.json(db.prepare('SELECT * FROM pantry_items ORDER BY category, ingredient_name').all()));

app.post('/api/pantry', (req, res) => {
  try {
    const { ingredient_name, quantity, unit, category, notes } = req.body;
    const result = db.prepare(`INSERT INTO pantry_items (ingredient_name, quantity, unit, category, notes) VALUES (?, ?, ?, ?, ?) ON CONFLICT(ingredient_name) DO UPDATE SET quantity=excluded.quantity, unit=excluded.unit, category=excluded.category, notes=excluded.notes, updated_at=CURRENT_TIMESTAMP`).run(ingredient_name, quantity || null, unit || null, category || 'pantry', notes || null);
    res.json({ id: result.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.patch('/api/pantry/:id', (req, res) => {
  try {
    const { quantity, unit, category, notes } = req.body;
    db.prepare('UPDATE pantry_items SET quantity=?, unit=?, category=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(quantity || null, unit || null, category || 'pantry', notes || null, req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.delete('/api/pantry/:id', (req, res) => { db.prepare('DELETE FROM pantry_items WHERE id = ?').run(req.params.id); res.json({ ok: true }); });

// ─── Routes: Equipment ────────────────────────────────────────────────────────

app.get('/api/equipment', (req, res) => res.json(db.prepare('SELECT * FROM equipment ORDER BY name').all()));

app.post('/api/equipment', (req, res) => {
  try {
    const { name, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const result = db.prepare('INSERT INTO equipment (name, notes) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET notes=excluded.notes, updated_at=CURRENT_TIMESTAMP').run(name.trim(), notes || null);
    res.json({ id: result.lastInsertRowid, name: name.trim(), notes: notes || null });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.patch('/api/equipment/:id', (req, res) => {
  try {
    const { name, notes } = req.body;
    db.prepare('UPDATE equipment SET name=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name, notes || null, req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.delete('/api/equipment/:id', (req, res) => { db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id); res.json({ ok: true }); });

// ─── Routes: Allergens ───────────────────────────────────────────────────────

const ALLERGENS = ['Peanuts','Tree Nuts','Eggs','Dairy','Wheat','Soy','Fish','Shellfish','Sesame'];

app.get('/api/allergens', (req, res) => {
  const rows = db.prepare('SELECT * FROM allergen_exposures ORDER BY allergen').all();
  const map = {};
  for (const r of rows) map[r.allergen] = r;
  res.json(ALLERGENS.map(a => map[a] || { allergen: a, status: 'not_introduced', first_introduced_date: null, last_in_plan_date: null, reaction: null, notes: null }));
});

app.post('/api/allergens', (req, res) => {
  try {
    const { allergen, status, first_introduced_date, reaction, notes } = req.body;
    if (!ALLERGENS.includes(allergen)) return res.status(400).json({ error: 'Unknown allergen' });
    db.prepare(`INSERT INTO allergen_exposures (allergen, status, first_introduced_date, reaction, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(allergen) DO UPDATE SET status=excluded.status, first_introduced_date=COALESCE(excluded.first_introduced_date, first_introduced_date), reaction=excluded.reaction, notes=excluded.notes, updated_at=CURRENT_TIMESTAMP`)
      .run(allergen, status || 'introduced', first_introduced_date || new Date().toISOString().slice(0,10), reaction || null, notes || null);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.delete('/api/allergens/:allergen', (req, res) => {
  db.prepare('DELETE FROM allergen_exposures WHERE allergen = ?').run(req.params.allergen);
  res.json({ ok: true });
});

// ─── Routes: Cook Log ─────────────────────────────────────────────────────────

app.post('/api/recipes/:id/cooked', (req, res) => {
  try {
    const id = req.params.id;
    const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(id);
    if (!recipe) return res.status(404).json({ error: 'Not found' });
    db.prepare('INSERT INTO cook_log (recipe_id, notes) VALUES (?, ?)').run(id, req.body.notes || null);
    db.prepare('UPDATE recipes SET cook_count = cook_count + 1, last_cooked_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.get('/api/cook-history', (req, res) => {
  const limit = clampInt(req.query.limit, 1, 100, 20);
  const rows = db.prepare(`
    SELECT cl.id, cl.cooked_at, cl.notes, r.id as recipe_id, r.name, r.cuisine, r.meal_type, r.cook_time_min, r.prep_time_min, r.cook_count
    FROM cook_log cl JOIN recipes r ON r.id = cl.recipe_id
    ORDER BY cl.cooked_at DESC LIMIT ?
  `).all(limit);
  res.json(rows);
});

// ─── Routes: Ntfy ─────────────────────────────────────────────────────────────

app.post('/api/notify/test', async (req, res) => {
  try {
    await sendNtfy({ title: '🍽️ Meal Planner', message: 'Notifications are working!', priority: 3, tags: ['white_check_mark'] });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.post('/api/notify/send', llmLimiter, async (req, res) => {
  try {
    const { title, message, priority, tags, click } = req.body;
    if (typeof title !== 'string' || title.length > 200) return res.status(400).json({ error: 'Invalid title' });
    if (typeof message !== 'string' || message.length > 1000) return res.status(400).json({ error: 'Invalid message' });
    const safePriority = clampInt(priority, 1, 5, 3);
    const safeTags = Array.isArray(tags) ? tags.filter(t => typeof t === 'string').slice(0, 10) : [];
    if (click !== undefined && (typeof click !== 'string' || !isSafeExternalUrl(click))) return res.status(400).json({ error: 'Invalid click URL' });
    await sendNtfy({ title, message, priority: safePriority, tags: safeTags, click });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// ─── Routes: LLM Configs ──────────────────────────────────────────────────────

app.get('/api/llm-configs', (req, res) => {
  res.json(db.prepare('SELECT * FROM llm_configs ORDER BY id').all().map(serializeLLMConfig));
});

app.post('/api/llm-configs', (req, res) => {
  try {
    const { name, provider, model, api_key, base_url, make_active } = req.body;
    if (!name || !provider) return res.status(400).json({ error: 'name and provider required' });
    const isFirst = db.prepare('SELECT COUNT(*) as n FROM llm_configs').get().n === 0;
    const activate = make_active || isFirst ? 1 : 0;
    if (activate) db.prepare('UPDATE llm_configs SET is_active = 0').run();
    const result = db.prepare(
      'INSERT INTO llm_configs (name, provider, model, api_key, base_url, is_active) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, provider, model || null, api_key || null, base_url || null, activate);
    res.json(serializeLLMConfig(db.prepare('SELECT * FROM llm_configs WHERE id = ?').get(result.lastInsertRowid)));
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.put('/api/llm-configs/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM llm_configs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { name, provider, model, api_key, base_url } = req.body;
    db.prepare(
      'UPDATE llm_configs SET name=?, provider=?, model=?, api_key=COALESCE(NULLIF(?,\'\'), api_key), base_url=? WHERE id=?'
    ).run(
      name ?? existing.name,
      provider ?? existing.provider,
      model !== undefined ? (model || null) : existing.model,
      api_key || '',
      base_url !== undefined ? (base_url || null) : existing.base_url,
      req.params.id,
    );
    res.json(serializeLLMConfig(db.prepare('SELECT * FROM llm_configs WHERE id = ?').get(req.params.id)));
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.post('/api/llm-configs/:id/activate', (req, res) => {
  try {
    if (!db.prepare('SELECT id FROM llm_configs WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE llm_configs SET is_active = 0').run();
    db.prepare('UPDATE llm_configs SET is_active = 1 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.post('/api/llm-configs/:id/test', async (req, res) => {
  try {
    const cfg = db.prepare('SELECT * FROM llm_configs WHERE id = ?').get(req.params.id);
    if (!cfg) return res.status(404).json({ error: 'Not found' });
    let apiKey = cfg.api_key;
    if (!apiKey) {
      if (cfg.provider === 'anthropic') apiKey = process.env.ANTHROPIC_API_KEY;
      else if (cfg.provider === 'openai') apiKey = process.env.OPENAI_API_KEY;
      else if (cfg.provider === 'google') apiKey = process.env.GOOGLE_API_KEY;
    }
    const settings = { provider: cfg.provider, model: cfg.model || undefined, api_key: apiKey, ollama_base_url: cfg.base_url || undefined };
    const response = await chat('Reply with exactly one word: OK', settings, { maxTokens: 10 });
    res.json({ ok: true, response: response.trim() });
  } catch (err) { res.json({ ok: false, error: err.message }); }
});

app.delete('/api/llm-configs/:id', (req, res) => {
  try {
    const cfg = db.prepare('SELECT * FROM llm_configs WHERE id = ?').get(req.params.id);
    if (!cfg) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM llm_configs WHERE id = ?').run(req.params.id);
    if (cfg.is_active) {
      const next = db.prepare('SELECT id FROM llm_configs ORDER BY id LIMIT 1').get();
      if (next) db.prepare('UPDATE llm_configs SET is_active = 1 WHERE id = ?').run(next.id);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// ─── Routes: Local model discovery ───────────────────────────────────────────

// Proxy requests to local LLM servers (Ollama, LM Studio) to bypass browser CORS.
// Only allows http(s) — no file://, data://, etc.
function isSafeLocalModelUrl(raw) {
  try {
    const { protocol } = new URL(raw);
    return protocol === 'http:' || protocol === 'https:';
  } catch { return false; }
}

app.get('/api/local-models', async (req, res) => {
  const { provider, base_url } = req.query;
  if (!base_url || !isSafeLocalModelUrl(base_url)) {
    return res.status(400).json({ error: 'Invalid base_url' });
  }
  try {
    if (provider === 'ollama') {
      const url = base_url.replace(/\/v1$/, '').replace(/\/$/, '') + '/api/tags';
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return res.status(502).json({ error: `Ollama returned ${r.status}` });
      const data = await r.json();
      const models = (data.models || []).map(m => m.name).sort();
      return res.json({ models });
    }
    // OpenAI-compat: LM Studio, custom
    const base = base_url.replace(/\/$/, '');
    const endpoint = base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`;
    const r = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(502).json({ error: `Server returned ${r.status}` });
    const data = await r.json();
    const models = (data.data || []).map(m => m.id).sort();
    return res.json({ models });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not reach local model server' });
  }
});

// Probe a single candidate host:port for a known LLM server type.
// Returns { provider, label, base_url, models } or null on failure.
async function probeLLM({ provider, label, host, port, apiVersion }) {
  const base = `http://${host}:${port}`;
  const timeout = AbortSignal.timeout(2500);
  try {
    if (provider === 'ollama') {
      const r = await fetch(`${base}/api/tags`, { signal: timeout });
      if (!r.ok) return null;
      const data = await r.json();
      const models = (data.models || []).map(m => m.name).sort();
      return { provider, label, base_url: base, models };
    }
    // OpenAI-compat (LM Studio, Jan, LocalAI, llama.cpp, text-gen-webui, GPT4All)
    const endpoint = `${base}${apiVersion}/models`;
    const r = await fetch(endpoint, { signal: timeout });
    if (!r.ok) return null;
    const data = await r.json();
    const models = (data.data || []).map(m => m.id).filter(Boolean).sort();
    return { provider, label, base_url: `${base}${apiVersion}`, models };
  } catch { return null; }
}

app.get('/api/detect-local-llms', async (req, res) => {
  // Docker bridge host (Linux). Also try host.docker.internal for Docker Desktop.
  const hosts = ['172.17.0.1', 'host.docker.internal'];

  const candidates = [
    { provider: 'ollama',   label: 'Ollama',               port: 11434, apiVersion: '' },
    { provider: 'lmstudio', label: 'LM Studio',            port: 1234,  apiVersion: '/v1' },
    { provider: 'custom',   label: 'Jan',                  port: 1337,  apiVersion: '/v1' },
    { provider: 'custom',   label: 'LocalAI',              port: 8080,  apiVersion: '/v1' },
    { provider: 'custom',   label: 'llama.cpp',            port: 8081,  apiVersion: '/v1' },
    { provider: 'custom',   label: 'text-gen-webui',       port: 5000,  apiVersion: '/v1' },
    { provider: 'custom',   label: 'GPT4All',              port: 4891,  apiVersion: '/v1' },
    { provider: 'custom',   label: 'Open WebUI backend',   port: 11435, apiVersion: '/v1' },
  ];

  const probes = [];
  for (const host of hosts) {
    for (const c of candidates) {
      probes.push(probeLLM({ ...c, host }));
    }
  }

  const results = await Promise.allSettled(probes);
  const seen = new Set();
  const found = [];
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const key = r.value.base_url;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(r.value);
  }

  res.json({ found });
});

// ─── Routes: Child Profile ────────────────────────────────────────────────────

app.get('/api/child-profile', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'child_dob'").get();
  const dob = row?.value || null;
  const ageMonths = getChildAgeMonths();
  const guide = getGuidelineBracket(ageMonths);
  res.json({ dob, age_months: ageMonths, label: guide.label, age_range: guide.ageRange, rdas: guide.rdas });
});

app.post('/api/child-profile', (req, res) => {
  try {
    const { dob } = req.body;
    if (!dob) return res.status(400).json({ error: 'dob required (YYYY-MM-DD)' });
    const parsed = new Date(dob);
    if (isNaN(parsed)) return res.status(400).json({ error: 'Invalid date' });
    db.prepare("INSERT INTO settings (key, value) VALUES ('child_dob', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(dob);
    const ageMonths = getChildAgeMonths();
    const guide = getGuidelineBracket(ageMonths);
    res.json({ dob, age_months: ageMonths, label: guide.label, age_range: guide.ageRange, rdas: guide.rdas });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// ─── Routes: Settings ─────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) { try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; } }
  res.json(out);
});

const SETTINGS_ALLOWLIST = new Set(['child_dob', 'adult_goals', 'ntfy_url', 'ntfy_topic', 'ntfy_token', 'pexels_api_key']);

app.post('/api/settings', (req, res) => {
  try {
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    db.transaction(() => {
      for (const [k, v] of Object.entries(req.body)) {
        if (!SETTINGS_ALLOWLIST.has(k)) continue;
        if (k === 'ntfy_url' && v && !isSafeExternalUrl(String(v))) throw new Error('ntfy_url must be a valid http(s) URL pointing to a public host');
        upsert.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    })();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// ─── Ntfy ─────────────────────────────────────────────────────────────────────

function getNtfySettings() {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('ntfy_url','ntfy_topic','ntfy_token')").all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return { url: s.ntfy_url || '', topic: s.ntfy_topic || '', token: s.ntfy_token || '' };
}

function sendNtfy({ title, message, priority = 3, tags = [], click = '' } = {}) {
  const { url, topic, token } = getNtfySettings();
  if (!url || !topic) return Promise.resolve();
  return new Promise((resolve) => {
    const body = JSON.stringify({ title, message, priority, tags, ...(click ? { click } : {}) });
    const parsed = new URL(`${url}/${topic}`);
    const lib = parsed.protocol === 'https:' ? https : http;
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = lib.request({ hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname, method: 'POST', headers }, resolve);
    req.on('error', (err) => { console.error('[ntfy] send error:', err.message); resolve(); });
    req.write(body);
    req.end();
  });
}

// ─── Weekly Recipe Cron ───────────────────────────────────────────────────────

cron.schedule('0 18 * * 0', async () => {
  console.log('[cron] Weekly recipe generation starting...');
  try {
    const prefs = getPreferences();
    const topRatedCtx = getTopRatedContext();
    const types = ['breakfast', 'lunch', 'dinner', 'snack'];
    const counts = { breakfast: 2, lunch: 2, dinner: 3, snack: 2 };
    const generated = [];
    for (const mealType of types) {
      try {
        const recipes = await generateRecipesForType(mealType, counts[mealType], prefs, topRatedCtx);
        saveRecipes(recipes, mealType);
        for (const r of recipes) generated.push(r.name);
      } catch (e) { console.error(`[cron] Failed ${mealType}:`, e.message); }
    }

    // Family recap
    const monday = getMonday(new Date());
    const plan = db.prepare(`
      SELECT mp.id, COUNT(mpi.id) as meal_count FROM meal_plans mp
      LEFT JOIN meal_plan_items mpi ON mpi.meal_plan_id = mp.id
      WHERE mp.week_start = ? GROUP BY mp.id
    `).get(monday);
    const leftoversExpiring = db.prepare(
      "SELECT COUNT(*) as c FROM leftovers WHERE use_by_date <= date('now', '+3 days')"
    ).get()?.c || 0;
    const firstFoodsThisWeek = db.prepare(
      "SELECT COUNT(*) as c FROM first_foods WHERE date_tried >= date('now', '-7 days')"
    ).get()?.c || 0;

    const recapLines = [`${generated.length} new recipes ready to browse`];
    if (plan?.meal_count >= 5) recapLines.push(`This week's plan looks good — ${plan.meal_count} meals`);
    if (leftoversExpiring > 0) recapLines.push(`⚠️ ${leftoversExpiring} leftover${leftoversExpiring > 1 ? 's' : ''} expiring soon`);
    if (firstFoodsThisWeek > 0) recapLines.push(`👶 ${firstFoodsThisWeek} new food${firstFoodsThisWeek > 1 ? 's' : ''} introduced this week`);

    console.log(`[cron] Generated ${generated.length} recipes`);
    await sendNtfy({
      title: '🍽️ Family Fed Weekly Recap',
      message: recapLines.join(' · '),
      priority: 3,
      tags: ['fork_and_knife'],
      click: 'https://meal-planner.lumi-server.dev',
    });
  } catch (e) { console.error('[cron] Weekly generation failed:', e.message); }
}, { timezone: 'America/Chicago' });

// ─── Utility ──────────────────────────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().slice(0, 10);
}

// ─── Routes: Freezer ─────────────────────────────────────────────────────────

app.get('/api/freezer', (_req, res) => {
  res.json(db.prepare('SELECT * FROM freezer_items ORDER BY use_by_date ASC, created_at DESC').all());
});

app.post('/api/freezer', (req, res) => {
  try {
    const { recipe_name, servings, frozen_date, use_by_date, notes } = req.body;
    if (!recipe_name?.trim()) return res.status(400).json({ error: 'recipe_name required' });
    const today = new Date().toISOString().slice(0, 10);
    const defaultUseBy = new Date(); defaultUseBy.setMonth(defaultUseBy.getMonth() + 3);
    const result = db.prepare(
      'INSERT INTO freezer_items (recipe_name, servings, frozen_date, use_by_date, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(recipe_name.trim(), servings || 2, frozen_date || today, use_by_date || defaultUseBy.toISOString().slice(0, 10), notes || null);
    res.json(db.prepare('SELECT * FROM freezer_items WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.delete('/api/freezer/:id', (req, res) => {
  db.prepare('DELETE FROM freezer_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Routes: Leftovers ────────────────────────────────────────────────────────

app.get('/api/leftovers', (_req, res) => {
  res.json(db.prepare('SELECT * FROM leftovers ORDER BY use_by_date ASC, created_at DESC').all());
});

app.post('/api/leftovers', (req, res) => {
  try {
    const { recipe_name, servings_remaining, cooked_date, use_by_date, notes } = req.body;
    if (!recipe_name?.trim()) return res.status(400).json({ error: 'recipe_name required' });
    const today = new Date().toISOString().slice(0, 10);
    const defaultUseBy = new Date(); defaultUseBy.setDate(defaultUseBy.getDate() + 4);
    const result = db.prepare(
      'INSERT INTO leftovers (recipe_name, servings_remaining, cooked_date, use_by_date, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(recipe_name.trim(), servings_remaining || 2, cooked_date || today, use_by_date || defaultUseBy.toISOString().slice(0, 10), notes || null);
    res.json(db.prepare('SELECT * FROM leftovers WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.patch('/api/leftovers/:id', (req, res) => {
  try {
    const { servings_remaining } = req.body;
    if (servings_remaining <= 0) {
      db.prepare('DELETE FROM leftovers WHERE id = ?').run(req.params.id);
    } else {
      db.prepare('UPDATE leftovers SET servings_remaining = ? WHERE id = ?').run(servings_remaining, req.params.id);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.delete('/api/leftovers/:id', (req, res) => {
  db.prepare('DELETE FROM leftovers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Routes: First Foods ──────────────────────────────────────────────────────

app.get('/api/first-foods', (_req, res) => {
  res.json(db.prepare('SELECT * FROM first_foods ORDER BY date_tried DESC, created_at DESC').all());
});

app.post('/api/first-foods', (req, res) => {
  try {
    const { food_name, date_tried, reaction, notes } = req.body;
    if (!food_name?.trim()) return res.status(400).json({ error: 'food_name required' });
    const today = new Date().toISOString().slice(0, 10);
    const result = db.prepare(
      'INSERT INTO first_foods (food_name, date_tried, reaction, notes) VALUES (?, ?, ?, ?)'
    ).run(food_name.trim(), date_tried || today, reaction || 'none', notes || null);
    res.json(db.prepare('SELECT * FROM first_foods WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

app.delete('/api/first-foods/:id', (req, res) => {
  db.prepare('DELETE FROM first_foods WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Routes: Adult Goals ──────────────────────────────────────────────────────

const ADULT_GOAL_DEFAULTS = { protein_g: 150, calories: 2200, omega3_mg: 1600, iron_mg: 18 };

app.get('/api/adult-goals', (_req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'adult_goals'").get();
  if (!row) return res.json(ADULT_GOAL_DEFAULTS);
  try { res.json({ ...ADULT_GOAL_DEFAULTS, ...JSON.parse(row.value) }); } catch { res.json(ADULT_GOAL_DEFAULTS); }
});

app.post('/api/adult-goals', (req, res) => {
  try {
    const goals = {
      protein_g: Number(req.body.protein_g) || ADULT_GOAL_DEFAULTS.protein_g,
      calories: Number(req.body.calories) || ADULT_GOAL_DEFAULTS.calories,
      omega3_mg: Number(req.body.omega3_mg) || ADULT_GOAL_DEFAULTS.omega3_mg,
      iron_mg: Number(req.body.iron_mg) || ADULT_GOAL_DEFAULTS.iron_mg,
    };
    db.prepare("INSERT INTO settings (key, value) VALUES ('adult_goals', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run(JSON.stringify(goals));
    res.json(goals);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// ─── Routes: Batch Prep Streak ────────────────────────────────────────────────

app.get('/api/batch-streak', (_req, res) => {
  try {
    const plans = db.prepare(`
      SELECT mp.week_start, COUNT(mpi.id) as meal_count, mp.status
      FROM meal_plans mp
      LEFT JOIN meal_plan_items mpi ON mpi.meal_plan_id = mp.id
      GROUP BY mp.id
      ORDER BY mp.week_start DESC
    `).all();

    if (!plans.length) return res.json({ streak: 0, best: 0 });

    let streak = 0, best = 0, prevWeek = null;
    for (const plan of plans) {
      if (plan.meal_count < 5 && plan.status !== 'completed') break;
      if (prevWeek !== null) {
        const diffWeeks = Math.round((new Date(prevWeek) - new Date(plan.week_start)) / (7 * 86400000));
        if (diffWeeks !== 1) break;
      }
      streak++;
      best = Math.max(best, streak);
      prevWeek = plan.week_start;
    }
    res.json({ streak, best });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// ─── Serve Frontend ───────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'frontend/dist/index.html')));
}

app.listen(PORT, () => console.log(`Meal planner running on port ${PORT}`));
