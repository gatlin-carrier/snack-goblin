import { useState, useEffect } from 'react';
import RecipeCard from './RecipeCard.jsx';
import RecipeModal from './RecipeModal.jsx';
import GeneratePanel from './GeneratePanel.jsx';
import PreferencesPanel from './PreferencesPanel.jsx';
import ImportURLPanel from './ImportURLPanel.jsx';

const MEAL_TYPES = [
  { key: '', label: 'All' },
  { key: 'breakfast', label: '🌅 Breakfast' },
  { key: 'lunch', label: '☀️ Lunch' },
  { key: 'dinner', label: '🌙 Dinner' },
  { key: 'snack', label: '🍎 Snacks' },
];

const SORT_OPTIONS = [
  { key: 'created_at', label: 'Newest' },
  { key: 'recommended', label: '⭐ Recommended' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'cost', label: '💰 Cheapest' },
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
  }, [filter]);

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
    setRecipes(await res.json());
  }

  async function addToPlan(recipe) {
    if (!currentPlan?.id) { showToast('No active plan — go to Meal Plan tab'); return; }
    await fetch(`/api/meal-plans/${currentPlan.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipe.id, meal_type: recipe.meal_type, servings_adult: 2, servings_toddler: 1 }),
    });
    setPlanItemCount(c => c + 1);
    showToast(`Added "${recipe.name}" to this week`);
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
    if (data.in_rotation === 0) showToast(`"${recipe.name}" paused from rotation (low rating)`);
    else showToast(`Rated "${recipe.name}" ${stars}★`);
  }

  async function toggleRotation(recipe) {
    const newState = recipe.in_rotation ? 0 : 1;
    await fetch(`/api/recipes/${recipe.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ in_rotation: newState }) });
    setRecipes(rs => rs.map(r => r.id === recipe.id ? { ...r, in_rotation: newState } : r));
    showToast(newState ? `"${recipe.name}" back in rotation` : `"${recipe.name}" paused`);
  }

  async function discard(recipe) {
    await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' });
    setRecipes(rs => rs.filter(r => r.id !== recipe.id));
    showToast('Recipe deleted');
  }

  const cuisines = [...new Set(recipes.map(r => r.cuisine).filter(Boolean))].sort();
  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))].sort();
  const displayed = recipes
    .filter(r => !activeTag || (r.tags || []).includes(activeTag))
    .filter(r => !activeCollection || true); // collection filtering done server-side via loadRecipes

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Recipes</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={() => setShowPrefs(true)}>⚙️ Preferences</button>
          <button className="btn-ghost" onClick={() => setShowImport(true)}>🔗 Import URL</button>
          <button className="btn-primary" onClick={() => setShowGenerate(true)}>✨ Generate</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Meal type tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}>
          {MEAL_TYPES.map(mt => (
            <button key={mt.key} onClick={() => { setFilter(f => ({ ...f, meal_type: mt.key })); setActiveCollection(null); }}
              style={{ background: filter.meal_type === mt.key && !activeCollection ? 'var(--accent)' : 'transparent', color: filter.meal_type === mt.key && !activeCollection ? 'white' : 'var(--text-dim)', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >{mt.label}</button>
          ))}
        </div>

        {!activeCollection && (
          <>
            <select value={filter.sort} onChange={e => setFilter(f => ({ ...f, sort: e.target.value }))} style={{ fontSize: 13 }}>
              {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select value={filter.in_rotation} onChange={e => setFilter(f => ({ ...f, in_rotation: e.target.value }))} style={{ fontSize: 13 }}>
              <option value="">All recipes</option>
              <option value="1">In rotation</option>
              <option value="0">Paused</option>
            </select>
          </>
        )}

        {/* Collection filter */}
        {collections.length > 0 && (
          <select value={activeCollection?.id || ''} onChange={e => {
            const col = collections.find(c => c.id === Number(e.target.value));
            setActiveCollection(col || null);
            setActiveTag('');
          }} style={{ fontSize: 13 }}>
            <option value="">All collections</option>
            {collections.map(c => <option key={c.id} value={c.id}>🗂 {c.name}</option>)}
          </select>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-dim)' }}>
          {displayed.length} recipe{displayed.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && !activeCollection && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setActiveTag(t => t === tag ? '' : tag)} style={{
              background: activeTag === tag ? 'rgba(124,111,247,0.2)' : 'var(--surface2)',
              border: `1px solid ${activeTag === tag ? 'var(--accent)' : 'var(--border)'}`,
              color: activeTag === tag ? 'var(--accent)' : 'var(--text-dim)',
              borderRadius: 20, padding: '3px 10px', fontSize: 12, cursor: 'pointer',
            }}>{tag}</button>
          ))}
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🍽️</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {activeCollection ? `No recipes in "${activeCollection.name}"` : activeTag ? `No recipes tagged "${activeTag}"` : 'No recipes yet'}
          </div>
          <div style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
            {activeCollection ? 'Open any recipe and use "+ Collection" to add it here.' : 'Generate meal options with Claude AI to get started.'}
          </div>
          {!activeCollection && <button className="btn-primary" onClick={() => setShowGenerate(true)}>✨ Generate Recipes</button>}
        </div>
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
      {showGenerate && <GeneratePanel onClose={() => setShowGenerate(false)} onGenerated={(data) => { setShowGenerate(false); showToast(`Generated ${data.generated} recipes`); loadRecipes(); }} />}
      {showPrefs && <PreferencesPanel onClose={() => setShowPrefs(false)} />}
      {showImport && <ImportURLPanel onClose={() => setShowImport(false)} onImported={() => { showToast('Recipe imported!'); loadRecipes(); }} />}
    </div>
  );
}
