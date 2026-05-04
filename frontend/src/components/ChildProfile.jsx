import { useState, useEffect } from 'react';

function AgeDisplay({ ageMonths, label, ageRange }) {
  if (ageMonths === null) return null;
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  const ageStr = years > 0
    ? `${years} year${years !== 1 ? 's' : ''}${months > 0 ? `, ${months} month${months !== 1 ? 's' : ''}` : ''}`
    : `${months} month${months !== 1 ? 's' : ''}`;

  const bracketColor = ageMonths < 24 ? 'var(--blue)' : ageMonths < 48 ? 'var(--green)' : 'var(--accent)';

  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700 }}>{ageStr} old</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: bracketColor + '22', color: bracketColor }}>
          {ageRange} guideline
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
      </div>
    </div>
  );
}

function RDARow({ label, value, unit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value} {unit}</span>
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, fontSize: 18 }}>👶 Child Profile</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.6 }}>
            Set your child's date of birth so nutrition guidelines automatically update as they grow. RDAs shift at 24 months and 48 months — honey rules, choking hazard warnings, and iron targets all adjust accordingly.
          </div>

          {profile && <AgeDisplay ageMonths={profile.age_months} label={profile.label} ageRange={profile.age_range} />}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Date of birth</div>
            <input
              type="date"
              value={dob}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setDob(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {rdas && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Active daily targets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <RDARow label="Calories" value={rdas.calories} unit="kcal" />
                <RDARow label="Iron" value={rdas.iron_mg} unit="mg" />
                <RDARow label="Zinc" value={rdas.zinc_mg} unit="mg" />
                <RDARow label="Calcium" value={rdas.calcium_mg} unit="mg" />
                <RDARow label="Vitamin D" value={rdas.vitamin_d_iu} unit="IU" />
                <RDARow label="DHA" value={rdas.dha_mg} unit="mg" />
                <RDARow label="Choline" value={rdas.choline_mg} unit="mg" />
                <RDARow label="Sodium cap" value={rdas.sodium_mg} unit="mg" />
                <RDARow label="Added sugar limit" value={rdas.added_sugar_g === 0 ? 'None' : `<${rdas.added_sugar_g}`} unit={rdas.added_sugar_g === 0 ? '' : 'g'} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving || !dob}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
