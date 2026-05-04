import { useState, useEffect } from 'react';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', tone: 'yellow', accent: 'oklch(0.55 0.12 80)' },
  { key: 'lunch',     label: 'Lunch',     tone: 'sage',   accent: THEME.sage },
  { key: 'dinner',    label: 'Dinner',    tone: 'accent', accent: THEME.accent },
  { key: 'snack',     label: 'Snacks',    tone: 'rust',   accent: THEME.rust },
];

function StatusIcon({ status }) {
  if (status === 'generating') return <div className="spinner" style={{ width: 16, height: 16 }} />;
  if (status === 'done')       return <span style={{ color: THEME.sage, fontSize: 18, lineHeight: 1 }}>✓</span>;
  if (status === 'error')      return <span style={{ color: THEME.red, fontSize: 18, lineHeight: 1 }}>✕</span>;
  return <span style={{ color: THEME.faint, fontSize: 18, lineHeight: 1 }}>○</span>;
}

export default function GeneratePanel({ onGenerated, onClose }) {
  const [counts, setCounts] = useState({ breakfast: 5, lunch: 5, dinner: 7, snack: 4 });
  const [mode, setMode] = useState('batch');
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activeLLM, setActiveLLM] = useState(null);

  useEffect(() => {
    fetch('/api/llm-configs').then(r => r.json()).then(configs => {
      const active = configs.find(c => c.is_active);
      if (active) setActiveLLM(active);
    }).catch(() => {});
  }, []);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const activeTypes = MEAL_TYPES.filter(m => counts[m.key] > 0);

  async function generate() {
    if (total === 0) return;
    setGenerating(true);
    setDone(false);
    setError(null);

    const initialSteps = {};
    for (const m of activeTypes) initialSteps[m.key] = 'pending';
    setProgress({ steps: initialSteps, generated: {}, totalGenerated: 0 });

    try {
      const res = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...counts, mode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(part.slice(6)); } catch { continue; }

          if (event.type === 'start') {
            setProgress(p => ({ ...p, steps: { ...p.steps, [event.mealType]: 'generating' } }));
          } else if (event.type === 'done') {
            setProgress(p => ({
              ...p,
              steps: { ...p.steps, [event.mealType]: 'done' },
              generated: { ...p.generated, [event.mealType]: event.generated },
              totalGenerated: (p.totalGenerated || 0) + event.generated,
            }));
          } else if (event.type === 'error') {
            setProgress(p => ({ ...p, steps: { ...p.steps, [event.mealType]: 'error' } }));
          } else if (event.type === 'complete') {
            setDone(true);
            setProgress(p => ({ ...p, totalGenerated: event.totalGenerated }));
            onGenerated({ generated: event.totalGenerated });
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={done || !generating ? onClose : undefined}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>✨ Generate recipes</div>
          {!generating && <button className="modal-close" onClick={onClose}>×</button>}
        </div>
        <div className="modal-body">

          {!generating && !done ? (
            <>
              <div style={{ color: THEME.dim, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                Choose how many recipes to generate per meal type.
                {activeLLM && (
                  <> Using <strong style={{ color: THEME.ink }}>{activeLLM.name}</strong>{' '}
                  <span style={{ color: THEME.faint }}>· {activeLLM.provider}</span>.</>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
                {[
                  { key: 'batch', label: '🥘 Batch Prep', desc: 'Shared ingredients, Sunday cook sessions' },
                  { key: 'quick', label: '⚡ Quick',      desc: '30 min or under, any night' },
                  { key: 'adhd',  label: '✨ ADHD',       desc: 'Maximum novelty — every meal feels new' },
                ].map(m => {
                  const active = mode === m.key;
                  return (
                    <button key={m.key} onClick={() => setMode(m.key)} style={{
                      flex: 1, padding: '12px 12px', borderRadius: 14, cursor: 'pointer',
                      background: active
                        ? `linear-gradient(180deg, color-mix(in oklch, ${THEME.accent} 80%, white 20%), ${THEME.accent})`
                        : 'oklch(1 0 0 / 0.55)',
                      backdropFilter: active ? 'none' : 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: active ? 'none' : 'blur(20px) saturate(180%)',
                      border: 'none',
                      color: active ? 'white' : THEME.text,
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      boxShadow: active
                        ? 'inset 0 1px 0 oklch(1 0 0 / 0.4), 0 0 0 0.5px oklch(0.4 0.1 35 / 0.5), 0 6px 14px -6px oklch(0.55 0.16 35 / 0.55)'
                        : 'inset 0 1px 0 oklch(1 0 0 / 0.7), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{m.label}</div>
                      <div style={{ fontSize: 11, opacity: active ? 0.9 : 0.7, marginTop: 3, lineHeight: 1.35 }}>{m.desc}</div>
                    </button>
                  );
                })}
              </div>

              <Glass padding={4} style={{ marginBottom: 22 }}>
                {MEAL_TYPES.map((m, i) => (
                  <div key={m.key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${THEME.hairline}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Badge tone={m.tone}>{m.label}</Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button style={{ ...glassBtnGhost, padding: '4px 12px', fontSize: 18, lineHeight: 1 }}
                        onClick={() => setCounts(c => ({ ...c, [m.key]: Math.max(0, c[m.key] - 1) }))}>−</button>
                      <span style={{
                        minWidth: 28, textAlign: 'center', fontWeight: 700,
                        color: THEME.ink, fontVariantNumeric: 'tabular-nums', fontSize: 16,
                      }}>{counts[m.key]}</span>
                      <button style={{ ...glassBtnGhost, padding: '4px 12px', fontSize: 18, lineHeight: 1 }}
                        onClick={() => setCounts(c => ({ ...c, [m.key]: Math.min(20, c[m.key] + 1) }))}>+</button>
                    </div>
                  </div>
                ))}
              </Glass>

              <div style={{ fontSize: 13, color: THEME.dim, marginBottom: 22, textAlign: 'center' }}>
                Total{' '}
                <strong style={{ color: THEME.ink, fontFamily: display, fontStyle: 'italic', fontSize: 18, fontWeight: 500 }}>{total}</strong>
                {' '}recipes
                {total > 0 && <span style={{ color: THEME.faint }}> · ~{Math.ceil(total / 3)}–{Math.ceil(total / 2)} min</span>}
              </div>

              {error && (
                <Glass tint="oklch(0.55 0.18 25 / 0.18)" padding={12} style={{ marginBottom: 16 }}>
                  <div style={{ color: THEME.red, fontSize: 13 }}>⚠️ {error}</div>
                </Glass>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...glassBtnGhost, flex: 1 }} onClick={onClose}>Cancel</button>
                <button style={{ ...glassBtnPrimary, flex: 2, opacity: total === 0 ? 0.5 : 1 }} onClick={generate} disabled={total === 0}>
                  Generate {total} {total === 1 ? 'recipe' : 'recipes'}
                </button>
              </div>
            </>
          ) : done ? (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 22px' }}>
                <div style={{ fontSize: 38, marginBottom: 10 }}>🎉</div>
                <div style={{
                  fontFamily: display, fontSize: 24, fontStyle: 'italic', fontWeight: 500,
                  color: THEME.ink, marginBottom: 6,
                }}>{progress?.totalGenerated} recipes ready</div>
                <div style={{ color: THEME.dim, fontSize: 13 }}>
                  Head to the Recipes tab to browse and add them to your plan.
                </div>
              </div>
              <Glass padding={4} style={{ marginBottom: 22 }}>
                {activeTypes.map((m, i) => (
                  <div key={m.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12, fontSize: 14,
                    padding: '10px 14px',
                    borderTop: i > 0 ? `1px solid ${THEME.hairline}` : 'none',
                  }}>
                    <StatusIcon status={progress?.steps[m.key]} />
                    <Badge tone={m.tone}>{m.label}</Badge>
                    <span style={{ marginLeft: 'auto', color: THEME.dim, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                      {progress?.generated[m.key] ?? 0} recipes
                    </span>
                  </div>
                ))}
              </Glass>
              <button style={{ ...glassBtnPrimary, width: '100%' }} onClick={onClose}>Done</button>
            </>
          ) : (
            <>
              <div style={{ color: THEME.dim, fontSize: 13, marginBottom: 22, lineHeight: 1.5 }}>
                {activeLLM ? (
                  <><strong style={{ color: THEME.ink }}>{activeLLM.name}</strong> <span style={{ color: THEME.faint }}>· {activeLLM.provider}</span> is working…</>
                ) : 'Generating…'} This takes a few minutes. Don't close this window.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                {activeTypes.map(m => {
                  const status = progress?.steps[m.key] || 'pending';
                  const generated = progress?.generated[m.key];
                  const tint =
                    status === 'generating' ? 'oklch(0.62 0.14 35 / 0.14)' :
                    status === 'done'       ? 'oklch(0.55 0.10 145 / 0.14)' :
                    status === 'error'      ? 'oklch(0.55 0.18 25 / 0.14)' : null;
                  return (
                    <Glass key={m.key} tint={tint} padding={12} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'background 0.3s',
                    }}>
                      <StatusIcon status={status} />
                      <Badge tone={m.tone}>{m.label}</Badge>
                      <span style={{ marginLeft: 'auto', fontSize: 13, color: THEME.dim, fontVariantNumeric: 'tabular-nums' }}>
                        {status === 'generating' && 'Generating…'}
                        {status === 'done'  && <span style={{ color: THEME.sage, fontWeight: 600 }}>{generated} ready ✓</span>}
                        {status === 'error' && <span style={{ color: THEME.red }}>Failed</span>}
                        {status === 'pending' && `${counts[m.key]} requested`}
                      </span>
                    </Glass>
                  );
                })}
              </div>

              {progress && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: THEME.dim, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700 }}>
                    <span>Progress</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
                      {Object.values(progress.steps).filter(s => s === 'done' || s === 'error').length} / {activeTypes.length}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'oklch(0.4 0.02 60 / 0.10)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      background: `linear-gradient(90deg, ${THEME.accentSoft}, ${THEME.accent})`,
                      transition: 'width 0.4s',
                      width: `${(Object.values(progress.steps).filter(s => s === 'done' || s === 'error').length / activeTypes.length) * 100}%`,
                    }} />
                  </div>
                </div>
              )}

              {error && <div style={{ color: THEME.red, fontSize: 13 }}>⚠️ {error}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
