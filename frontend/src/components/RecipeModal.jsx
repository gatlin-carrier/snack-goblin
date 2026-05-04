import { useState, useEffect } from 'react';
import CookMode from './CookMode.jsx';
import { linkifyTechniques } from '../lib/techniques.js';

const COMMON_UNITS = ['', 'g', 'kg', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'ml', 'L', 'can', 'bunch', 'piece', 'clove', 'pinch'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function IngredientRow({ ing, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
      <input value={ing.quantity ?? ''} onChange={e => onChange({ ...ing, quantity: e.target.value })}
        placeholder="Qty" style={{ width: 60, flexShrink: 0 }} />
      <select value={ing.unit ?? ''} onChange={e => onChange({ ...ing, unit: e.target.value })}
        style={{ width: 70, flexShrink: 0, fontSize: 12 }}>
        {COMMON_UNITS.map(u => <option key={u} value={u}>{u || '—'}</option>)}
      </select>
      <input value={ing.name ?? ''} onChange={e => onChange({ ...ing, name: e.target.value })}
        placeholder="Ingredient" style={{ flex: 1 }} />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 }}>×</button>
    </div>
  );
}

function EditView({ recipe, onSave, onCancel, saving }) {
  const [name, setName] = useState(recipe.name || '');
  const [description, setDescription] = useState(recipe.description || '');
  const [cuisine, setCuisine] = useState(recipe.cuisine || '');
  const [mealType, setMealType] = useState(recipe.meal_type || 'dinner');
  const [prepTime, setPrepTime] = useState(recipe.prep_time_min ?? '');
  const [cookTime, setCookTime] = useState(recipe.cook_time_min ?? '');
  const [servings, setServings] = useState(recipe.servings_adult ?? 2);
  const [ingredients, setIngredients] = useState(JSON.parse(JSON.stringify(recipe.ingredients || [])));
  const [instructions, setInstructions] = useState([...(recipe.instructions || [])]);
  const [toddlerNotes, setToddlerNotes] = useState(recipe.toddler_notes || '');
  const [batchNotes, setBatchNotes] = useState(recipe.batch_prep_notes || '');
  const [tags, setTags] = useState((recipe.tags || []).join(', '));

  function updateIngredient(i, val) { setIngredients(arr => arr.map((x, j) => j === i ? val : x)); }
  function removeIngredient(i) { setIngredients(arr => arr.filter((_, j) => j !== i)); }
  function addIngredient() { setIngredients(arr => [...arr, { quantity: '', unit: '', name: '' }]); }
  function updateStep(i, val) { setInstructions(arr => arr.map((x, j) => j === i ? val : x)); }
  function removeStep(i) { setInstructions(arr => arr.filter((_, j) => j !== i)); }
  function addStep() { setInstructions(arr => [...arr, '']); }

  function submit() {
    onSave({
      name, description, cuisine, meal_type: mealType,
      prep_time_min: parseInt(prepTime, 10) || 0,
      cook_time_min: parseInt(cookTime, 10) || 0,
      servings_adult: parseInt(servings, 10) || 2,
      ingredients: ingredients.filter(i => i.name?.trim()),
      instructions: instructions.filter(s => s?.trim()),
      toddler_notes: toddlerNotes,
      batch_prep_notes: batchNotes,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
  }

  const inputLabel = (text) => (
    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{text}</div>
  );

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        {inputLabel('Recipe name')}
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 120 }}>
          {inputLabel('Cuisine')}
          <input value={cuisine} onChange={e => setCuisine(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          {inputLabel('Meal type')}
          <select value={mealType} onChange={e => setMealType(e.target.value)} style={{ width: '100%' }}>
            {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ width: 70 }}>
          {inputLabel('Prep (min)')}
          <input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} style={{ width: '100%' }} min="0" />
        </div>
        <div style={{ width: 70 }}>
          {inputLabel('Cook (min)')}
          <input type="number" value={cookTime} onChange={e => setCookTime(e.target.value)} style={{ width: '100%' }} min="0" />
        </div>
        <div style={{ width: 70 }}>
          {inputLabel('Servings')}
          <input type="number" value={servings} onChange={e => setServings(e.target.value)} style={{ width: '100%' }} min="1" max="20" />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {inputLabel('Description')}
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 14, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)' }} />
      </div>

      {/* Ingredients */}
      <div style={{ marginBottom: 16 }}>
        {inputLabel('Ingredients')}
        {ingredients.map((ing, i) => (
          <IngredientRow key={i} ing={ing} onChange={v => updateIngredient(i, v)} onRemove={() => removeIngredient(i)} />
        ))}
        <button className="btn-ghost" style={{ fontSize: 13, marginTop: 4 }} onClick={addIngredient}>+ Add ingredient</button>
      </div>

      {/* Instructions */}
      <div style={{ marginBottom: 16 }}>
        {inputLabel('Instructions')}
        {instructions.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 8 }}>{i + 1}</div>
            <textarea value={step} onChange={e => updateStep(i, e.target.value)} rows={2}
              style={{ flex: 1, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text)' }} />
            <button onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '6px 4px', flexShrink: 0 }}>×</button>
          </div>
        ))}
        <button className="btn-ghost" style={{ fontSize: 13, marginTop: 4 }} onClick={addStep}>+ Add step</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        {inputLabel('Toddler notes')}
        <textarea value={toddlerNotes} onChange={e => setToddlerNotes(e.target.value)} rows={2}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)' }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        {inputLabel('Batch prep tip')}
        <textarea value={batchNotes} onChange={e => setBatchNotes(e.target.value)} rows={2}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)' }} />
      </div>

      <div style={{ marginBottom: 24 }}>
        {inputLabel('Tags (comma-separated)')}
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. high-protein, one-pan, kid-approved" style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button className="btn-primary" style={{ flex: 2 }} onClick={submit} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </>
  );
}

export default function RecipeModal({ recipe: initialRecipe, onClose, onRate, onToggleRotation, onUpdated }) {
  const [recipe, setRecipe] = useState(initialRecipe);
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [cooking, setCooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState([]);
  const [allCollections, setAllCollections] = useState([]);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

  useEffect(() => { setRecipe(initialRecipe); }, [initialRecipe]);

  useEffect(() => {
    if (!recipe?.id) return;
    Promise.all([
      fetch(`/api/recipes/${recipe.id}/collections`).then(r => r.json()),
      fetch('/api/collections').then(r => r.json()),
    ]).then(([memberOf, all]) => {
      setCollections(memberOf);
      setAllCollections(all);
    }).catch(() => {});
  }, [recipe?.id]);

  async function save(updates) {
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      if (res.ok) {
        setRecipe(updated);
        setMode('view');
        onUpdated?.(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleCollection(colId) {
    const inCol = collections.includes(colId);
    if (inCol) {
      await fetch(`/api/collections/${colId}/recipes/${recipe.id}`, { method: 'DELETE' });
      setCollections(c => c.filter(id => id !== colId));
    } else {
      await fetch(`/api/collections/${colId}/recipes/${recipe.id}`, { method: 'POST' });
      setCollections(c => [...c, colId]);
    }
  }

  if (!recipe) return null;
  const n = recipe.nutrition || {};

  if (cooking) return <CookMode recipe={recipe} onClose={() => setCooking(false)} />;

  return (
    <div className="modal-backdrop" onClick={mode === 'view' ? onClose : undefined}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Hero image — only in view mode and only when image is present */}
        {mode === 'view' && recipe.image_url && (
          <div style={{
            height: 200,
            background: `linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.55) 100%), url("${recipe.image_url}") center/cover`,
            position: 'relative',
            borderRadius: '20px 20px 0 0',
          }}>
            {recipe.image_attribution && (
              <a
                href={recipe.image_source_url || 'https://www.pexels.com'}
                target="_blank" rel="noreferrer"
                style={{
                  position: 'absolute', bottom: 8, right: 12,
                  fontSize: 10, color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
                  background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: 12,
                  backdropFilter: 'blur(6px)',
                }}
                onClick={e => e.stopPropagation()}
                title="Photo on Pexels"
              >
                📷 {recipe.image_attribution} · Pexels
              </a>
            )}
          </div>
        )}
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recipe.name}</div>
            {mode === 'view' && (
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
                {recipe.cuisine} · {(recipe.prep_time_min || 0) + (recipe.cook_time_min || 0)} min total
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {mode === 'view' && (
              <>
                <button className="btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => setMode('edit')}>✏️ Edit</button>
                <button className="btn-primary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setCooking(true)}>🍳 Cook</button>
              </>
            )}
            {mode === 'view' && <button className="modal-close" onClick={onClose}>×</button>}
          </div>
        </div>

        <div className="modal-body">
          {mode === 'edit' ? (
            <EditView recipe={recipe} onSave={save} onCancel={() => setMode('view')} saving={saving} />
          ) : (
            <>
              <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>{recipe.description}</p>

              {/* Collections */}
              {allCollections.length > 0 && (
                <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {collections.map(cid => {
                    const col = allCollections.find(c => c.id === cid);
                    return col ? (
                      <span key={cid} style={{ background: 'rgba(124,111,247,0.15)', color: 'var(--accent)', border: '1px solid rgba(124,111,247,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
                        🗂 {col.name}
                      </span>
                    ) : null;
                  })}
                  <button onClick={() => setShowCollectionPicker(v => !v)}
                    style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }}>
                    {showCollectionPicker ? 'Done' : '+ Collection'}
                  </button>
                  {showCollectionPicker && (
                    <div style={{ width: '100%', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {allCollections.map(col => (
                        <button key={col.id} onClick={() => toggleCollection(col.id)} style={{
                          background: collections.includes(col.id) ? 'rgba(124,111,247,0.2)' : 'var(--surface2)',
                          border: `1px solid ${collections.includes(col.id) ? 'var(--accent)' : 'var(--border)'}`,
                          color: collections.includes(col.id) ? 'var(--accent)' : 'var(--text-dim)',
                          borderRadius: 20, padding: '3px 12px', fontSize: 12, cursor: 'pointer',
                        }}>{collections.includes(col.id) ? '✓ ' : ''}{col.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {recipe.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                  {recipe.tags.map(tag => (
                    <span key={tag} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: 'var(--text-dim)' }}>{tag}</span>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div className="section-title">Ingredients (serves {recipe.servings_adult} adults)</div>
                <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(recipe.ingredients || []).map((ing, i) => (
                    <li key={i} style={{ fontSize: 14 }}>{ing.quantity} {ing.unit} {ing.name}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div className="section-title">Instructions</div>
                <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(recipe.instructions || []).map((step, i) => (
                    <li key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>
                      {linkifyTechniques(step).map((part, j) => (
                        typeof part === 'string'
                          ? <span key={j}>{part}</span>
                          : (
                            <a
                              key={j}
                              href={part.url}
                              target="_blank"
                              rel="noreferrer"
                              title={`Watch a tutorial: ${part.term}`}
                              style={{
                                color: 'var(--accent)',
                                textDecoration: 'underline',
                                textDecorationStyle: 'dotted',
                                textUnderlineOffset: 2,
                                cursor: 'pointer',
                              }}
                            >{part.term}<span style={{ fontSize: 10, marginLeft: 2, opacity: 0.7 }}>▶</span></a>
                          )
                      ))}
                    </li>
                  ))}
                </ol>
                {(recipe.instructions || []).some(step => linkifyTechniques(step).some(p => typeof p !== 'string')) && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic' }}>
                    💡 Underlined terms link to a YouTube tutorial.
                  </div>
                )}
              </div>

              {recipe.toddler_notes && (
                <div className="card" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>👶 Toddler notes</div>
                  <div style={{ fontSize: 13 }}>{recipe.toddler_notes}</div>
                  {(recipe.choking_hazards || []).length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 600, color: 'var(--yellow)', fontSize: 13, marginBottom: 4 }}>✂️ Preparation needed:</div>
                      {recipe.choking_hazards.map((h, i) => <div key={i} style={{ fontSize: 13, color: 'var(--yellow)' }}>• {h}</div>)}
                    </div>
                  )}
                </div>
              )}

              {recipe.batch_prep_notes && (
                <div className="card" style={{ background: 'rgba(124,111,247,0.05)', border: '1px solid rgba(124,111,247,0.2)', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>⚡ Batch Prep Tip</div>
                  <div style={{ fontSize: 13 }}>{recipe.batch_prep_notes}</div>
                </div>
              )}

              <div>
                <div className="section-title">Nutrition (per adult serving)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[['Calories', n.calories, 'kcal'], ['Protein', n.protein_g, 'g'], ['Fat', n.fat_g, 'g'], ['Carbs', n.carbs_g, 'g'],
                    ['Iron', n.iron_mg, 'mg'], ['Calcium', n.calcium_mg, 'mg'], ['DHA', n.dha_mg, 'mg'], ['Vit D', n.vitamin_d_iu, 'IU']
                  ].map(([label, val, unit]) => (
                    <div key={label} style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '10px 8px' }}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{val ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label} {unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
