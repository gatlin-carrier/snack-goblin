import { useState } from 'react';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅', default: 5 },
  { key: 'lunch',     label: 'Lunch',     icon: '☀️',  default: 5 },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙',  default: 7 },
  { key: 'snack',     label: 'Snacks',    icon: '🍎',  default: 4 },
];

function StatusIcon({ status }) {
  if (status === 'generating') return <div className="spinner" style={{ width: 16, height: 16 }} />;
  if (status === 'done')       return <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>;
  if (status === 'error')      return <span style={{ color: 'var(--red)', fontSize: 16 }}>✕</span>;
  return <span style={{ color: 'var(--border)', fontSize: 16 }}>○</span>;
}

export default function GeneratePanel({ onGenerated, onClose }) {
  const [counts, setCounts] = useState({ breakfast: 5, lunch: 5, dinner: 7, snack: 4 });
  const [mode, setMode] = useState('batch');
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activeLLM, setActiveLLM] = useState(null);

  useState(() => {
    fetch('/api/llm-configs').then(r => r.json()).then(configs => {
      const active = configs.find(c => c.is_active);
      if (active) setActiveLLM(active);
    }).catch(() => {});
  });
  // progress: { steps: { [mealType]: 'pending'|'generating'|'done'|'error' }, generated: { [mealType]: number }, totalGenerated: number }

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
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontSize: 18, fontWeight: 700 }}>✨ Generate Recipes</div>
          {!generating && <button className="modal-close" onClick={onClose}>×</button>}
        </div>
        <div className="modal-body">

          {!generating && !done ? (
            <>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
                Choose how many recipes to generate per meal type.
                {activeLLM && <span> Using <strong style={{ color: 'var(--text)' }}>{activeLLM.name}</strong> ({activeLLM.provider}).</span>}
              </div>

              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[
                  { key: 'batch', label: '🥘 Batch Prep', desc: 'Optimized for Sunday cook sessions' },
                  { key: 'quick', label: '⚡ Quick', desc: '30 min or under, any night' },
                ].map(m => (
                  <button key={m.key} onClick={() => setMode(m.key)} style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: mode === m.key ? 'rgba(124,111,247,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${mode === m.key ? 'rgba(124,111,247,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    color: mode === m.key ? 'var(--accent)' : 'var(--text-dim)',
                    textAlign: 'left',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{m.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                {MEAL_TYPES.map(({ key, label, icon }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 500 }}>{icon} {label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 16 }}
                        onClick={() => setCounts(c => ({ ...c, [key]: Math.max(0, c[key] - 1) }))}>−</button>
                      <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{counts[key]}</span>
                      <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 16 }}
                        onClick={() => setCounts(c => ({ ...c, [key]: Math.min(20, c[key] + 1) }))}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20 }}>
                Total: <strong style={{ color: 'var(--text)' }}>{total} recipes</strong>
                {total > 0 && <span> · takes ~{Math.ceil(total / 3)}–{Math.ceil(total / 2)} min</span>}
              </div>

              {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={generate} disabled={total === 0}>
                  Generate {total} Recipes
                </button>
              </div>
            </>
          ) : done ? (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
                  {progress?.totalGenerated} recipes generated!
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                  Head to the Recipes tab to browse and add them to your plan.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {activeTypes.map(m => (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                    <StatusIcon status={progress?.steps[m.key]} />
                    <span>{m.icon} {m.label}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: 13 }}>
                      {progress?.generated[m.key] ?? 0} recipes
                    </span>
                  </div>
                ))}
              </div>
              <button className="btn-primary" style={{ width: '100%' }} onClick={onClose}>Done</button>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 20 }}>
                {activeLLM ? `${activeLLM.name} (${activeLLM.provider}) is working…` : 'Generating…'} This takes a few minutes. Don't close this window.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {activeTypes.map(m => {
                  const status = progress?.steps[m.key] || 'pending';
                  const generated = progress?.generated[m.key];
                  return (
                    <div key={m.key} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      background: status === 'generating' ? 'rgba(124,111,247,0.08)' : status === 'done' ? 'rgba(74,222,128,0.06)' : 'var(--surface2)',
                      border: `1px solid ${status === 'generating' ? 'rgba(124,111,247,0.3)' : status === 'done' ? 'rgba(74,222,128,0.2)' : 'var(--border)'}`,
                      borderRadius: 8,
                      transition: 'background 0.3s, border-color 0.3s',
                    }}>
                      <StatusIcon status={status} />
                      <span style={{ fontWeight: 500 }}>{m.icon} {m.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-dim)' }}>
                        {status === 'generating' && 'Generating…'}
                        {status === 'done' && `${generated} recipes ✓`}
                        {status === 'error' && <span style={{ color: 'var(--red)' }}>Failed</span>}
                        {status === 'pending' && `${counts[m.key]} requested`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {progress && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                    <span>Progress</span>
                    <span>{Object.values(progress.steps).filter(s => s === 'done' || s === 'error').length} of {activeTypes.length} batches</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, background: 'var(--accent)', transition: 'width 0.4s',
                      width: `${(Object.values(progress.steps).filter(s => s === 'done' || s === 'error').length / activeTypes.length) * 100}%`,
                    }} />
                  </div>
                </div>
              )}

              {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>⚠️ {error}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
