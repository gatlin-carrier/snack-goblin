import { useState, useEffect } from 'react';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const REACTIONS = [
  { key: 'none',     label: 'No reaction', tone: 'sage',   color: THEME.sage,                tint: 'oklch(0.55 0.10 50 / 0.14)' },
  { key: 'mild',     label: 'Mild',        tone: 'yellow', color: 'oklch(0.55 0.13 80)',     tint: 'oklch(0.68 0.13 80 / 0.16)'  },
  { key: 'moderate', label: 'Moderate',    tone: 'rust',   color: 'oklch(0.55 0.16 50)',     tint: 'oklch(0.55 0.16 50 / 0.14)'  },
  { key: 'severe',   label: 'Severe',      tone: 'rust',   color: THEME.red,                 tint: 'oklch(0.55 0.18 25 / 0.16)'  },
];

const QUICK_FOODS = [
  'Egg (scrambled)', 'Peanut butter', 'Avocado', 'Banana', 'Sweet potato',
  'Oatmeal', 'Yogurt (plain)', 'Salmon', 'Chicken', 'Lentils',
  'Blueberries', 'Broccoli', 'Cheese', 'Beef (ground)', 'Tofu',
];

function reactionInfo(key) {
  return REACTIONS.find(r => r.key === key) || REACTIONS[0];
}

export default function FirstFoodsLog({ showToast }) {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newFood, setNewFood] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newReaction, setNewReaction] = useState('none');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/first-foods');
    setFoods(await res.json());
    setLoading(false);
  }

  async function addFood() {
    if (!newFood.trim()) return;
    setSaving(true);
    await fetch('/api/first-foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_name: newFood.trim(), date_tried: newDate, reaction: newReaction, notes: newNotes }),
    });
    setNewFood(''); setNewNotes(''); setNewReaction('none');
    setShowAdd(false);
    setSaving(false);
    showToast(`logged ${newFood}. one more for the record.`);
    load();
  }

  async function removeFood(id, name) {
    await fetch(`/api/first-foods/${id}`, { method: 'DELETE' });
    setFoods(f => f.filter(i => i.id !== id));
    showToast(`unlogged ${name}`);
  }

  const filtered = filter === 'all' ? foods : foods.filter(f => f.reaction === filter);
  const counts = { none: 0, mild: 0, moderate: 0, severe: 0 };
  for (const f of foods) counts[f.reaction] = (counts[f.reaction] || 0) + 1;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{
            fontSize: 11, color: THEME.accent, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6,
          }}>Toddler · introductions</div>
          <div style={{
            fontFamily: display, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
            color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.01em',
          }}>First foods</div>
          <div style={{ fontSize: 13, color: THEME.dim, marginTop: 6 }}>
            <span style={{ color: THEME.ink, fontFamily: display, fontStyle: 'italic', fontWeight: 500, fontSize: 18, marginRight: 4 }}>{foods.length}</span>
            food{foods.length !== 1 ? 's' : ''} introduced
            {counts.severe > 0 && <span style={{ color: THEME.red, marginLeft: 8, fontWeight: 600 }}>· {counts.severe} severe reaction{counts.severe > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <button style={glassBtnPrimary} onClick={() => setShowAdd(true)}>+ Log food</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {REACTIONS.map(r => {
          const active = filter === r.key;
          return (
            <Glass
              key={r.key}
              tint={counts[r.key] > 0 ? r.tint : null}
              padding={16}
              style={{
                textAlign: 'center', cursor: 'pointer',
                outline: active ? `2px solid ${r.color}` : 'none',
                outlineOffset: -1,
              }}
            >
              <div onClick={() => setFilter(filter === r.key ? 'all' : r.key)}>
                <div style={{
                  fontFamily: display, fontSize: 28, fontWeight: 500, fontStyle: 'italic',
                  color: r.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                }}>{counts[r.key]}</div>
                <div style={{
                  fontSize: 10, color: THEME.dim, marginTop: 6,
                  textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                }}>{r.label}</div>
              </div>
            </Glass>
          );
        })}
      </div>

      {showAdd && (
        <Glass tint="oklch(0.55 0.13 50 / 0.10)" padding={18} style={{ marginBottom: 22 }}>
          <div style={{
            fontFamily: display, fontSize: 18, fontStyle: 'italic',
            color: THEME.ink, marginBottom: 14,
          }}>Log a new food</div>

          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, color: THEME.dim, marginBottom: 8, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>Quick picks</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_FOODS.map(f => {
                const active = newFood === f;
                return (
                  <button key={f} onClick={() => setNewFood(f)} style={{
                    background: active ? 'oklch(0.55 0.13 50 / 0.18)' : 'oklch(1 0 0 / 0.55)',
                    border: 'none',
                    color: active ? THEME.accent : THEME.text,
                    borderRadius: 999, padding: '5px 12px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: active
                      ? 'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 0 0 0.5px oklch(0.55 0.13 50 / 0.5)'
                      : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.12)',
                  }}>{f}</button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input placeholder="Food name" value={newFood} onChange={e => setNewFood(e.target.value)} style={{ flex: 2, minWidth: 180 }} />
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {REACTIONS.map(r => {
              const active = newReaction === r.key;
              return (
                <button key={r.key} onClick={() => setNewReaction(r.key)} style={{
                  flex: 1, padding: '9px 4px', borderRadius: 12,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? r.tint : 'oklch(1 0 0 / 0.55)',
                  color: active ? r.color : THEME.dim,
                  border: 'none',
                  letterSpacing: '0.04em',
                  boxShadow: active
                    ? `inset 0 1px 0 oklch(1 0 0 / 0.5), 0 0 0 0.5px ${r.color}`
                    : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                }}>{r.label}</button>
              );
            })}
          </div>

          <input
            placeholder="Notes (optional — texture, preparation, amount eaten…)"
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            style={{ marginBottom: 14, width: '100%' }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...glassBtnGhost, flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            <button style={{ ...glassBtnPrimary, flex: 2, opacity: (!newFood.trim() || saving) ? 0.5 : 1 }}
              onClick={addFood} disabled={!newFood.trim() || saving}>
              {saving ? 'Saving…' : 'Log food'}
            </button>
          </div>
        </Glass>
      )}

      {loading ? (
        <div style={{ display: 'flex', gap: 10, color: THEME.dim }}><div className="spinner" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>👶</div>
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            color: THEME.ink, marginBottom: 8,
          }}>{filter === 'all' ? 'no foods logged yet' : `no ${reactionInfo(filter).label.toLowerCase()} reactions`}</div>
          <div style={{ fontSize: 13, color: THEME.dim, lineHeight: 1.55 }}>
            log each new food as you introduce it. i'll keep track so you don't have to.
          </div>
        </Glass>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(food => {
            const r = reactionInfo(food.reaction);
            return (
              <Glass key={food.id} padding={14} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: r.color, flexShrink: 0, marginTop: 5,
                  boxShadow: `0 0 0 3px ${r.tint || 'transparent'}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>{food.food_name}</div>
                  <div style={{ fontSize: 12, color: THEME.dim, marginTop: 3 }}>
                    {food.date_tried}
                    <span style={{ marginLeft: 8, color: r.color, fontWeight: 600 }}>{r.label}</span>
                  </div>
                  {food.notes && <div style={{ fontSize: 12, color: THEME.text, marginTop: 6, lineHeight: 1.5 }}>{food.notes}</div>}
                </div>
                <button onClick={() => removeFood(food.id, food.food_name)}
                  style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 18, padding: '2px 4px', flexShrink: 0 }}>✕</button>
              </Glass>
            );
          })}
        </div>
      )}
    </div>
  );
}
