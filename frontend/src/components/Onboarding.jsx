import { useState } from 'react';
import { usePrefs } from '../lib/prefs.jsx';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const ENERGY_OPTIONS = [
  { key: 'low',  emoji: '🔋',     label: 'low',  copy: 'most days are tired days. keep it short.' },
  { key: 'mid',  emoji: '🔋🔋',   label: 'mid',  copy: 'normal-ish. up to 45 min is fine.' },
  { key: 'high', emoji: '🔋🔋🔋', label: 'high', copy: 'i like a project. anything goes.' },
];

const HATED_CUISINES = ['Mexican', 'Italian', 'Indian', 'Thai', 'Japanese', 'Greek', 'Middle Eastern', 'American'];
const COMFORT_TYPES = [
  { key: 'pasta',     label: 'pasta or noodles' },
  { key: 'rice',      label: 'rice bowls' },
  { key: 'sandwich',  label: 'sandwiches & wraps' },
  { key: 'soup',      label: 'soup & stew' },
  { key: 'one_pan',   label: 'one-pan / sheet-pan' },
  { key: 'breakfast', label: 'breakfast for dinner' },
];

const STEPS = ['energy', 'household', 'hated', 'comfort', 'done'];

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

export default function Onboarding({ onDone }) {
  const { update } = usePrefs();
  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState('mid');
  const [invites, setInvites] = useState([{ email: '', display_name: '' }]);
  const [hated, setHated] = useState(null);
  const [comfort, setComfort] = useState(null);
  const [saving, setSaving] = useState(false);

  function updateInvite(i, patch) {
    setInvites(arr => arr.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  }
  function addInviteRow() { setInvites(arr => [...arr, { email: '', display_name: '' }]); }
  function removeInviteRow(i) { setInvites(arr => arr.filter((_, idx) => idx !== i)); }

  const validInvites = invites.filter(r => r.email.trim() && r.email.includes('@'));

  async function finish() {
    setSaving(true);
    // Persist prefs
    await update({
      energy_level: energy,
      excluded_cuisines: hated ? [hated] : [],
      comfort_meal_type: comfort,
      onboarding_complete: true,
    });
    // Persist excluded cuisine in preferences table for LLM
    if (hated) {
      try {
        await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'cuisine', name: hated, preference: 'excluded' }),
        });
      } catch {}
    }
    // Bulk-invite household members
    if (validInvites.length > 0) {
      try {
        await fetch('/api/household/invite-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invites: validInvites.map(r => ({ email: r.email.trim(), display_name: r.display_name.trim() })) }),
        });
      } catch {}
    }
    setSaving(false);
    onDone();
  }

  async function skip() {
    setSaving(true);
    await update({ onboarding_complete: true });
    setSaving(false);
    onDone();
  }

  const headlines = {
    energy:    ["let's set you up", 'three quick questions. less than a minute. you can always change these later.'],
    household: ['anyone else in the den?', "add their email and i'll let them in when they sign in. they'll see the same recipes, plan, pantry, everything."],
    hated:     ['anything you never want to see?', "i'll never suggest this cuisine again."],
    comfort:   ['what feels like home?', "your default comfort meal — i'll lean here on rough days."],
    done:      ["i'll remember that", 'energy, household, no-go, and your comfort type. all noted.'],
  };
  const stepKey = STEPS[step];

  return (
    <div className="modal-backdrop" style={{ pointerEvents: 'auto' }}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ padding: '32px 28px' }}>

          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>👹</div>
            <div style={{
              fontFamily: display, fontSize: 24, fontStyle: 'italic',
              color: THEME.ink, marginBottom: 6, lineHeight: 1.2,
            }}>{headlines[stepKey][0]}</div>
            <div style={{ color: THEME.dim, fontSize: 13, lineHeight: 1.55 }}>
              {headlines[stepKey][1]}
            </div>
          </div>

          {stepKey === 'energy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ENERGY_OPTIONS.map(o => {
                const active = energy === o.key;
                return (
                  <button key={o.key} onClick={() => setEnergy(o.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px',
                    background: active ? 'oklch(0.62 0.14 35 / 0.18)' : 'oklch(1 0 0 / 0.55)',
                    border: 'none', borderRadius: 16, cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'inherit',
                    boxShadow: active
                      ? `inset 0 1px 0 oklch(1 0 0 / 0.85), 0 0 0 0.5px ${THEME.accent}`
                      : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  }}>
                    <span style={{ fontSize: 22 }}>{o.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: THEME.ink, fontSize: 15 }}>{o.label}</div>
                      <div style={{ fontSize: 12, color: THEME.dim, marginTop: 2 }}>{o.copy}</div>
                    </div>
                    {active && <span style={{ color: THEME.accent }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {stepKey === 'household' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {invites.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                  <div style={{ flex: 2, minWidth: 140 }}>
                    <FieldLabel>email</FieldLabel>
                    <input type="email" value={row.email}
                      onChange={e => updateInvite(i, { email: e.target.value })}
                      placeholder="them@example.com" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <FieldLabel>name</FieldLabel>
                    <input value={row.display_name}
                      onChange={e => updateInvite(i, { display_name: e.target.value })}
                      placeholder="e.g. wife" style={{ width: '100%' }} />
                  </div>
                  {invites.length > 1 && (
                    <button
                      onClick={() => removeInviteRow(i)}
                      style={{ background: 'transparent', border: 'none', color: THEME.dim, fontSize: 16, padding: '0 8px 10px', cursor: 'pointer' }}
                    >×</button>
                  )}
                </div>
              ))}
              <button
                onClick={addInviteRow}
                style={{ ...glassBtnGhost, fontSize: 12, alignSelf: 'flex-start', marginTop: 4 }}
              >+ add another</button>
              <div style={{ textAlign: 'center', fontSize: 12, color: THEME.faint, marginTop: 8 }}>
                {validInvites.length === 0 ? 'optional · skip if it\'s just you' : `${validInvites.length} ready to invite`}
              </div>
            </div>
          )}

          {stepKey === 'hated' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {HATED_CUISINES.map(c => {
                const active = hated === c;
                return (
                  <button key={c} onClick={() => setHated(active ? null : c)} style={{
                    background: active ? 'oklch(0.55 0.18 25 / 0.18)' : 'oklch(1 0 0 / 0.55)',
                    border: 'none', borderRadius: 999, padding: '8px 16px',
                    color: active ? THEME.red : THEME.text,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: active
                      ? `inset 0 1px 0 oklch(1 0 0 / 0.7), 0 0 0 0.5px ${THEME.red}`
                      : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                  }}>
                    {active ? '🚫 ' : ''}{c}
                  </button>
                );
              })}
              {hated == null && (
                <div style={{ width: '100%', textAlign: 'center', fontSize: 12, color: THEME.faint, marginTop: 8 }}>
                  optional · skip if no strong feelings
                </div>
              )}
            </div>
          )}

          {stepKey === 'comfort' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {COMFORT_TYPES.map(o => {
                const active = comfort === o.key;
                return (
                  <button key={o.key} onClick={() => setComfort(active ? null : o.key)} style={{
                    padding: '12px 16px',
                    background: active ? 'oklch(0.55 0.10 145 / 0.18)' : 'oklch(1 0 0 / 0.55)',
                    border: 'none', borderRadius: 14, cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'inherit',
                    color: THEME.ink, fontSize: 14, fontWeight: 600,
                    boxShadow: active
                      ? `inset 0 1px 0 oklch(1 0 0 / 0.85), 0 0 0 0.5px ${THEME.sage}`
                      : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  }}>
                    {active ? '✓ ' : ''}{o.label}
                  </button>
                );
              })}
              {comfort == null && (
                <div style={{ textAlign: 'center', fontSize: 12, color: THEME.faint, marginTop: 6 }}>
                  optional · skip if everything's good
                </div>
              )}
            </div>
          )}

          {stepKey === 'done' && (
            <Glass padding={16} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.7 }}>
                <div>energy default → <strong style={{ color: THEME.ink }}>{ENERGY_OPTIONS.find(o => o.key === energy)?.label}</strong></div>
                {validInvites.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    inviting → <strong style={{ color: THEME.sage }}>
                      {validInvites.map(r => r.display_name || r.email).join(', ')}
                    </strong>
                  </div>
                )}
                {hated && <div style={{ marginTop: 6 }}>never suggest → <strong style={{ color: THEME.red }}>{hated}</strong></div>}
                {comfort && <div style={{ marginTop: 6 }}>comfort → <strong style={{ color: THEME.sage }}>{COMFORT_TYPES.find(o => o.key === comfort)?.label}</strong></div>}
              </div>
            </Glass>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
            {step > 0 && stepKey !== 'done' && (
              <button style={{ ...glassBtnGhost, flex: 1 }} onClick={() => setStep(s => s - 1)}>back</button>
            )}
            {step === 0 && (
              <button style={{ ...glassBtnGhost, flex: 1 }} onClick={skip} disabled={saving}>skip for now</button>
            )}
            {stepKey !== 'done' ? (
              <button style={{ ...glassBtnPrimary, flex: 2 }} onClick={() => setStep(s => s + 1)}>next →</button>
            ) : (
              <button style={{ ...glassBtnPrimary, flex: 2, opacity: saving ? 0.5 : 1 }} onClick={finish} disabled={saving}>
                {saving ? 'saving…' : "done · let's go"}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 18 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === step ? THEME.accent : i < step ? THEME.sagePastel : 'oklch(0.4 0.02 60 / 0.18)',
                transition: 'background 200ms ease',
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
