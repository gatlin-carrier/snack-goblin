import { useState } from 'react';

const MEAL_TYPES = [
  { key: 'breakfast', label: '🌅 Breakfast' },
  { key: 'lunch',     label: '☀️ Lunch' },
  { key: 'dinner',    label: '🌙 Dinner' },
  { key: 'snack',     label: '🍎 Snack' },
];

export default function ImportURLPanel({ onClose, onImported }) {
  const [url, setUrl] = useState('');
  const [mealType, setMealType] = useState('dinner');
  const [status, setStatus] = useState(null); // null | 'fetching' | 'parsing' | 'done' | 'error'
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function importRecipe() {
    if (!url.trim()) return;
    setStatus('fetching');
    setError(null);
    setResult(null);

    try {
      setStatus('parsing');
      const res = await fetch('/api/recipes/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), meal_type: mealType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data.recipe);
      setStatus('done');
      onImported?.();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="modal-backdrop" onClick={status === 'done' || !status || status === 'error' ? onClose : undefined}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontSize: 18, fontWeight: 700 }}>🔗 Import Recipe from URL</div>
          {status !== 'fetching' && status !== 'parsing' && (
            <button className="modal-close" onClick={onClose}>×</button>
          )}
        </div>
        <div className="modal-body">

          {status === 'done' && result ? (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{result.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>
                  {result.cuisine} · {(result.prep_time_min || 0) + (result.cook_time_min || 0)} min
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{result.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => { setStatus(null); setUrl(''); setResult(null); }}>
                  Import Another
                </button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={onClose}>Done</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 20 }}>
                Paste a URL from any recipe site — Serious Eats, NYT Cooking, Bon Appétit, etc.
                The AI will extract and adapt the recipe for your family.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Recipe URL</div>
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://www.seriouseats.com/…"
                    style={{ width: '100%' }}
                    onKeyDown={e => e.key === 'Enter' && importRecipe()}
                    disabled={status === 'fetching' || status === 'parsing'}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Meal type</div>
                  <select value={mealType} onChange={e => setMealType(e.target.value)}
                    style={{ width: '100%' }} disabled={status === 'fetching' || status === 'parsing'}>
                    {MEAL_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {(status === 'fetching' || status === 'parsing') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                              color: 'var(--text-dim)', marginBottom: 16 }}>
                  <div className="spinner" />
                  {status === 'fetching' ? 'Fetching page…' : 'AI is reading and extracting recipe…'}
                </div>
              )}

              {error && (
                <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}
                  disabled={status === 'fetching' || status === 'parsing'}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={importRecipe}
                  disabled={!url.trim() || status === 'fetching' || status === 'parsing'}>
                  Import Recipe
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
