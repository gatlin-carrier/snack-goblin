import { useState, useEffect } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const MILK_TYPES = [
  { id: 'milk',        label: 'Whole / 2% milk' },
  { id: 'soy_milk',    label: 'Soy milk' },
  { id: 'almond_milk', label: 'Almond milk' },
  { id: 'oat_milk',    label: 'Oat milk' },
];

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

function OzInput({ value, onChange, suffix = 'oz/day' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="number" min={0} max={64} step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value) || 0)}
        style={{ width: 80, fontVariantNumeric: 'tabular-nums' }}
      />
      <span style={{ fontSize: 12, color: THEME.dim }}>{suffix}</span>
    </div>
  );
}

export default function DrinkSettings({ onClose, showToast }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/drinks/settings').then(r => r.json()).then(setSettings);
  }, []);

  if (!settings) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-body" style={{ color: THEME.dim, padding: 40, textAlign: 'center' }}>Loading…</div>
        </div>
      </div>
    );
  }

  function setStanding(key, oz) {
    setSettings(s => ({ ...s, standing: { ...s.standing, [key]: oz } }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/drinks/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.error) { showToast(`Error: ${data.error}`); return; }
      showToast("got it. nutrition bars now factor drinks in.");
      onClose();
    } finally { setSaving(false); }
  }

  const milkOz = settings.standing.milk || 0;
  const juiceOz = settings.standing.juice || 0;
  const overJuice = juiceOz > 6;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: THEME.ink }}>
            🥛 Drinks
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: THEME.text, marginBottom: 18, lineHeight: 1.6 }}>
            What does the toddler drink on a typical day? we'll bake this into the nutrition bars so you don't have to log every cup.
          </div>

          <div style={{ marginBottom: 18 }}>
            <FieldLabel>Milk type</FieldLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MILK_TYPES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSettings(s => ({ ...s, milk_type: m.id }))}
                  style={{
                    ...(settings.milk_type === m.id ? glassBtnPrimary : glassBtnGhost),
                    fontSize: 12, padding: '7px 14px',
                  }}
                >{m.label}</button>
              ))}
            </div>
          </div>

          <Glass padding={16} radius={16} style={{ marginBottom: 14 }}>
            <FieldLabel>Milk per day</FieldLabel>
            <OzInput value={milkOz} onChange={v => setStanding('milk', v)} />
            <div style={{ fontSize: 11, color: THEME.faint, marginTop: 6 }}>
              AAP suggests 16–24 oz/day for ages 1–5.
            </div>
          </Glass>

          <Glass padding={16} radius={16} style={{ marginBottom: 14 }}>
            <FieldLabel>100% juice per day</FieldLabel>
            <OzInput value={juiceOz} onChange={v => setStanding('juice', v)} />
            <div style={{ fontSize: 11, color: overJuice ? THEME.rust : THEME.faint, marginTop: 6 }}>
              {overJuice
                ? `over the AAP cap of 6 oz/day. not the end of the world — just heads-up.`
                : 'AAP cap: ≤6 oz/day for ages 1–6.'}
            </div>
          </Glass>

          <div style={{ height: 1, background: THEME.hairline, margin: '18px 0' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>Per-day logger</FieldLabel>
              <div style={{ fontSize: 12.5, color: THEME.text, lineHeight: 1.5 }}>
                Off (default): we use the standing intake above as a daily constant.
                On: a quick-log strip appears on the dashboard, and nutrition reflects what you actually logged this week.
              </div>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, logger_enabled: !s.logger_enabled }))}
              style={{
                ...(settings.logger_enabled ? glassBtnPrimary : glassBtnGhost),
                fontSize: 12, padding: '8px 14px', whiteSpace: 'nowrap',
              }}
            >
              {settings.logger_enabled ? '✓ on' : 'off'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button style={{ ...glassBtnGhost, flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              style={{ ...glassBtnPrimary, flex: 2, opacity: saving ? 0.5 : 1 }}
              onClick={save}
              disabled={saving}
            >{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
