// Single source of truth for the Snack Goblin design system.
// Web (Tailwind v4): referenced from frontend/src/index.css via @theme
// Mobile (NativeWind/Tailwind v3): consumed by mobile/tailwind.config.js
//
// OKLCH values from glass.jsx converted to sRGB hex for Tailwind v3 compat.

const colors = {
  // ── semantic surface ──────────────────────────────────────────────
  'goblin-bg':    '#F5EDE0',   // oklch(0.96 0.022 75) — warm cream page bg
  'goblin-ink':   '#3B2212',   // oklch(0.22 0.04  45) — darkest text
  'goblin-text':  '#4E3322',   // oklch(0.32 0.035 45) — body text
  'goblin-dim':   '#7A6150',   // oklch(0.50 0.025 50) — secondary text
  'goblin-faint': '#9A8374',   // oklch(0.62 0.020 55) — hint text
  'goblin-line':  '#CFC2AE',   // oklch(0.82 0.018 65) — hairline / divider

  // ── brand palette ─────────────────────────────────────────────────
  accent:         '#D4703A',   // oklch(0.62 0.17 50) — pumpkin orange (primary)
  'accent-soft':  '#E9C8A4',   // oklch(0.82 0.10 60) — peach cream
  rust:           '#9E4E28',   // oklch(0.48 0.14 40) — burnt sienna
  'butter-pastel':'#EBD8A8',   // oklch(0.86 0.08 80) — warm butter
  'sage-pastel':  '#E5D2B0',   // oklch(0.86 0.08 70) — warm cream-amber
  yellow:         '#C09E38',   // oklch(0.68 0.13 80) — warm yellow
  plum:           '#6A3068',   // oklch(0.45 0.13 320) — mystical purple
  'plum-soft':    '#C0A0BC',   // oklch(0.75 0.08 320) — soft lavender
  'plum-deep':    '#38184A',   // oklch(0.32 0.10 318) — deep plum
  error:          '#BC3838',   // oklch(0.55 0.20  18) — warm red

  // ── glass surface helpers (opaque fallbacks for RN) ───────────────
  'glass-fill':   '#FFFFFFA0',  // white 63% — closest to oklch(1 0 0 / 0.45)
  'glass-strong': '#FFFFFFB0',  // white 69% — oklch(1 0 0 / 0.62)
};

const radii = {
  pill: '9999px',
  card: '22px',
  sheet: '28px',
};

const fonts = {
  display: ['"Fraunces"', 'Georgia', 'serif'],
  body:    ['"Inter"', '-apple-system', 'system-ui', 'sans-serif'],
};

// Unsplash food photos — same mapping used on web
const foodPhotos = {
  byName: [
    ['salmon',     'https://images.unsplash.com/photo-1467003909585-2f8a72700288'],
    ['fish',       'https://images.unsplash.com/photo-1467003909585-2f8a72700288'],
    ['lentil',     'https://images.unsplash.com/photo-1551183053-bf91a1d81141'],
    ['lamb',       'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1'],
    ['meatball',   'https://images.unsplash.com/photo-1551183053-bf91a1d81141'],
    ['yogurt',     'https://images.unsplash.com/photo-1488477181946-6428a0291777'],
    ['berry',      'https://images.unsplash.com/photo-1488477181946-6428a0291777'],
    ['chickpea',   'https://images.unsplash.com/photo-1565557623262-b51c2513a641'],
    ['curry',      'https://images.unsplash.com/photo-1565557623262-b51c2513a641'],
    ['chicken',    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6'],
    ['egg',        'https://images.unsplash.com/photo-1543339308-43e59d6b73a6'],
    ['rice',       'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'],
    ['bowl',       'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'],
    ['noodle',     'https://images.unsplash.com/photo-1552611052-33e04de081de'],
    ['pasta',      'https://images.unsplash.com/photo-1551183053-bf91a1d81141'],
  ],
  byCuisine: {
    Mediterranean: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    Italian:       'https://images.unsplash.com/photo-1551183053-bf91a1d81141',
    Indian:        'https://images.unsplash.com/photo-1565557623262-b51c2513a641',
    American:      'https://images.unsplash.com/photo-1598103442097-8b74394b95c6',
    Mexican:       'https://images.unsplash.com/photo-1618040996337-11d0fb53d3a5',
    Japanese:      'https://images.unsplash.com/photo-1552611052-33e04de081de',
    Korean:        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    Thai:          'https://images.unsplash.com/photo-1559314809-0d155014e29e',
    Greek:         'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    'Middle Eastern': 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6',
  },
  default: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
};

function photoFor({ name, cuisine, src }) {
  if (src) return src;
  const n = (name || '').toLowerCase();
  for (const [needle, url] of foodPhotos.byName) {
    if (n.includes(needle)) return url;
  }
  return foodPhotos.byCuisine[cuisine] || foodPhotos.default;
}

module.exports = { colors, radii, fonts, foodPhotos, photoFor };
