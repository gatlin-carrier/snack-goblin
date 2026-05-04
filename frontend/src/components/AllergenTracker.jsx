import { useState, useEffect } from 'react';

const ALLERGENS = ['Peanuts','Tree Nuts','Eggs','Dairy','Wheat','Soy','Fish','Shellfish','Sesame'];

const STATUS_META = {
  not_introduced: { label: 'Not introduced', color: 'var(--border)', bg: 'var(--surface2)', dot: '○' },
  introduced:     { label: 'Introduced',     color: 'var(--accent)', bg: 'rgba(124,111,247,0.08)', dot: '●' },
  passed:         { label: 'Passed ✓',        color: 'var(--green)',  bg: 'rgba(74,222,128,0.08)', dot: '●' },
  reaction:       { label: 'Reaction ⚠️',     color: 'var(--red)',    bg: 'rgba(239,68,68,0.08)',  dot: '●' },
};

const REACTION_LEVELS = [
  { key: '', label: 'None' },
  { key: 'mild', label: 'Mild' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'severe', label: 'Severe — consult doctor' },
];

function AllergenCard({ item, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(item.status || 'not_introduced');
  const [date, setDate] = useState(item.first_introduced_date || new Date().toISOString().slice(0,10));
  const [reaction, setReaction] = useState(item.reaction || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [saving, setSaving] = useState(false);

  const meta = STATUS_META[status] || STATUS_META.not_introduced;

  async function save() {
    setSaving(true);
    await fetch('/api/allergens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergen: item.allergen, status, first_introduced_date: status !== 'not_introduced' ? date : null, reaction: reaction || null, notes: notes || null }),
    });
    setSaving(false);
    setExpanded(false);
    onUpdate();
  }

  async function reset() {
    await fetch(`/api/allergens/${encodeURIComponent(item.allergen)}`, { method: 'DELETE' });
    setStatus('not_introduced'); setReaction(''); setNotes('');
    setExpanded(false);
    onUpdate();
  }

  return (
    <div style={{ background: meta.bg, border: `1px solid ${meta.color}33`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}
         onClick={() => setExpanded(e => !e)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 22, color: meta.color, lineHeight: 1 }}>{meta.dot}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{item.allergen}</div>
          <div style={{ fontSize: 12, color: meta.color, marginTop: 2 }}>{meta.label}</div>
          {item.first_introduced_date && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
              First: {new Date(item.first_introduced_date + 'T12:00:00').toLocaleDateString()}
            </div>
          )}
        </div>
        <div style={{ fontSize: 18, color: 'var(--text-dim)' }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${meta.color}33` }}
             onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {Object.entries(STATUS_META).map(([key, m]) => (
              <button key={key} onClick={() => setStatus(key)}
                style={{ background: status === key ? meta.color : 'var(--surface2)', color: status === key ? 'white' : 'var(--text-dim)',
                         border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {m.label}
              </button>
            ))}
          </div>

          {status !== 'not_introduced' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>First introduced date</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Reaction level</div>
                <select value={reaction} onChange={e => setReaction(e.target.value)} style={{ width: '100%' }}>
                  {REACTION_LEVELS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Notes</div>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 2 tsp peanut butter in oatmeal, no reaction" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {item.status && item.status !== 'not_introduced' && (
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={reset}>Reset</button>
            )}
            <button className="btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AllergenTracker({ showToast }) {
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/allergens');
    setAllergens(await res.json());
    setLoading(false);
  }

  const introduced = allergens.filter(a => a.status !== 'not_introduced').length;
  const passed = allergens.filter(a => a.status === 'passed').length;
  const reactions = allergens.filter(a => a.status === 'reaction').length;

  if (loading) return <div className="page"><div style={{ color: 'var(--text-dim)', display: 'flex', gap: 10 }}><div className="spinner" /> Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Allergen Tracker</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            {introduced}/{ALLERGENS.length} introduced · {passed} passed · {reactions > 0 ? `${reactions} reaction` : 'no reactions'}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, background: 'rgba(124,111,247,0.04)', borderColor: 'rgba(124,111,247,0.2)' }}>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-dim)' }}>
          Track allergen introduction for your 16-month-old. The American Academy of Pediatrics recommends introducing common allergens early and regularly (at least 2–3×/week) to reduce allergy risk. Tap any allergen to log an introduction.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allergens.map(item => (
          <AllergenCard key={item.allergen} item={item} onUpdate={load} />
        ))}
      </div>
    </div>
  );
}
