import { useState, useEffect } from 'react';

const PREF_LABELS = { liked: { label: '❤️ Liked', color: 'var(--green)' }, disliked: { label: '👎 Disliked', color: 'var(--yellow)' }, excluded: { label: '🚫 Excluded', color: 'var(--red)' } };

const COMMON_CUISINES = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 'Thai', 'Japanese', 'Chinese', 'Greek', 'Middle Eastern', 'Korean', 'French', 'Spanish'];

export default function PreferencesPanel({ onClose }) {
  const [prefs, setPrefs] = useState({ cuisines: { liked: [], disliked: [], excluded: [] }, ingredients: { liked: [], disliked: [], excluded: [] } });
  const [newCuisine, setNewCuisine] = useState('');
  const [newIngredient, setNewIngredient] = useState('');
  const [newIngPref, setNewIngPref] = useState('excluded');
  const [newCuisinePref, setNewCuisinePref] = useState('liked');

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch('/api/preferences');
    setPrefs(await res.json());
  }

  async function addCuisine(name, preference) {
    if (!name.trim()) return;
    await fetch('/api/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'cuisine', name: name.trim(), preference }) });
    setNewCuisine('');
    load();
  }

  async function addIngredient() {
    if (!newIngredient.trim()) return;
    await fetch('/api/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'ingredient', name: newIngredient.trim(), preference: newIngPref }) });
    setNewIngredient('');
    load();
  }

  async function remove(type, name) {
    await fetch('/api/preferences', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, name }) });
    load();
  }

  const allCuisines = [...prefs.cuisines.liked, ...prefs.cuisines.disliked, ...prefs.cuisines.excluded];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontSize: 18, fontWeight: 700 }}>⚙️ Preferences</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* Cuisines */}
          <div style={{ marginBottom: 28 }}>
            <div className="section-title">Cuisines</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
              Liked cuisines are prioritized in generation. Excluded cuisines are never generated.
            </div>

            {/* Current cuisine prefs */}
            {['liked', 'disliked', 'excluded'].map(pref => {
              const items = prefs.cuisines[pref] || [];
              if (!items.length) return null;
              return (
                <div key={pref} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: PREF_LABELS[pref].color, marginBottom: 6 }}>{PREF_LABELS[pref].label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map(name => (
                      <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', fontSize: 13 }}>
                        {name}
                        <button onClick={() => remove('cuisine', name)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Quick add from common */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Quick add:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {COMMON_CUISINES.filter(c => !allCuisines.includes(c)).map(c => (
                  <button key={c} className="btn-ghost" style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20 }} onClick={() => addCuisine(c, newCuisinePref)}>{c}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newCuisine} onChange={e => setNewCuisine(e.target.value)} placeholder="Custom cuisine…" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && addCuisine(newCuisine, newCuisinePref)} />
                <select value={newCuisinePref} onChange={e => setNewCuisinePref(e.target.value)} style={{ width: 110 }}>
                  <option value="liked">❤️ Liked</option>
                  <option value="disliked">👎 Disliked</option>
                  <option value="excluded">🚫 Excluded</option>
                </select>
                <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => addCuisine(newCuisine, newCuisinePref)}>Add</button>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="section-title">Ingredients</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
              Excluded ingredients are filtered from all results and never generated. Disliked are minimized.
            </div>

            {['liked', 'disliked', 'excluded'].map(pref => {
              const items = prefs.ingredients[pref] || [];
              if (!items.length) return null;
              return (
                <div key={pref} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: PREF_LABELS[pref].color, marginBottom: 6 }}>{PREF_LABELS[pref].label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map(name => (
                      <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', fontSize: 13 }}>
                        {name}
                        <button onClick={() => remove('ingredient', name)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input value={newIngredient} onChange={e => setNewIngredient(e.target.value)} placeholder="e.g. cilantro, mushrooms…" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && addIngredient()} />
              <select value={newIngPref} onChange={e => setNewIngPref(e.target.value)} style={{ width: 110 }}>
                <option value="liked">❤️ Liked</option>
                <option value="disliked">👎 Disliked</option>
                <option value="excluded">🚫 Excluded</option>
              </select>
              <button className="btn-primary" style={{ fontSize: 13 }} onClick={addIngredient}>Add</button>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-dim)' }}>
            Preferences are applied to new recipe generation and recommendations. Re-generate to see the effect on your recipe pool.
          </div>
        </div>
      </div>
    </div>
  );
}
