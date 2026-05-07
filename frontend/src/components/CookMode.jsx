import { useState, useEffect, useRef } from 'react';
import { linkifyTechniques } from '../lib/techniques.js';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost, ambientBG } from '../lib/glass.jsx';

function parseTimerSeconds(text) {
  const match = text.match(/(\d+)[\s-]*(to[\s-]*\d+\s*)?(minute|min|second|sec)/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  return match[3].toLowerCase().startsWith('s') ? n : n * 60;
}

function Timer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(ref.current); setRunning(false); onDone?.(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = ((seconds - remaining) / seconds) * 100;
  const done = remaining === 0;

  return (
    <Glass
      tint={done ? 'oklch(0.55 0.10 50 / 0.18)' : running ? 'oklch(0.55 0.13 50 / 0.14)' : null}
      padding={18}
      style={{ marginTop: 18 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          fontFamily: display, fontSize: 36, fontWeight: 500, fontStyle: 'italic',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          color: done ? THEME.sage : THEME.ink,
        }}>
          {done ? '✓ Done' : `${mins}:${String(secs).padStart(2, '0')}`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!done && (
            <button style={{ ...glassBtnGhost, fontSize: 13, padding: '7px 16px' }}
              onClick={() => setRunning(r => !r)}>
              {running ? '⏸ Pause' : remaining < seconds ? '▶ Resume' : '▶ Start'}
            </button>
          )}
          <button style={{ ...glassBtnGhost, fontSize: 13, padding: '7px 16px' }}
            onClick={() => { setRemaining(seconds); setRunning(false); }}>↺ Reset</button>
        </div>
      </div>
      <div style={{ height: 6, background: 'oklch(0.4 0.02 60 / 0.10)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: done
            ? `linear-gradient(90deg, ${THEME.sagePastel}, ${THEME.sage})`
            : `linear-gradient(90deg, ${THEME.accentSoft}, ${THEME.accent})`,
          width: `${pct}%`, transition: 'width 1s linear',
        }} />
      </div>
    </Glass>
  );
}

async function markCooked(recipeId) {
  try { await fetch(`/api/recipes/${recipeId}/cooked`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch {}
}

export default function CookMode({ recipe, onClose }) {
  const [phase, setPhase] = useState('mise');
  const [step, setStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [doneSteps, setDoneSteps] = useState(new Set());
  const wakeLockRef = useRef(null);

  const steps = recipe.instructions || [];
  const ingredients = recipe.ingredients || [];
  const totalSteps = steps.length;
  const currentStep = steps[step] || '';
  const timerSeconds = parseTimerSeconds(currentStep);

  useEffect(() => {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lock => { wakeLockRef.current = lock; }).catch(() => {});
    }
    return () => { wakeLockRef.current?.release(); };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (phase !== 'cook') return;
      if (e.key === 'ArrowRight' && step < totalSteps - 1) setStep(s => s + 1);
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, step, totalSteps]);

  function toggleIngredient(i) {
    setCheckedIngredients(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  function markDone() {
    setDoneSteps(s => new Set([...s, step]));
    if (step < totalSteps - 1) setStep(s => s + 1);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: ambientBG,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        flexShrink: 0,
        background: 'oklch(1 0 0 / 0.55)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        boxShadow: '0 1px 0 oklch(0.4 0.02 60 / 0.12)',
      }}>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: THEME.dim,
          fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: display, fontSize: 18, fontWeight: 500, fontStyle: 'italic',
            color: THEME.ink, lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {recipe.name}
          </div>
          <div style={{ fontSize: 11, color: THEME.dim, letterSpacing: '0.04em', marginTop: 2 }}>
            {recipe.prep_time_min}m prep · {recipe.cook_time_min}m cook · {recipe.cuisine}
          </div>
        </div>
        <div style={{
          display: 'flex', gap: 2,
          background: 'oklch(1 0 0 / 0.5)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 999, padding: 3,
          boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
        }}>
          {[
            { key: 'mise', label: 'Ingredients' },
            { key: 'cook', label: 'Steps' },
          ].map(p => {
            const active = phase === p.key;
            return (
              <button key={p.key} onClick={() => { setPhase(p.key); if (p.key === 'cook') setStep(0); }}
                style={{
                  background: active
                    ? `linear-gradient(180deg, color-mix(in oklch, ${THEME.accent} 80%, white 20%), ${THEME.accent})`
                    : 'transparent',
                  color: active ? 'white' : THEME.dim,
                  border: 'none', borderRadius: 999, padding: '5px 14px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px', maxWidth: 760, width: '100%', alignSelf: 'center' }}>

        {phase === 'mise' ? (
          <>
            <div style={{
              fontSize: 11, color: THEME.accent, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14,
            }}>Mise en place</div>
            <div style={{ fontSize: 14, color: THEME.text, marginBottom: 22, lineHeight: 1.5 }}>
              Check off everything before you start cooking.
            </div>
            <Glass padding={4}>
              {ingredients.map((ing, i) => {
                const checked = checkedIngredients.has(i);
                return (
                  <div key={i} onClick={() => toggleIngredient(i)} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    borderTop: i > 0 ? `1px solid ${THEME.hairline}` : 'none',
                    cursor: 'pointer',
                    opacity: checked ? 0.45 : 1,
                    transition: 'opacity 200ms ease',
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: checked
                        ? `linear-gradient(180deg, color-mix(in oklch, ${THEME.accent} 80%, white 20%), ${THEME.accent})`
                        : 'oklch(1 0 0 / 0.55)',
                      boxShadow: checked
                        ? 'inset 0 1px 0 oklch(1 0 0 / 0.4), 0 0 0 0.5px oklch(0.35 0.10 50 / 0.4)'
                        : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: 'white', fontWeight: 700,
                    }}>{checked ? '✓' : ''}</div>
                    <div style={{ flex: 1, fontWeight: 600, fontSize: 16, color: THEME.ink }}>{ing.name}</div>
                    <div style={{
                      fontSize: 14, color: THEME.dim, textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {ing.quantity} {ing.unit}
                    </div>
                  </div>
                );
              })}
            </Glass>

            {recipe.toddler_notes && (
              <Glass tint="oklch(0.55 0.10 50 / 0.18)" padding={18} style={{ marginTop: 22 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: THEME.ink, letterSpacing: '0.04em' }}>
                  👶 Toddler prep
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: THEME.text }}>{recipe.toddler_notes}</div>
              </Glass>
            )}

            <button style={{ ...glassBtnPrimary, width: '100%', marginTop: 24, fontSize: 16, padding: '14px' }}
              onClick={() => setPhase('cook')}>
              Start cooking →
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
              {steps.map((_, i) => {
                const isDone = doneSteps.has(i);
                const isCurrent = i === step;
                return (
                  <div key={i} onClick={() => setStep(i)} style={{
                    flex: 1, minWidth: 20, height: 4, borderRadius: 999, cursor: 'pointer',
                    background: isDone
                      ? THEME.sage
                      : isCurrent
                        ? THEME.accent
                        : 'oklch(0.4 0.02 60 / 0.18)',
                    transition: 'background 0.2s',
                  }} />
                );
              })}
            </div>

            <div style={{
              fontSize: 11, color: THEME.accent, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12,
            }}>Step {step + 1} of {totalSteps}</div>

            <div style={{
              fontFamily: display, fontSize: 26, lineHeight: 1.4, fontWeight: 400, fontStyle: 'italic',
              marginBottom: 8, color: THEME.ink, letterSpacing: '-0.005em',
            }}>
              {linkifyTechniques(currentStep).map((part, j) => (
                typeof part === 'string'
                  ? <span key={j}>{part}</span>
                  : (
                    <a
                      key={j}
                      href={part.url}
                      target="_blank"
                      rel="noreferrer"
                      title={`Watch a tutorial: ${part.term}`}
                      style={{
                        color: THEME.accent, textDecoration: 'underline',
                        textDecorationStyle: 'dotted', textUnderlineOffset: 5,
                      }}
                    >{part.term}<span style={{ fontSize: 14, marginLeft: 3, opacity: 0.7 }}>▶</span></a>
                  )
              ))}
            </div>

            {timerSeconds && <Timer key={`${step}-${timerSeconds}`} seconds={timerSeconds} />}

            {step < totalSteps - 1 && (
              <Glass padding={16} style={{ marginTop: 24 }}>
                <div style={{
                  fontSize: 10, color: THEME.dim, marginBottom: 6, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>Next</div>
                <div style={{ fontSize: 14, color: THEME.text, lineHeight: 1.55 }}>
                  {steps[step + 1]}
                </div>
              </Glass>
            )}

            {step === totalSteps - 1 && doneSteps.has(step) && (
              <Glass tint="oklch(0.55 0.10 50 / 0.22)" padding={28} style={{ marginTop: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
                <div style={{
                  fontFamily: display, fontWeight: 500, fontStyle: 'italic',
                  fontSize: 24, color: THEME.ink,
                }}>Enjoy your meal</div>
              </Glass>
            )}
          </>
        )}
      </div>

      {phase === 'cook' && (
        <div style={{
          display: 'flex', gap: 12, padding: '14px 20px',
          flexShrink: 0,
          paddingBottom: `calc(14px + env(safe-area-inset-bottom))`,
          background: 'oklch(1 0 0 / 0.55)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          boxShadow: '0 -1px 0 oklch(0.4 0.02 60 / 0.12)',
        }}>
          <button style={{ ...glassBtnGhost, flex: 1, fontSize: 16, padding: '12px', opacity: step === 0 ? 0.5 : 1 }}
            onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            ← Back
          </button>
          {step < totalSteps - 1 ? (
            <button style={{ ...glassBtnPrimary, flex: 2, fontSize: 16, padding: '12px' }} onClick={markDone}>
              Done → Next
            </button>
          ) : (
            <button
              style={{
                ...glassBtnPrimary, flex: 2, fontSize: 16, padding: '12px',
                background: `linear-gradient(180deg, color-mix(in oklch, ${THEME.sage} 75%, white 25%), ${THEME.sage})`,
                boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.4), 0 0 0 0.5px oklch(0.4 0.1 50 / 0.5), 0 6px 14px -6px oklch(0.55 0.10 50 / 0.55)',
              }}
              onClick={() => { setDoneSteps(s => new Set([...s, step])); markCooked(recipe.id); }}>
              ✓ Finish
            </button>
          )}
        </div>
      )}
    </div>
  );
}
