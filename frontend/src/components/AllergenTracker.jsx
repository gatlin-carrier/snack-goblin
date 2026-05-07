import { useState, useEffect } from 'react';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const ALLERGENS = ['Peanuts','Tree Nuts','Eggs','Dairy','Wheat','Soy','Fish','Shellfish','Sesame'];

const STATUS_META = {
  not_introduced: { label: 'Not introduced', tone: 'neutral', tint: null,                            color: THEME.dim,    dot: '○' },
  introduced:     { label: 'Introduced',     tone: 'accent',  tint: 'oklch(0.55 0.13 50 / 0.12)',    color: THEME.accent, dot: '●' },
  passed:         { label: 'Passed ✓',       tone: 'sage',    tint: 'oklch(0.55 0.10 50 / 0.14)',   color: THEME.sage,   dot: '●' },
  reaction:       { label: 'Reaction ⚠',     tone: 'rust',    tint: 'oklch(0.55 0.18 25 / 0.14)',    color: THEME.red,    dot: '●' },
};

const REACTION_LEVELS = [
  { key: '',         label: 'None' },
  { key: 'mild',     label: 'Mild' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'severe',   label: 'Severe — consult doctor' },
];

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

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
    <Glass tint={meta.tint} padding={16} style={{ cursor: 'pointer' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 22, color: meta.color, lineHeight: 1, flexShrink: 0 }}>{meta.dot}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: THEME.ink }}>{item.allergen}</div>
          <div style={{ fontSize: 12, color: meta.color, marginTop: 3, fontWeight: 600 }}>{meta.label}</div>
          {item.first_introduced_date && (
            <div style={{ fontSize: 11, color: THEME.faint, marginTop: 1 }}>
              First: {new Date(item.first_introduced_date + 'T12:00:00').toLocaleDateString()}
            </div>
          )}
        </div>
        <div style={{ fontSize: 14, color: THEME.dim }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${THEME.hairline}` }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {Object.entries(STATUS_META).map(([key, m]) => {
              const active = status === key;
              return (
                <button key={key} onClick={() => setStatus(key)}
                  style={{
                    background: active ? m.color : 'oklch(1 0 0 / 0.55)',
                    color: active ? 'white' : THEME.text,
                    border: 'none', borderRadius: 999, padding: '5px 14px',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    fontFamily: 'inherit',
                    boxShadow: active ? 'none' : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                  }}>
                  {m.label}
                </button>
              );
            })}
          </div>

          {status !== 'not_introduced' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <FieldLabel>First introduced date</FieldLabel>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <FieldLabel>Reaction level</FieldLabel>
                <select value={reaction} onChange={e => setReaction(e.target.value)} style={{ width: '100%' }}>
                  {REACTION_LEVELS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 2 tsp peanut butter in oatmeal, no reaction" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {item.status && item.status !== 'not_introduced' && (
              <button style={{ ...glassBtnGhost, fontSize: 12 }} onClick={reset}>Reset</button>
            )}
            <button style={{ ...glassBtnPrimary, flex: 1, fontSize: 13, opacity: saving ? 0.5 : 1 }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </Glass>
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

  if (loading) return <div className="page"><div style={{ color: THEME.dim, display: 'flex', gap: 10 }}><div className="spinner" /> Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{
            fontSize: 11, color: THEME.accent, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6,
          }}>Introductions</div>
          <div style={{
            fontFamily: display, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
            color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.01em',
          }}>Allergens</div>
          <div style={{ fontSize: 13, color: THEME.dim, marginTop: 6 }}>
            <span style={{ color: THEME.ink, fontFamily: display, fontStyle: 'italic', fontWeight: 500, fontSize: 18, marginRight: 4 }}>{introduced}</span>
            <span style={{ color: THEME.faint, marginRight: 10 }}>/ {ALLERGENS.length}</span>
            introduced · {passed} passed · {reactions > 0 ? <span style={{ color: THEME.red, fontWeight: 600 }}>{reactions} reaction{reactions > 1 ? 's' : ''}</span> : 'no reactions'}
          </div>
        </div>
      </div>

      <Glass tint="oklch(0.55 0.13 50 / 0.10)" padding={16} style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: THEME.text }}>
          Track allergen introduction for your toddler. The American Academy of Pediatrics recommends introducing common allergens early and regularly (at least 2–3×/week) to reduce allergy risk. Tap any allergen to log an introduction.
        </div>
      </Glass>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allergens.map(item => (
          <AllergenCard key={item.allergen} item={item} onUpdate={load} />
        ))}
      </div>
    </div>
  );
}
