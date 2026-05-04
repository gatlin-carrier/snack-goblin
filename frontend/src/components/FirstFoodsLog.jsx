import { useState, useEffect } from 'react';

const REACTIONS = [
  { key: 'none',     label: 'No reaction',  color: 'var(--green)',  bg: 'rgba(74,222,128,0.12)'  },
  { key: 'mild',     label: 'Mild',         color: 'var(--yellow)', bg: 'rgba(250,204,21,0.12)'  },
  { key: 'moderate', label: 'Moderate',     color: '#f97316',       bg: 'rgba(249,115,22,0.12)'  },
  { key: 'severe',   label: 'Severe',       color: 'var(--red)',    bg: 'rgba(248,113,113,0.12)' },
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
    showToast(`${newFood} logged!`);
    load();
  }

  async function removeFood(id, name) {
    await fetch(`/api/first-foods/${id}`, { method: 'DELETE' });
    setFoods(f => f.filter(i => i.id !== id));
    showToast(`Removed ${name}`);
  }

  const filtered = filter === 'all' ? foods : foods.filter(f => f.reaction === filter);
  const counts = { none: 0, mild: 0, moderate: 0, severe: 0 };
  for (const f of foods) counts[f.reaction] = (counts[f.reaction] || 0) + 1;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">First Foods</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            {foods.length} food{foods.length !== 1 ? 's' : ''} introduced
            {counts.severe > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>· {counts.severe} severe reaction{counts.severe > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Log Food</button>
      </div>

      {/* Stats row */}
      <div className="grid-2" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {REACTIONS.map(r => (
          <div key={r.key} className="card" style={{ textAlign: 'center', padding: '14px 10px', borderColor: counts[r.key] > 0 ? r.color + '33' : 'var(--glass-border)', cursor: 'pointer' }}
            onClick={() => setFilter(filter === r.key ? 'all' : r.key)}>
            <div style={{ fontSize: 22, fontWeight: 700, color: r.color }}>{counts[r.key]}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(124,111,247,0.25)' }}>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Log a new food</div>

          {/* Quick picks */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Quick picks</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_FOODS.map(f => (
                <button key={f} onClick={() => setNewFood(f)} style={{
                  background: newFood === f ? 'rgba(124,111,247,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${newFood === f ? 'rgba(124,111,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: newFood === f ? 'var(--accent)' : 'var(--text-dim)',
                  borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
                }}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              placeholder="Food name"
              value={newFood}
              onChange={e => setNewFood(e.target.value)}
              style={{ flex: 2, minWidth: 160 }}
            />
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              style={{ flex: 1, minWidth: 140 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {REACTIONS.map(r => (
              <button key={r.key} onClick={() => setNewReaction(r.key)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: newReaction === r.key ? r.bg : 'rgba(255,255,255,0.04)',
                color: newReaction === r.key ? r.color : 'var(--text-dim)',
                border: `1px solid ${newReaction === r.key ? r.color + '55' : 'rgba(255,255,255,0.08)'}`,
              }}>{r.label}</button>
            ))}
          </div>

          <input
            placeholder="Notes (optional — texture, preparation, amount eaten…)"
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={addFood} disabled={!newFood.trim() || saving}>
              {saving ? 'Saving…' : 'Log Food'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', gap: 10, color: 'var(--text-dim)' }}><div className="spinner" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👶</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{filter === 'all' ? 'No foods logged yet' : `No ${reactionInfo(filter).label.toLowerCase()} reactions`}</div>
          <div style={{ fontSize: 13 }}>Log each new food as you introduce it — track reactions and build a record.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(food => {
            const r = reactionInfo(food.reaction);
            return (
              <div key={food.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 16px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{food.food_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    {food.date_tried}
                    <span style={{ marginLeft: 8, color: r.color, fontWeight: 600 }}>{r.label}</span>
                  </div>
                  {food.notes && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.5 }}>{food.notes}</div>}
                </div>
                <button onClick={() => removeFood(food.id, food.food_name)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, padding: '2px 4px', flexShrink: 0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
