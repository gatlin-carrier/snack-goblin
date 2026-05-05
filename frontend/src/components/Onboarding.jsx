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

export default function Onboarding({ onDone }) {
  const { update } = usePrefs();
  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState('mid');
  const [hated, setHated] = useState(null);
  const [comfort, setComfort] = useState(null);
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    await update({
      energy_level: energy,
      excluded_cuisines: hated ? [hated] : [],
      comfort_meal_type: comfort,
      onboarding_complete: true,
    });
    // Also persist the excluded cuisine in the preferences table so the LLM picks it up
    if (hated) {
      try {
        await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'cuisine', name: hated, preference: 'excluded' }),
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

  return (
    <div className="modal-backdrop" style={{ pointerEvents: 'auto' }}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ padding: '32px 28px' }}>

          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>👹</div>
            <div style={{
              fontFamily: display, fontSize: 24, fontStyle: 'italic',
              color: THEME.ink, marginBottom: 6, lineHeight: 1.2,
            }}>
              {step === 0 && "let's set you up"}
              {step === 1 && 'anything you never want to see?'}
              {step === 2 && 'what feels like home?'}
              {step === 3 && "i'll remember that"}
            </div>
            <div style={{ color: THEME.dim, fontSize: 13, lineHeight: 1.55 }}>
              {step === 0 && 'three quick questions. less than a minute. you can always change these later.'}
              {step === 1 && "i'll never suggest this cuisine again."}
              {step === 2 && "your default comfort meal — i'll lean here on rough days."}
              {step === 3 && "energy, no-go, and your comfort type. all noted."}
            </div>
          </div>

          {step === 0 && (
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

          {step === 1 && (
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

          {step === 2 && (
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

          {step === 3 && (
            <Glass padding={16} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.7 }}>
                <div>energy default → <strong style={{ color: THEME.ink }}>{ENERGY_OPTIONS.find(o => o.key === energy)?.label}</strong></div>
                {hated && <div style={{ marginTop: 6 }}>never suggest → <strong style={{ color: THEME.red }}>{hated}</strong></div>}
                {comfort && <div style={{ marginTop: 6 }}>comfort → <strong style={{ color: THEME.sage }}>{COMFORT_TYPES.find(o => o.key === comfort)?.label}</strong></div>}
              </div>
            </Glass>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
            {step > 0 && step < 3 && (
              <button style={{ ...glassBtnGhost, flex: 1 }} onClick={() => setStep(s => s - 1)}>back</button>
            )}
            {step === 0 && (
              <button style={{ ...glassBtnGhost, flex: 1 }} onClick={skip} disabled={saving}>skip for now</button>
            )}
            {step < 3 ? (
              <button style={{ ...glassBtnPrimary, flex: 2 }} onClick={() => setStep(s => s + 1)}>next →</button>
            ) : (
              <button style={{ ...glassBtnPrimary, flex: 2, opacity: saving ? 0.5 : 1 }} onClick={finish} disabled={saving}>
                {saving ? 'saving…' : "done · let's go"}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 18 }}>
            {[0, 1, 2, 3].map(i => (
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
