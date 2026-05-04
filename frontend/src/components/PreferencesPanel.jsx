import { useState, useEffect } from 'react';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const PREF_LABELS = {
  liked:    { label: '❤ Liked',     tone: 'sage',   color: THEME.sage },
  disliked: { label: '👎 Disliked', tone: 'yellow', color: 'oklch(0.55 0.13 80)' },
  excluded: { label: '🚫 Excluded', tone: 'rust',   color: THEME.red },
};

const COMMON_CUISINES = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 'Thai', 'Japanese', 'Chinese', 'Greek', 'Middle Eastern', 'Korean', 'French', 'Spanish'];

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: THEME.accent,
      letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12,
    }}>{children}</div>
  );
}

function PrefChip({ name, color, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'oklch(1 0 0 / 0.55)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 500,
      color: THEME.ink,
      boxShadow: `inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px ${color} `,
    }}>
      {name}
      <button onClick={onRemove} style={{
        background: 'none', border: 'none', color: THEME.dim,
        cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1,
      }}>×</button>
    </span>
  );
}

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
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>⚙ Preferences</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          <div style={{ marginBottom: 30 }}>
            <SectionTitle>Cuisines</SectionTitle>
            <div style={{ fontSize: 13, color: THEME.text, marginBottom: 14, lineHeight: 1.5 }}>
              Liked cuisines are prioritized in generation. Excluded cuisines are never generated.
            </div>

            {['liked', 'disliked', 'excluded'].map(pref => {
              const items = prefs.cuisines[pref] || [];
              if (!items.length) return null;
              return (
                <div key={pref} style={{ marginBottom: 12 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: PREF_LABELS[pref].color,
                    marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>{PREF_LABELS[pref].label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map(name => (
                      <PrefChip key={name} name={name} color={PREF_LABELS[pref].color} onRemove={() => remove('cuisine', name)} />
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: 11, color: THEME.dim, marginBottom: 8, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Quick add</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {COMMON_CUISINES.filter(c => !allCuisines.includes(c)).map(c => (
                  <button key={c} style={{ ...glassBtnGhost, fontSize: 12, padding: '4px 12px' }} onClick={() => addCuisine(c, newCuisinePref)}>{c}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={newCuisine} onChange={e => setNewCuisine(e.target.value)} placeholder="Custom cuisine…" style={{ flex: 1, minWidth: 160 }} onKeyDown={e => e.key === 'Enter' && addCuisine(newCuisine, newCuisinePref)} />
                <select value={newCuisinePref} onChange={e => setNewCuisinePref(e.target.value)} style={{ width: 130 }}>
                  <option value="liked">❤ Liked</option>
                  <option value="disliked">👎 Disliked</option>
                  <option value="excluded">🚫 Excluded</option>
                </select>
                <button style={{ ...glassBtnPrimary, fontSize: 13 }} onClick={() => addCuisine(newCuisine, newCuisinePref)}>Add</button>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Ingredients</SectionTitle>
            <div style={{ fontSize: 13, color: THEME.text, marginBottom: 14, lineHeight: 1.5 }}>
              Excluded ingredients are filtered from all results and never generated. Disliked are minimized.
            </div>

            {['liked', 'disliked', 'excluded'].map(pref => {
              const items = prefs.ingredients[pref] || [];
              if (!items.length) return null;
              return (
                <div key={pref} style={{ marginBottom: 12 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: PREF_LABELS[pref].color,
                    marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>{PREF_LABELS[pref].label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map(name => (
                      <PrefChip key={name} name={name} color={PREF_LABELS[pref].color} onRemove={() => remove('ingredient', name)} />
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <input value={newIngredient} onChange={e => setNewIngredient(e.target.value)} placeholder="e.g. cilantro, mushrooms…" style={{ flex: 1, minWidth: 160 }} onKeyDown={e => e.key === 'Enter' && addIngredient()} />
              <select value={newIngPref} onChange={e => setNewIngPref(e.target.value)} style={{ width: 130 }}>
                <option value="liked">❤ Liked</option>
                <option value="disliked">👎 Disliked</option>
                <option value="excluded">🚫 Excluded</option>
              </select>
              <button style={{ ...glassBtnPrimary, fontSize: 13 }} onClick={addIngredient}>Add</button>
            </div>
          </div>

          <div style={{
            marginTop: 26, paddingTop: 18,
            borderTop: `1px solid ${THEME.hairline}`,
            fontSize: 12, color: THEME.dim, lineHeight: 1.55,
          }}>
            Preferences are applied to new recipe generation and recommendations. Re-generate to see the effect on your recipe pool.
          </div>
        </div>
      </div>
    </div>
  );
}
