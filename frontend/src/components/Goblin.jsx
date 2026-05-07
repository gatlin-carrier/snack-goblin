import { THEME } from '../lib/glass.jsx';

// Snack Goblin mascot — 6 state-based variants per BRAND.md.
// Single SVG body, expressions/accessories swap per state.
//
// Body palette: sage skin (matches brand), terracotta accents, dark ink eyes.
// Sized via the `size` prop; default 80px. Square viewBox, intrinsic aspect 1:1.
//
// States:
//   sleeping  — no plan, no recent cooks
//   curious   — recipes generated but unplanned
//   cooking   — CookMode active
//   well-fed  — cooked >=3 this week
//   hungry    — <2 meals planned, week half over
//   fixated   — same recipe cooked 3+ times in 2 weeks
//   idle      — generic neutral (login splash default)

const SKIN = 'oklch(0.74 0.10 145)';            // soft goblin-sage
const SKIN_DARK = 'oklch(0.58 0.10 145)';       // shadow ear-inner
const INK = 'oklch(0.22 0.018 50)';             // eyes / mouth
const BLUSH = 'oklch(0.78 0.10 30 / 0.6)';      // cheek pink
const ACCENT = 'oklch(0.62 0.14 35)';           // terracotta accents
const STEAM = 'oklch(0.85 0.012 60 / 0.85)';    // soft steam grey

// Shared body (head + ears + cheek-blushes). Drawn once, expression overlaid.
function Body({ blush = false }) {
  return (
    <g>
      {/* ears (drawn behind head) */}
      <path d="M18 28 L26 14 L32 32 Z" fill={SKIN} />
      <path d="M22 26 L26 18 L29 28 Z" fill={SKIN_DARK} opacity="0.55" />
      <path d="M82 28 L74 14 L68 32 Z" fill={SKIN} />
      <path d="M78 26 L74 18 L71 28 Z" fill={SKIN_DARK} opacity="0.55" />
      {/* head */}
      <ellipse cx="50" cy="54" rx="32" ry="30" fill={SKIN} />
      {/* head highlight (top) */}
      <ellipse cx="42" cy="38" rx="14" ry="6" fill="oklch(1 0 0 / 0.18)" />
      {blush && (
        <>
          <ellipse cx="28" cy="62" rx="7" ry="4" fill={BLUSH} />
          <ellipse cx="72" cy="62" rx="7" ry="4" fill={BLUSH} />
        </>
      )}
    </g>
  );
}

function Sleeping() {
  return (
    <>
      <Body />
      {/* closed-curve eyes */}
      <path d="M34 54 q6 -6 12 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M54 54 q6 -6 12 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      {/* small content mouth */}
      <path d="M46 68 q4 3 8 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* floating Zs */}
      <text x="74" y="22" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="14" fill={ACCENT} fontWeight="600">z</text>
      <text x="82" y="14" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="10" fill={ACCENT} fontWeight="600" opacity="0.7">z</text>
    </>
  );
}

function Curious() {
  return (
    <>
      <Body />
      {/* wide eyes */}
      <circle cx="40" cy="52" r="5" fill="white" />
      <circle cx="40" cy="52" r="2.6" fill={INK} />
      <circle cx="60" cy="52" r="5" fill="white" />
      <circle cx="60" cy="52" r="2.6" fill={INK} />
      {/* one raised brow */}
      <path d="M36 42 q4 -3 9 -1" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M55 44 q4 -1 9 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* tiny "o" mouth */}
      <ellipse cx="50" cy="68" rx="2.4" ry="3" fill={INK} />
      {/* sparkle/question floating */}
      <text x="76" y="20" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="14" fill={ACCENT} fontWeight="700">?</text>
    </>
  );
}

function Cooking() {
  return (
    <>
      <Body blush />
      {/* steam wisps above pot */}
      <path d="M40 8 q2 4 0 8 q-2 4 0 8" fill="none" stroke={STEAM} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50 4 q2 4 0 8 q-2 4 0 8" fill="none" stroke={STEAM} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 8 q2 4 0 8 q-2 4 0 8" fill="none" stroke={STEAM} strokeWidth="2.5" strokeLinecap="round" />
      {/* happy half-moon eyes */}
      <path d="M34 54 q6 6 12 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M54 54 q6 6 12 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      {/* open smile */}
      <path d="M42 66 q8 8 16 0" fill={INK} />
      <path d="M44 67 q6 4 12 0" fill="oklch(0.55 0.16 35)" />
      {/* pot in front (bottom) */}
      <rect x="30" y="78" width="40" height="14" rx="3" fill={ACCENT} />
      <rect x="26" y="76" width="48" height="5" rx="2" fill="oklch(0.45 0.10 35)" />
    </>
  );
}

function WellFed() {
  return (
    <>
      <Body blush />
      {/* contented squint eyes (^^) */}
      <path d="M34 54 q6 -5 12 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M54 54 q6 -5 12 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      {/* satisfied smile + tongue lick */}
      <path d="M40 66 q10 8 20 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M58 67 q3 3 6 1 q1 -2 -1 -3" fill={ACCENT} stroke={ACCENT} strokeWidth="0.5" />
      {/* tiny sparkle stars */}
      <text x="14" y="40" fontSize="14" fill={ACCENT} fontWeight="700">✦</text>
      <text x="78" y="32" fontSize="10" fill={ACCENT} fontWeight="700" opacity="0.7">✦</text>
    </>
  );
}

function Hungry() {
  return (
    <>
      <Body />
      {/* big pleading eyes (sparkly puppy-dog) */}
      <ellipse cx="40" cy="54" rx="6" ry="6.5" fill="white" />
      <circle cx="40" cy="55" r="3.2" fill={INK} />
      <circle cx="38.5" cy="53" r="1.2" fill="white" />
      <ellipse cx="60" cy="54" rx="6" ry="6.5" fill="white" />
      <circle cx="60" cy="55" r="3.2" fill={INK} />
      <circle cx="58.5" cy="53" r="1.2" fill="white" />
      {/* worried brows */}
      <path d="M32 44 q5 2 10 4" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M68 44 q-5 2 -10 4" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* small wobbly frown */}
      <path d="M44 70 q6 -3 12 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* tiny drool drop */}
      <ellipse cx="56" cy="76" rx="1.8" ry="2.6" fill="oklch(0.78 0.06 230 / 0.7)" />
    </>
  );
}

function Fixated() {
  return (
    <>
      <Body blush />
      {/* tiny intense focused dots + glasses */}
      <circle cx="40" cy="54" r="6.5" fill="none" stroke={INK} strokeWidth="2" />
      <circle cx="60" cy="54" r="6.5" fill="none" stroke={INK} strokeWidth="2" />
      <line x1="46.5" y1="54" x2="53.5" y2="54" stroke={INK} strokeWidth="2" />
      <line x1="33.5" y1="54" x2="29" y2="52" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <line x1="66.5" y1="54" x2="71" y2="52" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* small focused pupils */}
      <circle cx="40" cy="54" r="1.6" fill={INK} />
      <circle cx="60" cy="54" r="1.6" fill={INK} />
      {/* small smile */}
      <path d="M44 68 q6 4 12 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* heart hovering */}
      <path d="M76 16 q-3 -4 -6 0 q-3 -4 -6 0 q0 4 6 8 q6 -4 6 -8 z" fill={ACCENT} />
    </>
  );
}

function Idle() {
  return (
    <>
      <Body />
      {/* neutral round eyes */}
      <circle cx="40" cy="53" r="4.5" fill="white" />
      <circle cx="40" cy="53" r="2.4" fill={INK} />
      <circle cx="60" cy="53" r="4.5" fill="white" />
      <circle cx="60" cy="53" r="2.4" fill={INK} />
      {/* gentle smile */}
      <path d="M42 66 q8 6 16 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

const VARIANTS = {
  sleeping: Sleeping,
  curious:  Curious,
  cooking:  Cooking,
  'well-fed': WellFed,
  hungry:   Hungry,
  fixated:  Fixated,
  idle:     Idle,
};

// Per-state copy from BRAND.md "The mascot" table. Each entry is a function
// that takes the goblin's display name (custom or default "the goblin") so
// the user's chosen name surfaces everywhere.
export const GOBLIN_COPY = {
  sleeping: (name) => `${name}'s napping. give 'em something to do.`,
  curious:  (name) => `${name} sees something interesting.`,
  cooking:  (_name) => "stirring the pot.",
  'well-fed': (name) => `${name}'s content. proud of you.`,
  hungry:   (name) => `${name}'s looking at you funny.`,
  fixated:  (name, recipe) => recipe ? `${name} loves when you make ${recipe}.` : `${name} has a favorite right now.`,
  idle:     () => null,
};

export function copyFor(state, recipe, name = 'the goblin') {
  const c = GOBLIN_COPY[state];
  return typeof c === 'function' ? c(name, recipe) : null;
}

export default function Goblin({ state = 'idle', size = 80, title, style, name }) {
  const Render = VARIANTS[state] || VARIANTS.idle;
  const label = title || `${name || 'goblin'} ${state}`;
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: 'block', ...style }}
    >
      <title>{label}</title>
      <Render />
    </svg>
  );
}

// Glass-pill widget — the dashboard top-left placement. Renders the SVG plus
// the per-state copy, both styled to match the existing Liquid Glass theme.
export function GoblinWidget({ state, recipe, size = 56, onClick, name = 'the goblin' }) {
  const text = copyFor(state, recipe, name);
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        padding: '8px 16px 8px 8px',
        borderRadius: 999,
        background: 'oklch(1 0 0 / 0.55)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: [
          'inset 0 1px 0 oklch(1 0 0 / 0.7)',
          'inset 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
          '0 4px 14px -6px oklch(0.3 0.04 50 / 0.18)',
        ].join(', '),
        cursor: onClick ? 'pointer' : 'default',
      }}
      title={text || ''}
    >
      <Goblin state={state} size={size} />
      {text && (
        <span style={{
          fontSize: 12.5, color: THEME.text,
          fontStyle: 'italic', fontFamily: 'Fraunces, Georgia, serif',
          maxWidth: 220, lineHeight: 1.3,
        }}>{text}</span>
      )}
    </div>
  );
}
