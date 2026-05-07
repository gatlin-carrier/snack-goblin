import { useState } from 'react';
import { usePrefs } from '../lib/prefs.jsx';
import { THEME, display, glassBtnGhost } from '../lib/glass.jsx';
import Goblin from './Goblin.jsx';

const MOODS = [
  { key: 'good', emoji: '🌞', label: 'good',  energy: 'high', copy: "let's cook something fun." },
  { key: 'mid',  emoji: '🌤', label: 'mid',   energy: 'mid',  copy: "normal day. i'll stick to easy-ish." },
  { key: 'rough', emoji: '🌧', label: 'rough', energy: 'low',  copy: "got it. only 25-min meals tonight." },
];

export default function MoodCheckIn({ onClose }) {
  const { update } = usePrefs();
  const [picked, setPicked] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function pick(mood) {
    setPicked(mood.key);
    setSubmitting(true);
    await update({
      last_mood: mood.key,
      last_mood_at: new Date().toISOString().slice(0, 10),
      energy_level: mood.energy,
    });
    setTimeout(onClose, 800);
  }

  return (
    <div className="modal-backdrop" onClick={submitting ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ padding: '32px 28px' }}>
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Goblin state="curious" size={52} />
            </div>
            <div style={{ fontFamily: display, fontSize: 24, fontStyle: 'italic', lineHeight: 1.2 }} className="text-ink mb-1.5">
              before i pick — how's today?
            </div>
            <div className="text-dim text-[13px]" style={{ lineHeight: 1.55 }}>
              one tap. i'll match your energy.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOODS.map(m => {
              const active = picked === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => pick(m)}
                  disabled={submitting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px',
                    background: active
                      ? 'oklch(0.55 0.13 50 / 0.18)'
                      : 'oklch(1 0 0 / 0.55)',
                    border: 'none', borderRadius: 16,
                    cursor: submitting ? 'default' : 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                    boxShadow: active
                      ? `inset 0 1px 0 oklch(1 0 0 / 0.85), 0 0 0 0.5px ${THEME.accent}`
                      : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    transition: 'background 160ms ease',
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div className="font-bold text-ink text-[15px] lowercase">{m.label}</div>
                    <div className="text-[12px] text-dim mt-0.5">{m.copy}</div>
                  </div>
                  {active && <span className="text-[18px] text-accent">✓</span>}
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            style={{ ...glassBtnGhost, width: '100%', marginTop: 16, fontSize: 12, opacity: 0.7 }}
          >
            skip · don't ask today
          </button>
        </div>
      </div>
    </div>
  );
}
