import { useState, useEffect } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const GOAL_FIELDS = [
  { key: 'calories',  label: 'Calories',     unit: 'kcal', placeholder: '2000', min: 1000, max: 5000, step: 50 },
  { key: 'protein_g', label: 'Protein',      unit: 'g',    placeholder: '150',  min: 20,   max: 400,  step: 5  },
  { key: 'iron_mg',   label: 'Iron',         unit: 'mg',   placeholder: '18',   min: 5,    max: 50,   step: 1  },
  { key: 'dha_mg',    label: 'Omega-3 / DHA', unit: 'mg',  placeholder: '250',  min: 50,   max: 3000, step: 50 },
];

const PRESETS = [
  { label: 'Moderate · 2000 kcal',  values: { calories: 2000, protein_g: 100, iron_mg: 18, dha_mg: 250 } },
  { label: 'Active · 2500 kcal',    values: { calories: 2500, protein_g: 150, iron_mg: 18, dha_mg: 500 } },
  { label: 'High protein · 2200 kcal', values: { calories: 2200, protein_g: 200, iron_mg: 18, dha_mg: 500 } },
];

export default function AdultGoals({ onClose, showToast }) {
  const [goals, setGoals] = useState({ calories: '', protein_g: '', iron_mg: '', dha_mg: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/adult-goals').then(r => r.json()).then(data => {
      setGoals({
        calories:  data.calories  ?? '',
        protein_g: data.protein_g ?? '',
        iron_mg:   data.iron_mg   ?? '',
        dha_mg:    data.dha_mg    ?? '',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function applyPreset(preset) {
    setGoals({ ...preset.values });
  }

  async function save() {
    const payload = {};
    for (const f of GOAL_FIELDS) {
      const val = parseFloat(goals[f.key]);
      if (!isNaN(val)) payload[f.key] = val;
    }
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/adult-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { showToast('Error saving goals'); return; }
      showToast('Adult nutrition goals saved');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>💪 Adult nutrition goals</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: THEME.text, marginBottom: 22, lineHeight: 1.6 }}>
            Set weekly per-adult targets. The dashboard will show how your meal plan stacks up — useful for keeping your own protein and omega-3 intake on track alongside the toddler focus.
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: THEME.accent,
              letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10,
            }}>Quick presets · per day</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)} style={{
                  background: 'oklch(1 0 0 / 0.55)',
                  border: 'none',
                  color: THEME.text,
                  borderRadius: 999, padding: '5px 14px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', gap: 10, color: THEME.dim, marginBottom: 20 }}>
              <div className="spinner" /> Loading…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {GOAL_FIELDS.map(f => (
                <div key={f.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, letterSpacing: '0.02em' }}>{f.label}</label>
                    <span style={{ fontSize: 11, color: THEME.faint, letterSpacing: '0.04em' }}>{f.unit} / day</span>
                  </div>
                  <input
                    type="number"
                    value={goals[f.key]}
                    onChange={e => setGoals(g => ({ ...g, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    min={f.min} max={f.max} step={f.step}
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...glassBtnGhost, flex: 1 }} onClick={onClose}>Cancel</button>
            <button style={{ ...glassBtnPrimary, flex: 2, opacity: (saving || loading) ? 0.5 : 1 }} onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save goals'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
