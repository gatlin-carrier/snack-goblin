import { useState, useEffect } from 'react';
import { Glass, THEME, display, glassBtnGhost } from '../lib/glass.jsx';

// Quick-log strip for toddler drinks. Only renders when the user has
// enabled the per-day logger in DrinkSettings — otherwise drinks are
// inferred from the standing intake constants.
const QUICK_BUTTONS = [
  { drink: 'milk',  oz: 4,  label: '+4 oz milk',  emoji: '🥛' },
  { drink: 'milk',  oz: 8,  label: '+8 oz milk',  emoji: '🥛' },
  { drink: 'juice', oz: 4,  label: '+4 oz juice', emoji: '🧃' },
  { drink: 'water', oz: 8,  label: '+8 oz water', emoji: '💧' },
];

export default function DrinkLogger({ onChange, showToast }) {
  const [today, setToday] = useState([]);
  const [posting, setPosting] = useState(false);

  async function load() {
    const res = await fetch('/api/drinks/log').then(r => r.json()).catch(() => null);
    if (res?.today) setToday(res.today);
  }
  useEffect(() => { load(); }, []);

  async function add(drink, oz) {
    if (posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/drinks/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drink_type: drink, ounces: oz }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast?.(data.error || "couldn't log that one");
        return;
      }
      await load();
      onChange?.();
    } finally { setPosting(false); }
  }

  async function remove(id) {
    await fetch(`/api/drinks/log/${id}`, { method: 'DELETE' });
    await load();
    onChange?.();
  }

  const totalsByDrink = today.reduce((acc, e) => {
    acc[e.drink_type] = (acc[e.drink_type] || 0) + e.ounces;
    return acc;
  }, {});

  return (
    <Glass padding={16} radius={18} style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: THEME.dim, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Drinks today
        </div>
        <div style={{ fontSize: 12, color: THEME.faint, fontVariantNumeric: 'tabular-nums' }}>
          {Object.entries(totalsByDrink).map(([d, oz]) => `${oz}oz ${d}`).join(' · ') || 'nothing logged yet'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: today.length ? 10 : 0 }}>
        {QUICK_BUTTONS.map(b => (
          <button
            key={`${b.drink}-${b.oz}`}
            onClick={() => add(b.drink, b.oz)}
            disabled={posting}
            style={{ ...glassBtnGhost, fontSize: 12, padding: '6px 12px', opacity: posting ? 0.5 : 1 }}
          >
            <span style={{ marginRight: 4 }}>{b.emoji}</span>{b.label}
          </button>
        ))}
      </div>
      {today.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {today.map(e => (
            <button
              key={e.id}
              onClick={() => remove(e.id)}
              title="remove"
              style={{
                ...glassBtnGhost,
                fontSize: 11, padding: '4px 10px',
                color: THEME.dim, fontFamily: display, fontStyle: 'italic',
              }}
            >
              {e.ounces}oz {e.drink_type} ×
            </button>
          ))}
        </div>
      )}
    </Glass>
  );
}
