import { usePrefs } from '../lib/prefs.jsx';
import { THEME } from '../lib/glass.jsx';

const LEVELS = [
  { key: 'low',  emoji: '🔋',     label: 'low',  hint: 'low energy · only 25-min meals tonight' },
  { key: 'mid',  emoji: '🔋🔋',   label: 'mid',  hint: 'normal day · up to 45 minutes' },
  { key: 'high', emoji: '🔋🔋🔋', label: 'high', hint: 'feeling ambitious · no time cap' },
];

export default function EnergyPill({ compact = false }) {
  const { prefs, update } = usePrefs();
  const current = prefs.low_capacity_mode ? 'low' : (prefs.energy_level || 'mid');
  const locked = prefs.low_capacity_mode;

  function set(level) {
    if (locked) return;
    update({ energy_level: level });
  }

  return (
    <div title={locked ? 'low capacity mode is on — energy is locked to low' : "today's energy"}
      style={{
        display: 'inline-flex', gap: 2,
        background: 'oklch(1 0 0 / 0.45)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 999, padding: 3,
        boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
        opacity: locked ? 0.7 : 1,
      }}
    >
      {LEVELS.map(l => {
        const active = current === l.key;
        return (
          <button
            key={l.key}
            onClick={() => set(l.key)}
            disabled={locked}
            title={l.hint}
            style={{
              background: active
                ? `linear-gradient(180deg, color-mix(in oklch, ${THEME.accent} 80%, white 20%), ${THEME.accent})`
                : 'transparent',
              color: active ? 'white' : THEME.dim,
              border: 'none', borderRadius: 999,
              padding: compact ? '4px 10px' : '6px 14px',
              fontSize: compact ? 11 : 12,
              fontWeight: 600, cursor: locked ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: active ? '0 2px 6px -2px oklch(0.55 0.16 35 / 0.5)' : 'none',
              transition: 'background 160ms ease',
            }}
          >
            <span style={{ marginRight: 5 }}>{l.emoji}</span>{l.label}
          </button>
        );
      })}
    </div>
  );
}
