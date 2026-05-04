import { useState } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const MEAL_TYPES = [
  { key: 'breakfast', label: '🌅 Breakfast' },
  { key: 'lunch',     label: '☀️ Lunch' },
  { key: 'dinner',    label: '🌙 Dinner' },
  { key: 'snack',     label: '🍎 Snack' },
];

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

export default function ImportURLPanel({ onClose, onImported }) {
  const [url, setUrl] = useState('');
  const [mealType, setMealType] = useState('dinner');
  const [status, setStatus] = useState(null);
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

  const busy = status === 'fetching' || status === 'parsing';

  return (
    <div className="modal-backdrop" onClick={status === 'done' || !status || status === 'error' ? onClose : undefined}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>🔗 Import from URL</div>
          {!busy && <button className="modal-close" onClick={onClose}>×</button>}
        </div>
        <div className="modal-body">

          {status === 'done' && result ? (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 22px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{
                  fontFamily: display, fontWeight: 500, fontStyle: 'italic',
                  fontSize: 22, color: THEME.ink, marginBottom: 6,
                }}>{result.name}</div>
                <div style={{ fontSize: 13, color: THEME.dim, marginBottom: 8 }}>
                  {result.cuisine} · {(result.prep_time_min || 0) + (result.cook_time_min || 0)} min
                </div>
                <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.55 }}>{result.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...glassBtnGhost, flex: 1 }} onClick={() => { setStatus(null); setUrl(''); setResult(null); }}>
                  Import another
                </button>
                <button style={{ ...glassBtnPrimary, flex: 1 }} onClick={onClose}>Done</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ color: THEME.text, fontSize: 13, marginBottom: 22, lineHeight: 1.55 }}>
                Paste a URL from any recipe site — Serious Eats, NYT Cooking, Bon Appétit, etc. The AI will extract and adapt the recipe for your family.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
                <div>
                  <FieldLabel>Recipe URL</FieldLabel>
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://www.seriouseats.com/…"
                    style={{ width: '100%' }}
                    onKeyDown={e => e.key === 'Enter' && importRecipe()}
                    disabled={busy}
                  />
                </div>

                <div>
                  <FieldLabel>Meal type</FieldLabel>
                  <select value={mealType} onChange={e => setMealType(e.target.value)}
                    style={{ width: '100%' }} disabled={busy}>
                    {MEAL_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {busy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: THEME.dim, marginBottom: 16 }}>
                  <div className="spinner" />
                  {status === 'fetching' ? 'Fetching page…' : 'AI is reading and extracting recipe…'}
                </div>
              )}

              {error && (
                <Glass tint="oklch(0.55 0.18 25 / 0.18)" padding={12} style={{ marginBottom: 16 }}>
                  <div style={{ color: THEME.red, fontSize: 13 }}>⚠️ {error}</div>
                </Glass>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...glassBtnGhost, flex: 1, opacity: busy ? 0.5 : 1 }} onClick={onClose} disabled={busy}>Cancel</button>
                <button style={{ ...glassBtnPrimary, flex: 2, opacity: (!url.trim() || busy) ? 0.5 : 1 }}
                  onClick={importRecipe} disabled={!url.trim() || busy}>
                  Import recipe
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
