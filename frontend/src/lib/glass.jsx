// Mealhouse — Liquid Glass primitives.
// Apple iOS 26-style translucent surfaces: blurred + saturated backdrop,
// hairline ring, top inner highlight, soft drop shadow. All warm-light.

export const THEME = {
  bg: 'oklch(0.95 0.018 70)',
  ink: 'oklch(0.22 0.018 50)',
  text: 'oklch(0.30 0.018 50)',
  dim: 'oklch(0.50 0.015 50)',
  faint: 'oklch(0.62 0.015 50)',
  hairline: 'oklch(0.85 0.012 60 / 0.6)',
  accent: 'oklch(0.62 0.14 35)',
  accentSoft: 'oklch(0.78 0.09 30)',
  rust: 'oklch(0.55 0.16 35)',
  sage: 'oklch(0.55 0.10 145)',
  sagePastel: 'oklch(0.78 0.07 145)',
  butterPastel: 'oklch(0.84 0.08 80)',
  yellow: 'oklch(0.68 0.13 80)',
  red: 'oklch(0.55 0.18 25)',
};

export const display = '"Fraunces", Georgia, serif';
export const body = '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

export const ambientBG = `
  radial-gradient(1100px 700px at 12% 0%, oklch(0.85 0.12 35 / 0.55), transparent 60%),
  radial-gradient(900px 600px at 100% 18%, oklch(0.82 0.10 80 / 0.45), transparent 65%),
  radial-gradient(800px 800px at 50% 110%, oklch(0.80 0.08 145 / 0.35), transparent 70%),
  linear-gradient(180deg, oklch(0.96 0.018 70) 0%, oklch(0.93 0.024 70) 100%)
`;

// ── Liquid Glass surface ──────────────────────────────────────────
export function Glass({ children, tint, radius = 22, padding = 0, style, strong = false, className }) {
  const fill = tint
    ? `linear-gradient(180deg, ${tint} 0%, color-mix(in oklch, ${tint} 70%, white 30%) 100%)`
    : strong
      ? 'oklch(1 0 0 / 0.62)'
      : 'oklch(1 0 0 / 0.45)';
  return (
    <div className={className} style={{
      position: 'relative',
      borderRadius: radius,
      padding,
      background: fill,
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      boxShadow: [
        'inset 0 1px 0 0 oklch(1 0 0 / 0.7)',
        'inset 0 -1px 0 0 oklch(0.4 0.02 60 / 0.06)',
        '0 0 0 0.5px oklch(0.4 0.02 60 / 0.18)',
        '0 8px 28px -10px oklch(0.3 0.04 50 / 0.18)',
        '0 2px 6px -2px oklch(0.3 0.04 50 / 0.10)',
      ].join(', '),
      ...style,
    }}>
      {children}
    </div>
  );
}

// Inline glass pill — used for nav, segmented controls, small actions
export function GlassPill({ children, active = false, tint, style, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      position: 'relative',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', border: 'none', cursor: 'pointer',
      borderRadius: 999,
      fontSize: 13, fontWeight: 600,
      color: active ? THEME.ink : THEME.dim,
      background: active ? (tint || 'oklch(1 0 0 / 0.85)') : 'transparent',
      backdropFilter: active ? 'blur(20px) saturate(180%)' : 'none',
      WebkitBackdropFilter: active ? 'blur(20px) saturate(180%)' : 'none',
      boxShadow: active ? [
        'inset 0 1px 0 0 oklch(1 0 0 / 0.85)',
        'inset 0 -1px 0 0 oklch(0.4 0.02 60 / 0.06)',
        '0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
        '0 4px 14px -6px oklch(0.3 0.04 50 / 0.18)',
      ].join(', ') : 'none',
      transition: 'background 160ms ease',
      fontFamily: 'inherit',
      ...style,
    }}>{children}</button>
  );
}

// ── Badges (uppercase pill — small) ───────────────────────────────
export function Badge({ children, tone = 'neutral' }) {
  const map = {
    neutral: { bg: 'oklch(1 0 0 / 0.6)',          fg: THEME.text },
    accent:  { bg: 'oklch(0.62 0.14 35 / 0.18)',  fg: THEME.accent },
    sage:    { bg: 'oklch(0.55 0.10 145 / 0.18)', fg: THEME.sage },
    yellow:  { bg: 'oklch(0.68 0.13 80 / 0.22)',  fg: 'oklch(0.45 0.13 80)' },
    rust:    { bg: 'oklch(0.55 0.16 35 / 0.18)',  fg: THEME.rust },
  };
  const c = map[tone] || map.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 999,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', background: c.bg, color: c.fg,
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.12)',
    }}>{children}</span>
  );
}

// ── Pastel nutrition bar ──────────────────────────────────────────
const NUTRI_TONES = {
  good: 'oklch(0.78 0.07 145)',
  mid:  'oklch(0.84 0.08 80)',
  low:  'oklch(0.78 0.09 30)',
};

export function NutritionBar({ label, pct, value, max, unit }) {
  const tone = pct >= 90 ? NUTRI_TONES.good : pct >= 65 ? NUTRI_TONES.mid : NUTRI_TONES.low;
  const toneText = pct >= 90 ? 'oklch(0.50 0.10 145)' : pct >= 65 ? 'oklch(0.55 0.12 80)' : 'oklch(0.55 0.13 30)';
  const cap = Math.min(100, Math.max(0, pct || 0));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: THEME.text, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: THEME.dim, fontVariantNumeric: 'tabular-nums' }}>
          <b style={{ color: toneText, fontSize: 13 }}>{Math.round(cap)}%</b> · {Math.round(value || 0)}/{Math.round(max || 0)} {unit}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'oklch(0.4 0.02 60 / 0.10)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${cap}%`, background: tone, borderRadius: 999, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ── Real food photography (Unsplash CDN) ──────────────────────────
const FOOD_PHOTOS_BY_NAME = [
  ['salmon',     'https://images.unsplash.com/photo-1467003909585-2f8a72700288'],
  ['fish',       'https://images.unsplash.com/photo-1467003909585-2f8a72700288'],
  ['lentil',     'https://images.unsplash.com/photo-1551183053-bf91a1d81141'],
  ['lamb',       'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1'],
  ['meatball',   'https://images.unsplash.com/photo-1551183053-bf91a1d81141'],
  ['yogurt',     'https://images.unsplash.com/photo-1488477181946-6428a0291777'],
  ['berry',      'https://images.unsplash.com/photo-1488477181946-6428a0291777'],
  ['chickpea',   'https://images.unsplash.com/photo-1565557623262-b51c2513a641'],
  ['curry',      'https://images.unsplash.com/photo-1565557623262-b51c2513a641'],
  ['dal',        'https://images.unsplash.com/photo-1565557623262-b51c2513a641'],
  ['chicken',    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6'],
  ['quesadilla', 'https://images.unsplash.com/photo-1618040996337-11d0fb53d3a5'],
  ['tortilla',   'https://images.unsplash.com/photo-1618040996337-11d0fb53d3a5'],
  ['black bean', 'https://images.unsplash.com/photo-1618040996337-11d0fb53d3a5'],
  ['muffin',     'https://images.unsplash.com/photo-1543339308-43e59d6b73a6'],
  ['egg',        'https://images.unsplash.com/photo-1543339308-43e59d6b73a6'],
  ['shakshuka',  'https://images.unsplash.com/photo-1543339308-43e59d6b73a6'],
  ['soba',       'https://images.unsplash.com/photo-1552611052-33e04de081de'],
  ['noodle',     'https://images.unsplash.com/photo-1552611052-33e04de081de'],
  ['ramen',      'https://images.unsplash.com/photo-1552611052-33e04de081de'],
  ['tofu',       'https://images.unsplash.com/photo-1611348586804-61bf6c080437'],
  ['rice',       'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'],
  ['bowl',       'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'],
];
const FOOD_PHOTOS_BY_CUISINE = {
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
};
const FOOD_DEFAULT = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288';

export function photoFor({ name, cuisine, src }) {
  if (src) return src;
  const n = (name || '').toLowerCase();
  for (const [needle, url] of FOOD_PHOTOS_BY_NAME) if (n.includes(needle)) return url;
  return FOOD_PHOTOS_BY_CUISINE[cuisine] || FOOD_DEFAULT;
}

export function PhotoBg({ name, cuisine, src, h = 200, label, style, children }) {
  const url = photoFor({ name, cuisine, src });
  // Pexels URLs are pre-baked; Unsplash URLs need transform params
  const final = url.includes('images.unsplash.com')
    ? `${url}?w=900&q=70&auto=format&fit=crop`
    : url;
  return (
    <div style={{
      height: h, position: 'relative', overflow: 'hidden',
      background: `oklch(0.88 0.02 70) center/cover no-repeat url("${final}")`,
      ...style,
    }}>
      {label && (
        <div style={{
          position: 'absolute', left: 12, top: 12,
          fontFamily: 'ui-monospace, monospace', fontSize: 9,
          color: 'oklch(0.30 0.018 50 / 0.75)',
          background: 'oklch(1 0 0 / 0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          padding: '2px 6px', borderRadius: 3,
        }}>{label}</div>
      )}
      {children}
    </div>
  );
}

// ── Glass button styles (for inline style use) ────────────────────
export const glassBtnPrimary = {
  background: `linear-gradient(180deg, color-mix(in oklch, ${THEME.accent} 75%, white 25%), ${THEME.accent})`,
  color: 'white', border: 'none', borderRadius: 999,
  padding: '9px 18px', fontSize: 13, fontWeight: 600, letterSpacing: '0.01em', cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: [
    'inset 0 1px 0 oklch(1 0 0 / 0.4)',
    '0 0 0 0.5px oklch(0.4 0.1 35 / 0.5)',
    '0 6px 14px -6px oklch(0.55 0.16 35 / 0.55)',
  ].join(', '),
};

export const glassBtnGhost = {
  background: 'oklch(1 0 0 / 0.55)',
  color: THEME.ink,
  border: 'none', borderRadius: 999,
  padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit',
  backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: [
    'inset 0 1px 0 oklch(1 0 0 / 0.7)',
    'inset 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
    '0 4px 10px -4px oklch(0.3 0.04 50 / 0.18)',
  ].join(', '),
};
