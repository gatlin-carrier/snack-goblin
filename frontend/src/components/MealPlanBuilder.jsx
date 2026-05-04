import { useState, useEffect } from 'react';
import RecipeModal from './RecipeModal.jsx';
import PrepGuide from './PrepGuide.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅', color: '#f59e0b' },
  { key: 'lunch', label: 'Lunch', icon: '☀️', color: '#10b981' },
  { key: 'dinner', label: 'Dinner', icon: '🌙', color: '#7c6ff7' },
  { key: 'snack', label: 'Snack', icon: '🍎', color: '#ec4899' },
];

export default function MealPlanBuilder({ currentPlan, setCurrentPlan, onNavigate, showToast }) {
  const [plan, setPlan] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(window.innerWidth <= 600 ? 'carousel' : 'grid');
  const todayDow = new Date().getDay();
  const [showPrepGuide, setShowPrepGuide] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Auto-curate state
  const [strategy, setStrategy] = useState('overlap');
  const [planDays, setPlanDays] = useState(5);
  const [curating, setCurating] = useState(false);

  // Swap state — id of the primary item we're picking a swap target for
  const [swapFromId, setSwapFromId] = useState(null);

  // Cost rollup
  const [cost, setCost] = useState(null);

  useEffect(() => { loadPlan(); }, []);
  useEffect(() => {
    if (showTemplates) fetch('/api/plan-templates').then(r => r.json()).then(setTemplates).catch(() => {});
  }, [showTemplates]);

  async function loadPlan() {
    setLoading(true);
    try {
      const res = await fetch('/api/meal-plans/current');
      const data = await res.json();
      setPlan(data);
      setCurrentPlan(data);
      // Fetch cost rollup
      fetch(`/api/meal-plans/${data.id}/cost`).then(r => r.json()).then(setCost).catch(() => setCost(null));
    } finally {
      setLoading(false);
    }
  }

  async function autoCurate() {
    if (!plan?.id) return;
    setCurating(true);
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/auto-curate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, days: planDays, alternates: 8 }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Auto-curate failed'); return; }
      showToast(`Picked ${data.picked} meals · ${data.alternates} alternates`);
      await loadPlan();
    } finally { setCurating(false); }
  }

  async function removeItem(item) {
    await fetch(`/api/meal-plans/${plan.id}/items/${item.id}`, { method: 'DELETE' });
    showToast(`Removed "${item.name}"`);
    loadPlan();
  }

  async function assignSlot(item, day, mealType) {
    await fetch(`/api/meal-plans/${plan.id}/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_of_week: day, meal_type: mealType, servings_adult: item.servings_adult, servings_toddler: item.servings_toddler }),
    });
    loadPlan();
  }

  async function swapWith(primaryId, alternateId) {
    await fetch(`/api/meal-plans/${plan.id}/items/${primaryId}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alternate_id: alternateId }),
    });
    setSwapFromId(null);
    showToast('Swapped');
    loadPlan();
  }

  async function generateShoppingList() {
    if (!plan?.items?.length) { showToast('Add some meals first'); return; }
    const res = await fetch('/api/shopping-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meal_plan_id: plan.id }) });
    const data = await res.json();
    if (data.id) { showToast('Shopping list generated!'); onNavigate('shopping'); }
  }

  if (loading) return <div className="page"><div style={{ color: 'var(--text-dim)', display: 'flex', gap: 10 }}><div className="spinner" /> Loading…</div></div>;

  const allItems = plan?.items || [];
  const primaries = allItems.filter(i => !i.is_alternate);
  const alternates = allItems.filter(i => i.is_alternate);

  // Build grid: [day][meal_type] = primary item
  const grid = {};
  const unscheduled = [];
  for (const item of primaries) {
    if (item.day_of_week != null && item.meal_type) {
      if (!grid[item.day_of_week]) grid[item.day_of_week] = {};
      grid[item.day_of_week][item.meal_type] = item;
    } else {
      unscheduled.push(item);
    }
  }

  // Batch prep hints — only count primary items (alternates aren't being cooked)
  const ingMap = {};
  for (const item of primaries) {
    for (const ing of (item.ingredients || [])) {
      const k = ing.name.toLowerCase();
      if (!ingMap[k]) ingMap[k] = [];
      if (!ingMap[k].includes(item.name)) ingMap[k].push(item.name);
    }
  }
  const shared = Object.entries(ingMap).filter(([, m]) => m.length > 1).slice(0, 5);

  const filledSlots = Object.values(grid).reduce((a, day) => a + Object.keys(day).length, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Meal Plan</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 2 }}>
            {filledSlots} of 28 slots filled
            {alternates.length > 0 && ` · ${alternates.length} alternates ready to swap`}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn-ghost" onClick={() => setView(v => v === 'grid' ? 'list' : v === 'list' ? 'carousel' : 'grid')} style={{ fontSize: 13 }}>
            {view === 'grid' ? '☰ List' : view === 'list' ? '🎴 Carousel' : '⊞ Grid'}
          </button>
          <button className="btn-ghost" onClick={() => onNavigate('recipes')}>+ Browse</button>
          <button className="btn-ghost" onClick={() => setShowTemplates(true)}>📋 Templates</button>
          <button className="btn-ghost" onClick={() => setShowPrepGuide(true)} disabled={!primaries.length}>⚡ Prep Guide</button>
          <button className="btn-primary" onClick={generateShoppingList} disabled={!primaries.length}>🛒 Shopping List</button>
        </div>
      </div>

      {/* Auto-curate panel */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Auto-curate week</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Strategy:</span>
          <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
            <button
              onClick={() => setStrategy('overlap')}
              title="Maximize shared ingredients across the week — minimizes shopping cost"
              style={{
                background: strategy === 'overlap' ? 'var(--accent)' : 'transparent',
                color: strategy === 'overlap' ? 'white' : 'var(--text-dim)',
                border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >Overlap</button>
            <button
              onClick={() => setStrategy('top-rated')}
              title="Pick highest-rated recipes regardless of ingredient overlap"
              style={{
                background: strategy === 'top-rated' ? 'var(--accent)' : 'transparent',
                color: strategy === 'top-rated' ? 'white' : 'var(--text-dim)',
                border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >Top Rated</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Days:</span>
          <select value={planDays} onChange={e => setPlanDays(Number(e.target.value))} style={{ fontSize: 13, padding: '5px 8px' }}>
            {[3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <button className="btn-primary" onClick={autoCurate} disabled={curating} style={{ fontSize: 13, padding: '8px 16px' }}>
          {curating ? '…' : primaries.length ? 'Re-curate' : 'Auto-fill week'}
        </button>

        {cost && cost.total_usd > 0 && (
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-dim)' }}>
            Est. weekly cost:{' '}
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>${cost.total_usd.toFixed(0)}</span>
            {cost.meals_with_cost_data < cost.meals && (
              <span style={{ fontSize: 11, marginLeft: 4 }}> ({cost.meals_with_cost_data}/{cost.meals} priced)</span>
            )}
          </div>
        )}
      </div>

      {/* Unscheduled pool */}
      {unscheduled.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-title">Unscheduled — drag to a slot</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {unscheduled.map(item => (
              <div
                key={item.id}
                className="card"
                draggable
                onDragStart={() => setDragging(item)}
                onDragEnd={() => setDragging(null)}
                style={{ cursor: 'grab', padding: '10px 14px', minWidth: 160, opacity: dragging?.id === item.id ? 0.5 : 1 }}
              >
                <div style={{ fontSize: 12, color: item.meal_type === 'breakfast' ? '#f59e0b' : item.meal_type === 'lunch' ? '#10b981' : item.meal_type === 'snack' ? '#ec4899' : 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>
                  {MEAL_SLOTS.find(s => s.key === item.meal_type)?.icon} {item.meal_type}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setSelected(item)}>View</button>
                  <button className="btn-danger" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => removeItem(item)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'carousel' ? (
        <div className="meal-carousel">
          {DAYS.map((dayLabel, dayIdx) => {
            const isToday = dayIdx === todayDow;
            const daysMeals = grid[dayIdx] || {};
            const mealCount = Object.keys(daysMeals).length;
            const heroMeal = daysMeals.dinner || daysMeals.lunch || daysMeals.breakfast || daysMeals.snack;
            const heroImage = heroMeal?.image_url;
            return (
              <div key={dayIdx} className={`meal-day-card${isToday ? ' today' : ''}`} style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  height: isToday ? 130 : 80,
                  background: heroImage
                    ? `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%), url("${heroImage}") center/cover`
                    : 'linear-gradient(135deg, rgba(124,111,247,0.25), rgba(255,255,255,0.04))',
                  display: 'flex', alignItems: 'flex-end', padding: '10px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ fontWeight: 700, fontSize: isToday ? 20 : 16, color: heroImage ? 'white' : 'var(--text)', textShadow: heroImage ? '0 1px 4px rgba(0,0,0,0.6)' : 'none' }}>{dayLabel}</div>
                    {isToday && <div style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'rgba(124,111,247,0.85)', padding: '3px 8px', borderRadius: 20, letterSpacing: '0.06em', backdropFilter: 'blur(6px)' }}>TODAY</div>}
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                {mealCount === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '12px 0' }}>
                    Nothing planned. Use Auto-curate or drag from Unscheduled.
                  </div>
                )}
                {MEAL_SLOTS.map(slot => {
                  const meal = daysMeals[slot.key];
                  if (!meal && !isToday) return null; // hide empty slots on non-today days
                  return (
                    <div key={slot.key} style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: slot.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {slot.icon} {slot.label}
                      </div>
                      {meal ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: isToday ? 15 : 13, lineHeight: 1.3, marginBottom: 4 }}>{meal.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: isToday ? 8 : 0 }}>
                            <span>🌍 {meal.cuisine}</span>
                            <span>⏱ {(meal.prep_time_min || 0) + (meal.cook_time_min || 0)} min</span>
                            {meal.cost_per_serving != null && <span style={{ color: 'var(--green)', fontWeight: 600 }}>≈${meal.cost_per_serving.toFixed(0)}/serving</span>}
                          </div>
                          {isToday && meal.description && (
                            <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 10 }}>{meal.description}</div>
                          )}
                          {isToday && meal.ingredients?.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                Ingredients ({meal.ingredients.length})
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {meal.ingredients.slice(0, 6).map((ing, i) => (
                                  <span key={i} className="tag">{ing.name}</span>
                                ))}
                                {meal.ingredients.length > 6 && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>+{meal.ingredients.length - 6} more</span>}
                              </div>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setSelected(meal)}>👁 View</button>
                            {alternates.length > 0 && (
                              <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setSwapFromId(swapFromId === meal.id ? null : meal.id)}>🔄 Swap</button>
                            )}
                            <button className="btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => removeItem(meal)}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic', padding: '6px 0' }}>— empty —</div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            );
          })}
        </div>
      ) : view === 'grid' ? (
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ width: 80, padding: '8px 10px', textAlign: 'left', fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Meal</th>
                {DAYS.map(d => (
                  <th key={d} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_SLOTS.map(slot => (
                <tr key={slot.key}>
                  <td style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, color: slot.color, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {slot.icon} {slot.label}
                  </td>
                  {DAYS.map((day, dayIdx) => {
                    const cell = grid[dayIdx]?.[slot.key];
                    const isTarget = dragTarget?.day === dayIdx && dragTarget?.meal === slot.key;
                    return (
                      <td
                        key={dayIdx}
                        style={{ padding: 4, verticalAlign: 'top', borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}
                        onDragOver={e => { e.preventDefault(); setDragTarget({ day: dayIdx, meal: slot.key }); }}
                        onDragLeave={() => setDragTarget(null)}
                        onDrop={async e => {
                          e.preventDefault();
                          setDragTarget(null);
                          if (dragging) { await assignSlot(dragging, dayIdx, slot.key); setDragging(null); }
                        }}
                      >
                        <div style={{ minHeight: 64, background: isTarget ? 'rgba(124,111,247,0.1)' : cell ? 'var(--surface2)' : 'transparent', borderRadius: 6, border: isTarget ? '1px dashed var(--accent)' : '1px dashed transparent', padding: cell ? 6 : 0, transition: 'background 0.1s' }}>
                          {cell ? (
                            <div
                              draggable
                              onDragStart={() => setDragging(cell)}
                              onDragEnd={() => setDragging(null)}
                              style={{ cursor: 'grab', opacity: dragging?.id === cell.id ? 0.4 : 1 }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>{cell.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{cell.cuisine}</div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 11, padding: 0 }} onClick={() => setSelected(cell)}>👁</button>
                                {alternates.length > 0 && (
                                  <button
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                                    onClick={() => setSwapFromId(swapFromId === cell.id ? null : cell.id)}
                                    title="Swap from alternates"
                                  >🔄</button>
                                )}
                                <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11, padding: 0 }} onClick={() => removeItem(cell)}>✕</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--border)', fontSize: 18 }}>+</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {primaries.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>No meals planned yet</div>
          ) : (
            primaries.map(item => (
              <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                <div style={{ fontSize: 20 }}>{MEAL_SLOTS.find(s => s.key === item.meal_type)?.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {item.meal_type} · {item.cuisine}
                    {item.day_of_week != null ? ` · ${DAYS[item.day_of_week]}` : ' · Unscheduled'}
                    {item.cost_per_serving != null && ` · ≈$${item.cost_per_serving.toFixed(0)}/serving`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {alternates.length > 0 && (
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setSwapFromId(swapFromId === item.id ? null : item.id)}>🔄 Swap</button>
                  )}
                  <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setSelected(item)}>View</button>
                  <button className="btn-danger" style={{ fontSize: 12 }} onClick={() => removeItem(item)}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Swap picker — appears when swapFromId is set */}
      {swapFromId && alternates.length > 0 && (() => {
        const target = primaries.find(p => p.id === swapFromId);
        return (
          <div className="card" style={{ marginBottom: 20, background: 'rgba(124,111,247,0.06)', borderColor: 'rgba(124,111,247,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>
                🔄 Swap "{target?.name}" with…
              </div>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setSwapFromId(null)}>Cancel</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {alternates.map(alt => (
                <button
                  key={alt.id}
                  onClick={() => swapWith(swapFromId, alt.id)}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px',
                    textAlign: 'left', cursor: 'pointer', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{alt.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {alt.cuisine}
                    {alt.cost_per_serving != null && ` · ≈$${alt.cost_per_serving.toFixed(0)}/serving`}
                    {alt.star_rating > 0 && ` · ★${alt.star_rating.toFixed(1)}`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Alternates pool — shown when not actively swapping */}
      {alternates.length > 0 && !swapFromId && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">🔁 Alternates ({alternates.length}) — click 🔄 on any day to swap one in</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {alternates.map(alt => (
              <div key={alt.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{alt.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {alt.cuisine}
                  {alt.cost_per_serving != null && ` · ≈$${alt.cost_per_serving.toFixed(0)}`}
                  {alt.star_rating > 0 && ` · ★${alt.star_rating.toFixed(1)}`}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setSelected(alt)}>View</button>
                  <button className="btn-danger" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => removeItem(alt)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {primaries.length === 0 && !unscheduled.length && (
        <div className="card" style={{ textAlign: 'center', padding: 48, marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Nothing planned yet</div>
          <div style={{ color: 'var(--text-dim)', marginBottom: 20 }}>
            Use Auto-curate above to fill the week from your recipes, or browse and add manually.
          </div>
          <button className="btn-primary" onClick={() => onNavigate('recipes')}>Browse Recipes</button>
        </div>
      )}

      {/* Batch prep hints */}
      {shared.length > 0 && (
        <div className="card" style={{ background: 'rgba(124,111,247,0.05)', borderColor: 'rgba(124,111,247,0.2)' }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>⚡ Batch Prep Opportunities</div>
          {shared.map(([ing, meals]) => (
            <div key={ing} style={{ fontSize: 13, marginBottom: 4 }}>
              <span style={{ fontWeight: 500 }}>{ing.charAt(0).toUpperCase() + ing.slice(1)}</span>
              <span style={{ color: 'var(--text-dim)' }}> — {meals.join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      {selected && <RecipeModal recipe={selected} onClose={() => setSelected(null)} />}
      {showPrepGuide && plan?.id && <PrepGuide planId={plan.id} onClose={() => setShowPrepGuide(false)} />}

      {showTemplates && (
        <div className="modal-backdrop" onClick={() => setShowTemplates(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 700, fontSize: 18 }}>📋 Plan Templates</div>
              <button className="modal-close" onClick={() => setShowTemplates(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
                Save the current week as a reusable template, or load a past week's plan to kick off this week.
              </div>

              {primaries.length > 0 && (
                <div style={{ marginBottom: 20, background: 'var(--surface2)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Save current plan ({primaries.length} meals)</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !savingTemplate && newTemplateName.trim() && (async () => {
                        setSavingTemplate(true);
                        await fetch('/api/plan-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newTemplateName.trim(), plan_id: plan.id }) });
                        setNewTemplateName('');
                        const t = await fetch('/api/plan-templates').then(r => r.json());
                        setTemplates(t);
                        showToast('Template saved');
                        setSavingTemplate(false);
                      })()}
                      placeholder="Template name…" style={{ flex: 1 }} />
                    <button className="btn-primary" disabled={!newTemplateName.trim() || savingTemplate}
                      onClick={async () => {
                        setSavingTemplate(true);
                        await fetch('/api/plan-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newTemplateName.trim(), plan_id: plan.id }) });
                        setNewTemplateName('');
                        const t = await fetch('/api/plan-templates').then(r => r.json());
                        setTemplates(t);
                        showToast('Template saved');
                        setSavingTemplate(false);
                      }}>
                      {savingTemplate ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: 14 }}>
                  No templates yet. Save a plan you like to reuse it next week.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {templates.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{t.meal_count} meals</div>
                      </div>
                      <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={async () => {
                          const res = await fetch(`/api/meal-plans/from-template/${t.id}`, { method: 'POST' });
                          if (res.ok) { showToast(`Loaded "${t.name}"`); setShowTemplates(false); loadPlan(); }
                          else showToast('Failed to load template');
                        }}>
                        Load →
                      </button>
                      <button onClick={async () => {
                        await fetch(`/api/plan-templates/${t.id}`, { method: 'DELETE' });
                        setTemplates(ts => ts.filter(x => x.id !== t.id));
                        showToast(`Deleted "${t.name}"`);
                      }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
