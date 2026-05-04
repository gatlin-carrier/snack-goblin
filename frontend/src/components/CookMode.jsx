import { useState, useEffect, useRef } from 'react';
import { linkifyTechniques } from '../lib/techniques.js';

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
    <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--surface2)', borderRadius: 10,
                  border: `1px solid ${done ? 'var(--green)' : running ? 'var(--accent)' : 'var(--border)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 28, fontVariantNumeric: 'tabular-nums',
                      color: done ? 'var(--green)' : 'var(--text)' }}>
          {done ? '✓ Done!' : `${mins}:${String(secs).padStart(2, '0')}`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!done && (
            <button className="btn-ghost" style={{ fontSize: 13, padding: '6px 14px' }}
              onClick={() => setRunning(r => !r)}>
              {running ? '⏸ Pause' : running === false && remaining < seconds ? '▶ Resume' : '▶ Start'}
            </button>
          )}
          <button className="btn-ghost" style={{ fontSize: 13, padding: '6px 14px' }}
            onClick={() => { setRemaining(seconds); setRunning(false); }}>↺ Reset</button>
        </div>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: done ? 'var(--green)' : 'var(--accent)',
                      width: `${pct}%`, transition: 'width 1s linear' }} />
      </div>
    </div>
  );
}

async function markCooked(recipeId) {
  try { await fetch(`/api/recipes/${recipeId}/cooked`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch {}
}

export default function CookMode({ recipe, onClose }) {
  const [phase, setPhase] = useState('mise'); // 'mise' | 'cook'
  const [step, setStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [doneSteps, setDoneSteps] = useState(new Set());
  const wakeLockRef = useRef(null);

  const steps = recipe.instructions || [];
  const ingredients = recipe.ingredients || [];
  const totalSteps = steps.length;
  const currentStep = steps[step] || '';
  const timerSeconds = parseTimerSeconds(currentStep);

  // Request screen wake lock so phone doesn't sleep while cooking
  useEffect(() => {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lock => { wakeLockRef.current = lock; }).catch(() => {});
    }
    return () => { wakeLockRef.current?.release(); };
  }, []);

  // Keyboard navigation
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
      position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)',
                                           fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {recipe.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {recipe.prep_time_min}m prep · {recipe.cook_time_min}m cook · {recipe.cuisine}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 20, padding: '4px 8px' }}>
          {['mise', 'cook'].map(p => (
            <button key={p} onClick={() => { setPhase(p); if (p === 'cook') setStep(0); }}
              style={{ background: phase === p ? 'var(--accent)' : 'transparent', color: phase === p ? 'white' : 'var(--text-dim)',
                       border: 'none', borderRadius: 16, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {p === 'mise' ? 'Ingredients' : 'Steps'}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px' }}>

        {phase === 'mise' ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20 }}>
              Check off everything before you start cooking.
            </div>
            {ingredients.map((ing, i) => (
              <div key={i} onClick={() => toggleIngredient(i)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
                opacity: checkedIngredients.has(i) ? 0.45 : 1,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: checkedIngredients.has(i) ? 'var(--accent)' : 'var(--surface2)',
                  border: `2px solid ${checkedIngredients.has(i) ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'white',
                }}>
                  {checkedIngredients.has(i) ? '✓' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{ing.name}</span>
                </div>
                <div style={{ fontSize: 15, color: 'var(--text-dim)', textAlign: 'right' }}>
                  {ing.quantity} {ing.unit}
                </div>
              </div>
            ))}

            {recipe.toddler_notes && (
              <div style={{ marginTop: 24, padding: 16, background: 'rgba(74,222,128,0.06)',
                            border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>👶 Toddler prep</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{recipe.toddler_notes}</div>
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', marginTop: 24, fontSize: 16, padding: '14px' }}
              onClick={() => setPhase('cook')}>
              Start Cooking →
            </button>
          </>
        ) : (
          <>
            {/* Progress */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
              {steps.map((_, i) => (
                <div key={i} onClick={() => setStep(i)} style={{
                  flex: 1, minWidth: 20, height: 4, borderRadius: 2, cursor: 'pointer',
                  background: doneSteps.has(i) ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--surface2)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
              Step {step + 1} of {totalSteps}
            </div>

            {/* Current step */}
            <div style={{ fontSize: 22, lineHeight: 1.55, fontWeight: 500, marginBottom: 8 }}>
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
                      style={{ color: 'var(--accent)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 4 }}
                    >{part.term}<span style={{ fontSize: 14, marginLeft: 3, opacity: 0.7 }}>▶</span></a>
                  )
              ))}
            </div>

            {/* Timer if step has a time */}
            {timerSeconds && <Timer key={`${step}-${timerSeconds}`} seconds={timerSeconds} />}

            {/* Upcoming step preview */}
            {step < totalSteps - 1 && (
              <div style={{ marginTop: 24, padding: 14, background: 'var(--surface)', borderRadius: 8,
                            border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, fontWeight: 600,
                              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next</div>
                <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  {steps[step + 1]}
                </div>
              </div>
            )}

            {step === totalSteps - 1 && doneSteps.has(step) && (
              <div style={{ marginTop: 24, textAlign: 'center', padding: 24, background: 'rgba(74,222,128,0.07)',
                            borderRadius: 12, border: '1px solid rgba(74,222,128,0.2)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>Enjoy your meal!</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer nav (cook phase only) */}
      {phase === 'cook' && (
        <div style={{
          display: 'flex', gap: 12, padding: '16px 20px',
          borderTop: '1px solid var(--border)', flexShrink: 0,
          paddingBottom: `calc(16px + env(safe-area-inset-bottom))`,
        }}>
          <button className="btn-ghost" style={{ flex: 1, fontSize: 16 }}
            onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            ← Back
          </button>
          {step < totalSteps - 1 ? (
            <button className="btn-primary" style={{ flex: 2, fontSize: 16 }} onClick={markDone}>
              Done → Next
            </button>
          ) : (
            <button className="btn-primary" style={{ flex: 2, fontSize: 16, background: 'var(--green)' }}
              onClick={() => { setDoneSteps(s => new Set([...s, step])); markCooked(recipe.id); }}>
              ✓ Finish
            </button>
          )}
        </div>
      )}
    </div>
  );
}
