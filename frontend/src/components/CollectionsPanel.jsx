import { useState, useEffect } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

export default function CollectionsPanel({ showToast, onFilterByCollection }) {
  const [collections, setCollections] = useState([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [expandedRecipes, setExpandedRecipes] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await fetch('/api/collections').then(r => r.json());
    setCollections(data);
  }

  async function add() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) { const d = await res.json(); showToast(d.error || 'Error'); return; }
      setNewName('');
      showToast('Collection created');
      load();
    } finally { setAdding(false); }
  }

  async function remove(col) {
    await fetch(`/api/collections/${col.id}`, { method: 'DELETE' });
    setCollections(c => c.filter(x => x.id !== col.id));
    showToast(`Deleted "${col.name}"`);
  }

  async function expand(col) {
    if (expanded === col.id) { setExpanded(null); return; }
    setExpanded(col.id);
    const recipes = await fetch(`/api/collections/${col.id}/recipes`).then(r => r.json());
    setExpandedRecipes(recipes);
  }

  async function removeFromCollection(colId, recipeId, recipeName) {
    await fetch(`/api/collections/${colId}/recipes/${recipeId}`, { method: 'DELETE' });
    setExpandedRecipes(r => r.filter(x => x.id !== recipeId));
    setCollections(c => c.map(x => x.id === colId ? { ...x, recipe_count: Math.max(0, (x.recipe_count || 1) - 1) } : x));
    showToast(`Removed "${recipeName}"`);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{
            fontSize: 11, color: THEME.accent, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6,
          }}>Themes</div>
          <div style={{
            fontFamily: display, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
            color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.01em',
          }}>Collections</div>
          <div style={{ fontSize: 13, color: THEME.dim, marginTop: 6 }}>
            <span style={{ color: THEME.ink, fontFamily: display, fontStyle: 'italic', fontWeight: 500, fontSize: 18, marginRight: 4 }}>{collections.length}</span>
            collection{collections.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="New collection name…"
          style={{ flex: 1 }}
        />
        <button style={{ ...glassBtnPrimary, opacity: (!newName.trim() || adding) ? 0.5 : 1 }} onClick={add} disabled={!newName.trim() || adding}>
          {adding ? '…' : '+ Create'}
        </button>
      </div>

      {collections.length === 0 ? (
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>🗂</div>
          <div style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', color: THEME.ink, marginBottom: 8 }}>
            No collections yet
          </div>
          <div style={{ fontSize: 13, color: THEME.dim, lineHeight: 1.55 }}>
            Group recipes by theme — "High Protein", "Kid Favorites", "Date Night", whatever fits your family.
          </div>
        </Glass>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {collections.map(col => (
            <Glass key={col.id} padding={0} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 22 }}>🗂</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: THEME.ink }}>{col.name}</div>
                  <div style={{ fontSize: 12, color: THEME.dim, marginTop: 2 }}>
                    {col.recipe_count || 0} recipe{col.recipe_count !== 1 ? 's' : ''}
                  </div>
                </div>
                {onFilterByCollection && (
                  <button style={{ ...glassBtnGhost, fontSize: 12, padding: '5px 12px' }}
                    onClick={() => onFilterByCollection(col)}>
                    Browse →
                  </button>
                )}
                <button onClick={() => expand(col)}
                  style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>
                  {expanded === col.id ? '▲' : '▼'}
                </button>
                <button onClick={() => remove(col)}
                  style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}>✕</button>
              </div>

              {expanded === col.id && (
                <div style={{ borderTop: `1px solid ${THEME.hairline}`, padding: '8px 16px 14px' }}>
                  {expandedRecipes.length === 0 ? (
                    <div style={{ fontSize: 13, color: THEME.dim, padding: '8px 0', fontStyle: 'italic' }}>
                      No recipes yet. Open a recipe and use "+ Collection" to add it here.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {expandedRecipes.map((r, i) => (
                        <div key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 0',
                          borderTop: i > 0 ? `1px solid ${THEME.hairline}` : 'none',
                        }}>
                          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: THEME.ink }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: THEME.dim }}>{r.cuisine}</div>
                          <button onClick={() => removeFromCollection(col.id, r.id, r.name)}
                            style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Glass>
          ))}
        </div>
      )}
    </div>
  );
}
