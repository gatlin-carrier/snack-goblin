import { useState, useEffect } from 'react';
import CookMode from './CookMode.jsx';
import { linkifyTechniques } from '../lib/techniques.js';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const COMMON_UNITS = ['', 'g', 'kg', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'ml', 'L', 'can', 'bunch', 'piece', 'clove', 'pinch'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function inputLabel(text) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{text}</div>
  );
}

function IngredientRow({ ing, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
      <input value={ing.quantity ?? ''} onChange={e => onChange({ ...ing, quantity: e.target.value })}
        placeholder="Qty" style={{ width: 64, flexShrink: 0 }} />
      <select value={ing.unit ?? ''} onChange={e => onChange({ ...ing, unit: e.target.value })}
        style={{ width: 76, flexShrink: 0, fontSize: 12 }}>
        {COMMON_UNITS.map(u => <option key={u} value={u}>{u || '—'}</option>)}
      </select>
      <input value={ing.name ?? ''} onChange={e => onChange({ ...ing, name: e.target.value })}
        placeholder="Ingredient" style={{ flex: 1 }} />
      <button onClick={onRemove} style={{
        background: 'transparent', border: 'none', color: THEME.red,
        cursor: 'pointer', fontSize: 18, padding: '0 6px', flexShrink: 0, lineHeight: 1,
      }}>×</button>
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

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        {inputLabel('Recipe name')}
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 140 }}>
          {inputLabel('Cuisine')}
          <input value={cuisine} onChange={e => setCuisine(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          {inputLabel('Meal type')}
          <select value={mealType} onChange={e => setMealType(e.target.value)} style={{ width: '100%' }}>
            {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ width: 78 }}>
          {inputLabel('Prep min')}
          <input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} style={{ width: '100%' }} min="0" />
        </div>
        <div style={{ width: 78 }}>
          {inputLabel('Cook min')}
          <input type="number" value={cookTime} onChange={e => setCookTime(e.target.value)} style={{ width: '100%' }} min="0" />
        </div>
        <div style={{ width: 78 }}>
          {inputLabel('Servings')}
          <input type="number" value={servings} onChange={e => setServings(e.target.value)} style={{ width: '100%' }} min="1" max="20" />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {inputLabel('description')}
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          style={{ width: '100%', resize: 'vertical' }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        {inputLabel('ingredients')}
        {ingredients.map((ing, i) => (
          <IngredientRow key={i} ing={ing} onChange={v => updateIngredient(i, v)} onRemove={() => removeIngredient(i)} />
        ))}
        <button style={{ ...glassBtnGhost, fontSize: 13, marginTop: 4 }} onClick={addIngredient}>+ add ingredient</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        {inputLabel('instructions')}
        {instructions.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: THEME.accent, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 8,
              boxShadow: '0 0 0 0.5px oklch(0.35 0.10 50 / 0.5)',
            }}>{i + 1}</div>
            <textarea value={step} onChange={e => updateStep(i, e.target.value)} rows={2}
              style={{ flex: 1, resize: 'vertical' }} />
            <button onClick={() => removeStep(i)} style={{
              background: 'transparent', border: 'none', color: THEME.red,
              cursor: 'pointer', fontSize: 18, padding: '6px 4px', flexShrink: 0,
            }}>×</button>
          </div>
        ))}
        <button style={{ ...glassBtnGhost, fontSize: 13, marginTop: 4 }} onClick={addStep}>+ add step</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        {inputLabel('toddler notes')}
        <textarea value={toddlerNotes} onChange={e => setToddlerNotes(e.target.value)} rows={2}
          style={{ width: '100%', resize: 'vertical' }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        {inputLabel('batch prep tip')}
        <textarea value={batchNotes} onChange={e => setBatchNotes(e.target.value)} rows={2}
          style={{ width: '100%', resize: 'vertical' }} />
      </div>

      <div style={{ marginBottom: 24 }}>
        {inputLabel('tags (comma-separated)')}
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. high-protein, one-pan, kid-approved" style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button style={{ ...glassBtnGhost, flex: 1 }} onClick={onCancel}>cancel</button>
        <button
          style={{ ...glassBtnPrimary, flex: 2, opacity: (saving || !name.trim()) ? 0.5 : 1 }}
          onClick={submit}
          disabled={saving || !name.trim()}
        >
          {saving ? 'saving…' : 'save changes'}
        </button>
      </div>
    </>
  );
}

export default function RecipeModal({ recipe: initialRecipe, onClose, onRate, onToggleRotation, onUpdated }) {
  const [recipe, setRecipe] = useState(initialRecipe);
  const [mode, setMode] = useState('view');
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
        {mode === 'view' && recipe.image_url && (
          <div style={{
            height: 220,
            background: `linear-gradient(180deg, transparent 55%, oklch(0.20 0.02 50 / 0.55) 100%), url("${recipe.image_url}") center/cover`,
            position: 'relative',
            borderRadius: '20px 20px 0 0',
          }}>
            {recipe.image_attribution && (
              <a
                href={recipe.image_source_url || 'https://www.pexels.com'}
                target="_blank" rel="noreferrer"
                style={{
                  position: 'absolute', bottom: 10, right: 12,
                  fontSize: 10, color: 'oklch(1 0 0 / 0.85)', textDecoration: 'none',
                  background: 'oklch(0.20 0.02 50 / 0.45)',
                  padding: '3px 9px', borderRadius: 999,
                  backdropFilter: 'blur(10px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(10px) saturate(160%)',
                  letterSpacing: '0.04em',
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
            <div style={{
              fontFamily: display, fontSize: 24, fontWeight: 500, fontStyle: 'italic',
              color: THEME.ink, lineHeight: 1.15,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{recipe.name}</div>
            {mode === 'view' && (
              <div style={{ color: THEME.dim, fontSize: 12, marginTop: 4, letterSpacing: '0.04em' }}>
                {recipe.cuisine} · {(recipe.prep_time_min || 0) + (recipe.cook_time_min || 0)} min total
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {mode === 'view' && (
              <>
                <button style={{ ...glassBtnGhost, fontSize: 13, padding: '7px 14px' }} onClick={() => setMode('edit')}>edit</button>
                <button style={{ ...glassBtnPrimary, fontSize: 13, padding: '7px 16px' }} onClick={() => setCooking(true)}>🍳 cook</button>
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
              <p style={{ color: THEME.text, marginBottom: 22, fontSize: 14, lineHeight: 1.55 }}>{recipe.description}</p>

              {allCollections.length > 0 && (
                <div style={{ marginBottom: 18, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {collections.map(cid => {
                    const col = allCollections.find(c => c.id === cid);
                    return col ? <Badge key={cid} tone="accent">🗂 {col.name}</Badge> : null;
                  })}
                  <button
                    onClick={() => setShowCollectionPicker(v => !v)}
                    style={{
                      background: 'transparent',
                      border: `1px dashed ${THEME.hairline}`,
                      borderRadius: 999,
                      padding: '4px 12px', fontSize: 11, fontWeight: 600,
                      color: THEME.dim, cursor: 'pointer',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      fontFamily: 'inherit',
                    }}
                  >
                    {showCollectionPicker ? 'done' : '+ collection'}
                  </button>
                  {showCollectionPicker && (
                    <div style={{ width: '100%', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {allCollections.map(col => {
                        const inIt = collections.includes(col.id);
                        return (
                          <button key={col.id} onClick={() => toggleCollection(col.id)} style={{
                            background: inIt ? 'oklch(0.55 0.13 50 / 0.18)' : 'oklch(1 0 0 / 0.55)',
                            border: 'none',
                            color: inIt ? THEME.accent : THEME.text,
                            borderRadius: 999, padding: '4px 12px',
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                            cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                          }}>{inIt ? '✓ ' : ''}{col.name}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {recipe.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
                  {recipe.tags.map(tag => <Badge key={tag} tone="neutral">{tag}</Badge>)}
                </div>
              )}

              <div style={{ marginBottom: 22 }}>
                <SectionTitle>ingredients · serves {recipe.servings_adult} adults</SectionTitle>
                <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'disc', color: THEME.text }}>
                  {(recipe.ingredients || []).map((ing, i) => (
                    <li key={i} style={{ fontSize: 14, lineHeight: 1.45 }}>
                      <span style={{ color: THEME.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {ing.quantity} {ing.unit}
                      </span>{' '}
                      {ing.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: 22 }}>
                <SectionTitle>instructions</SectionTitle>
                <ol style={{ paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', counterReset: 'step' }}>
                  {(recipe.instructions || []).map((step, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'oklch(1 0 0 / 0.6)',
                        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.7), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.18)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: THEME.accent, flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}>{i + 1}</div>
                      <div style={{ flex: 1, fontSize: 14, lineHeight: 1.55, color: THEME.text }}>
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
                                  color: THEME.accent,
                                  textDecoration: 'underline',
                                  textDecorationStyle: 'dotted',
                                  textUnderlineOffset: 3,
                                  cursor: 'pointer',
                                }}
                              >{part.term}<span style={{ fontSize: 10, marginLeft: 2, opacity: 0.7 }}>▶</span></a>
                            )
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
                {(recipe.instructions || []).some(step => linkifyTechniques(step).some(p => typeof p !== 'string')) && (
                  <div style={{ fontSize: 11, color: THEME.faint, marginTop: 10, fontStyle: 'italic' }}>
                    Underlined terms link to a YouTube tutorial.
                  </div>
                )}
              </div>

              {recipe.toddler_notes && (
                <Glass tint="oklch(0.55 0.10 50 / 0.18)" padding={16} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: THEME.ink, fontSize: 13, letterSpacing: '0.04em' }}>
                    👶 toddler notes
                  </div>
                  <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.55 }}>{recipe.toddler_notes}</div>
                  {(recipe.choking_hazards || []).length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 700, color: 'oklch(0.55 0.13 80)', fontSize: 12, marginBottom: 4, letterSpacing: '0.04em' }}>
                        ✂ Preparation needed
                      </div>
                      {recipe.choking_hazards.map((h, i) => (
                        <div key={i} style={{ fontSize: 13, color: 'oklch(0.50 0.13 80)', lineHeight: 1.5 }}>• {h}</div>
                      ))}
                    </div>
                  )}
                </Glass>
              )}

              {recipe.batch_prep_notes && (
                <Glass tint="oklch(0.78 0.08 50 / 0.22)" padding={16} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: THEME.ink, fontSize: 13, letterSpacing: '0.04em' }}>
                    ⚡ Batch prep tip
                  </div>
                  <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.55 }}>{recipe.batch_prep_notes}</div>
                </Glass>
              )}

              <div>
                <SectionTitle>nutrition · per adult serving</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[['Calories', n.calories, 'kcal'], ['Protein', n.protein_g, 'g'], ['Fat', n.fat_g, 'g'], ['Carbs', n.carbs_g, 'g'],
                    ['Iron', n.iron_mg, 'mg'], ['Calcium', n.calcium_mg, 'mg'], ['DHA', n.dha_mg, 'mg'], ['Vit D', n.vitamin_d_iu, 'IU']
                  ].map(([label, val, unit]) => (
                    <Glass key={label} padding={10} radius={14} style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: display, fontSize: 22, fontWeight: 500, fontStyle: 'italic',
                        color: THEME.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                      }}>{val ?? '—'}</div>
                      <div style={{
                        fontSize: 10, color: THEME.dim, marginTop: 4,
                        textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
                      }}>{label}<span style={{ color: THEME.faint, fontWeight: 500 }}> {unit}</span></div>
                    </Glass>
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

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: THEME.accent,
      letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12,
    }}>{children}</div>
  );
}
