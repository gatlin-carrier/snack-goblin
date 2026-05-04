import { useState, useEffect } from 'react';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

function AgeDisplay({ ageMonths, label, ageRange }) {
  if (ageMonths === null || ageMonths === undefined) return null;
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  const ageStr = years > 0
    ? `${years} year${years !== 1 ? 's' : ''}${months > 0 ? `, ${months} month${months !== 1 ? 's' : ''}` : ''}`
    : `${months} month${months !== 1 ? 's' : ''}`;

  const tone = ageMonths < 24 ? 'accent' : ageMonths < 48 ? 'sage' : 'rust';

  return (
    <Glass padding={16} style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: display, fontSize: 26, fontWeight: 500, fontStyle: 'italic',
        color: THEME.ink, lineHeight: 1.1, marginBottom: 8,
      }}>{ageStr} old</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge tone={tone}>{ageRange} guideline</Badge>
        <span style={{ fontSize: 12, color: THEME.dim }}>{label}</span>
      </div>
    </Glass>
  );
}

function RDARow({ label, value, unit, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: 13, padding: '10px 14px',
      borderBottom: last ? 'none' : `1px solid ${THEME.hairline}`,
    }}>
      <span style={{ color: THEME.dim }}>{label}</span>
      <span style={{ fontWeight: 600, color: THEME.ink, fontVariantNumeric: 'tabular-nums' }}>{value} {unit}</span>
    </div>
  );
}

export default function ChildProfile({ onClose, showToast }) {
  const [profile, setProfile] = useState(null);
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/child-profile').then(r => r.json()).then(p => {
      setProfile(p);
      if (p.dob) setDob(p.dob);
    });
  }, []);

  async function save() {
    if (!dob) return;
    setSaving(true);
    try {
      const res = await fetch('/api/child-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dob }),
      });
      const data = await res.json();
      if (data.error) { showToast(`Error: ${data.error}`); return; }
      setProfile(data);
      showToast('Child profile saved — nutrition guidelines updated');
    } finally {
      setSaving(false);
    }
  }

  const rdas = profile?.rdas;
  const rdaItems = rdas ? [
    ['Calories', rdas.calories, 'kcal'],
    ['Iron', rdas.iron_mg, 'mg'],
    ['Zinc', rdas.zinc_mg, 'mg'],
    ['Calcium', rdas.calcium_mg, 'mg'],
    ['Vitamin D', rdas.vitamin_d_iu, 'IU'],
    ['DHA', rdas.dha_mg, 'mg'],
    ['Choline', rdas.choline_mg, 'mg'],
    ['Sodium cap', rdas.sodium_mg, 'mg'],
    ['Added sugar limit', rdas.added_sugar_g === 0 ? 'None' : `<${rdas.added_sugar_g}`, rdas.added_sugar_g === 0 ? '' : 'g'],
  ] : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>👶 Child profile</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: THEME.text, marginBottom: 18, lineHeight: 1.6 }}>
            Set your child's date of birth so nutrition guidelines automatically update as they grow. RDAs shift at 24 months and 48 months — honey rules, choking hazard warnings, and iron targets all adjust accordingly.
          </div>

          {profile && <AgeDisplay ageMonths={profile.age_months} label={profile.label} ageRange={profile.age_range} />}

          <div style={{ marginBottom: 22 }}>
            <FieldLabel>Date of birth</FieldLabel>
            <input
              type="date"
              value={dob}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setDob(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {rdas && (
            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: THEME.accent,
                letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12,
              }}>Active daily targets</div>
              <Glass padding={0}>
                {rdaItems.map(([label, value, unit], i) => (
                  <RDARow key={label} label={label} value={value} unit={unit} last={i === rdaItems.length - 1} />
                ))}
              </Glass>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...glassBtnGhost, flex: 1 }} onClick={onClose}>Cancel</button>
            <button style={{ ...glassBtnPrimary, flex: 2, opacity: (saving || !dob) ? 0.5 : 1 }} onClick={save} disabled={saving || !dob}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
