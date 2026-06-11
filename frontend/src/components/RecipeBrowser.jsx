import { useState, useEffect } from 'react';
import RecipeCard from './RecipeCard.jsx';
import RecipeModal from './RecipeModal.jsx';
import GeneratePanel from './GeneratePanel.jsx';
import PreferencesPanel from './PreferencesPanel.jsx';
import ImportURLPanel from './ImportURLPanel.jsx';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const MEAL_TYPES = [
  { key: '',          label: 'all' },
  { key: 'breakfast', label: 'breakfast' },
  { key: 'lunch',     label: 'lunch' },
  { key: 'dinner',    label: 'dinner' },
  { key: 'snack',     label: 'snacks' },
];

const SORT_OPTIONS = [
  { key: 'created_at',  label: 'newest' },
  { key: 'recommended', label: '⭐ recommended' },
  { key: 'rating',      label: 'top rated' },
  { key: 'cost',        label: '💰 cheapest' },
];

export default function RecipeBrowser({ currentPlan, onNavigate, showToast }) {
  const [recipes, setRecipes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState({ meal_type: '', sort: 'recommended', in_rotation: '' });
  const [planItemCount, setPlanItemCount] = useState(0);
  const [activeTag, setActiveTag] = useState('');
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);

  useEffect(() => {
    loadRecipes();
    if (currentPlan?.items) setPlanItemCount(currentPlan.items.length);
  }, [filter, activeCollection]);

  useEffect(() => {
    fetch('/api/collections').then(r => r.json()).then(setCollections).catch(() => {});
  }, []);

  async function loadRecipes() {
    let url;
    if (activeCollection) {
      url = `/api/collections/${activeCollection.id}/recipes`;
    } else {
      const params = new URLSearchParams();
      if (filter.meal_type) params.set('meal_type', filter.meal_type);
      if (filter.sort) params.set('sort', filter.sort);
      if (filter.in_rotation !== '') params.set('in_rotation', filter.in_rotation);
      url = '/api/recipes?' + params;
    }
    const res = await fetch(url);
    if (!res.ok) { setRecipes([]); return; }
    const data = await res.json();
    setRecipes(Array.isArray(data) ? data : []);
  }

  async function addToPlan(recipe) {
    if (!currentPlan?.id) { showToast("no plan yet. hop to the Plan tab to start one."); return; }
    await fetch(`/api/meal-plans/${currentPlan.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipe.id, meal_type: recipe.meal_type, servings_adult: 2, servings_toddler: 1 }),
    });
    setPlanItemCount(c => c + 1);
    showToast(`added "${recipe.name}" to this week`);
    loadRecipes();
  }

  async function rateRecipe(recipe, stars) {
    const res = await fetch(`/api/recipes/${recipe.id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars }),
    });
    const data = await res.json();
    setRecipes(rs => rs.map(r => r.id === recipe.id ? { ...r, star_rating: data.star_rating, rating_count: data.rating_count, in_rotation: data.in_rotation } : r));
    if (data.in_rotation === 0) showToast(`"${recipe.name}" paused — low rating, no shame`);
    else showToast(`rated "${recipe.name}" ${stars}★ · noted`);
  }

  async function toggleRotation(recipe) {
    const newState = recipe.in_rotation ? 0 : 1;
    await fetch(`/api/recipes/${recipe.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ in_rotation: newState }) });
    setRecipes(rs => rs.map(r => r.id === recipe.id ? { ...r, in_rotation: newState } : r));
    showToast(newState ? `"${recipe.name}" back in rotation` : `"${recipe.name}" benched for now`);
  }

  async function discard(recipe) {
    await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' });
    setRecipes(rs => rs.filter(r => r.id !== recipe.id));
    showToast('recipe tossed');
  }

  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))].sort();
  const displayed = recipes.filter(r => !activeTag || (r.tags || []).includes(activeTag));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 11, color: THEME.dim, fontWeight: 500,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
          }}>library</div>
          <div style={{
            fontFamily: display, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
            color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.02em',
          }}>the cookbook.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={glassBtnGhost} onClick={() => setShowPrefs(true)}>⚙ preferences</button>
          <button style={glassBtnGhost} onClick={() => setShowImport(true)}>🔗 import url</button>
          <button style={glassBtnPrimary} onClick={() => setShowGenerate(true)}>✨ generate</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', gap: 2,
          background: 'oklch(1 0 0 / 0.45)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 999, padding: 3,
          boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
        }}>
          {MEAL_TYPES.map(mt => {
            const active = filter.meal_type === mt.key && !activeCollection;
            return (
              <button key={mt.key} onClick={() => { setFilter(f => ({ ...f, meal_type: mt.key })); setActiveCollection(null); }}
                style={{
                  background: active
                    ? `linear-gradient(180deg, color-mix(in oklch, ${THEME.accent} 80%, white 20%), ${THEME.accent})`
                    : 'transparent',
                  color: active ? 'white' : THEME.dim,
                  border: 'none', borderRadius: 999,
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: active ? '0 2px 6px -2px oklch(0.42 0.10 50 / 0.5)' : 'none',
                  transition: 'background 160ms ease',
                }}
              >{mt.label}</button>
            );
          })}
        </div>

        {!activeCollection && (
          <>
            <select value={filter.sort} onChange={e => setFilter(f => ({ ...f, sort: e.target.value }))} style={{ fontSize: 13 }}>
              {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select value={filter.in_rotation} onChange={e => setFilter(f => ({ ...f, in_rotation: e.target.value }))} style={{ fontSize: 13 }}>
              <option value="">all recipes</option>
              <option value="1">in rotation</option>
              <option value="0">paused</option>
            </select>
          </>
        )}

        {collections.length > 0 && (
          <select value={activeCollection?.id || ''} onChange={e => {
            const col = collections.find(c => c.id === Number(e.target.value));
            setActiveCollection(col || null);
            setActiveTag('');
          }} style={{ fontSize: 13 }}>
            <option value="">all collections</option>
            {collections.map(c => <option key={c.id} value={c.id}>🗂 {c.name}</option>)}
          </select>
        )}

        <div style={{
          marginLeft: 'auto', fontSize: 11, color: THEME.dim,
          letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
        }}>
          <span style={{
            color: THEME.ink, fontFamily: display, fontStyle: 'italic',
            fontWeight: 500, fontSize: 18, letterSpacing: 0, textTransform: 'none', marginRight: 6,
          }}>{displayed.length}</span>
          {displayed.length !== 1 ? 'recipes' : 'recipe'}
        </div>
      </div>

      {allTags.length > 0 && !activeCollection && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
          {allTags.map(tag => {
            const active = activeTag === tag;
            return (
              <button key={tag} onClick={() => setActiveTag(t => t === tag ? '' : tag)} style={{
                background: active ? 'oklch(0.55 0.13 50 / 0.18)' : 'oklch(1 0 0 / 0.55)',
                border: 'none',
                color: active ? THEME.accent : THEME.text,
                borderRadius: 999, padding: '4px 12px',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: active
                  ? 'inset 0 1px 0 oklch(1 0 0 / 0.85), 0 0 0 0.5px oklch(0.55 0.13 50 / 0.5)'
                  : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.12)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                transition: 'background 160ms ease',
              }}>{tag}</button>
            );
          })}
        </div>
      )}

      {displayed.length === 0 ? (
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🍽️</div>
          <div style={{
            fontFamily: display, fontSize: 24, fontStyle: 'italic', fontWeight: 500,
            color: THEME.ink, marginBottom: 10,
          }}>
            {activeCollection ? `nothing in "${activeCollection.name}" yet` : activeTag ? `nothing tagged "${activeTag}"` : "the cauldron's empty"}
          </div>
          <div style={{ color: THEME.dim, marginBottom: 22, fontSize: 14, lineHeight: 1.5 }}>
            {activeCollection ? "open any recipe and use \"+ Collection\" to add it here." : "let's fill it. i'll generate a few options based on your preferences."}
          </div>
          {!activeCollection && <button style={glassBtnPrimary} onClick={() => setShowGenerate(true)}>✨ generate recipes →</button>}
        </Glass>
      ) : (
        <div className="grid-auto">
          {displayed.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selected={selected?.id === recipe.id}
              onClick={() => setSelected(recipe)}
              onAdd={() => addToPlan(recipe)}
              onDiscard={() => discard(recipe)}
              onRate={(stars) => rateRecipe(recipe, stars)}
              planItemCount={planItemCount}
            />
          ))}
        </div>
      )}

      {selected && <RecipeModal recipe={selected} onClose={() => setSelected(null)}
        onRate={(stars) => { rateRecipe(selected, stars); }}
        onToggleRotation={() => toggleRotation(selected)}
        onUpdated={(updated) => { setRecipes(rs => rs.map(r => r.id === updated.id ? updated : r)); setSelected(updated); }}
      />}
      {showGenerate && <GeneratePanel onClose={() => setShowGenerate(false)} onGenerated={(data) => { setShowGenerate(false); showToast(`${data.generated} fresh recipes in the cauldron`); loadRecipes(); }} />}
      {showPrefs && <PreferencesPanel onClose={() => setShowPrefs(false)} />}
      {showImport && <ImportURLPanel onClose={() => setShowImport(false)} onImported={() => { showToast('imported. nice find.'); loadRecipes(); }} />}
    </div>
  );
}
