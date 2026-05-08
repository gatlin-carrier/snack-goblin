import { useState, useEffect } from 'react';
import RecipeModal from './RecipeModal.jsx';
import PrepGuide from './PrepGuide.jsx';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', tone: 'yellow', accent: 'oklch(0.55 0.12 80)' },
  { key: 'lunch',     label: 'Lunch',     tone: 'sage',   accent: THEME.sage },
  { key: 'dinner',    label: 'Dinner',    tone: 'accent', accent: THEME.accent },
  { key: 'snack',     label: 'Snack',     tone: 'rust',   accent: THEME.rust },
];
const SLOT_BY_KEY = Object.fromEntries(MEAL_SLOTS.map(s => [s.key, s]));

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: THEME.accent,
      letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12,
    }}>{children}</div>
  );
}

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

  const [strategy, setStrategy] = useState('overlap');
  const [planDays, setPlanDays] = useState(5);
  const [curating, setCurating] = useState(false);

  const [swapFromId, setSwapFromId] = useState(null);

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
      showToast(`picked ${data.picked} meals · ${data.alternates} alternates ready to swap`);
      await loadPlan();
    } finally { setCurating(false); }
  }

  async function removeItem(item) {
    await fetch(`/api/meal-plans/${plan.id}/items/${item.id}`, { method: 'DELETE' });
    showToast(`tossed "${item.name}"`);
    loadPlan();
  }

  async function forgiveItem(item) {
    await fetch(`/api/meal-plans/${plan.id}/items/${item.id}/forgive`, { method: 'POST' });
    showToast(`forgiven. no shame, moving on.`);
    loadPlan();
  }

  async function unforgiveItem(item) {
    await fetch(`/api/meal-plans/${plan.id}/items/${item.id}/unforgive`, { method: 'POST' });
    showToast(`back on the menu`);
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
    showToast('swapped. nice trade.');
    loadPlan();
  }

  async function generateShoppingList() {
    if (!plan?.items?.length) { showToast('plan some meals first, then i can shop for them'); return; }
    const res = await fetch('/api/shopping-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meal_plan_id: plan.id }) });
    const data = await res.json();
    if (data.id) { showToast("list ready. let's forage."); onNavigate('shopping'); }
  }

  async function saveTemplate() {
    if (!newTemplateName.trim() || savingTemplate) return;
    setSavingTemplate(true);
    await fetch('/api/plan-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newTemplateName.trim(), plan_id: plan.id }) });
    setNewTemplateName('');
    const t = await fetch('/api/plan-templates').then(r => r.json());
    setTemplates(t);
    showToast('saved. reach for it next week.');
    setSavingTemplate(false);
  }

  if (loading) return (
    <div className="page">
      <div style={{ color: THEME.dim, display: 'flex', gap: 10 }}><div className="spinner" /> Loading…</div>
    </div>
  );

  const allItems = plan?.items || [];
  const primaries = allItems.filter(i => !i.is_alternate);
  const alternates = allItems.filter(i => i.is_alternate);

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
          <div style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 11, color: THEME.dim, fontWeight: 500,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
          }}>this week</div>
          <div style={{
            fontFamily: display, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
            color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.02em',
          }}>plan, with the pots in mind.</div>
          <div style={{ color: THEME.dim, fontSize: 13, marginTop: 6 }}>
            {filledSlots} of 28 slots filled
            {alternates.length > 0 && ` · ${alternates.length} alternates ready to swap`}
          </div>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={{ ...glassBtnGhost, fontSize: 13 }} onClick={() => setView(v => v === 'grid' ? 'list' : v === 'list' ? 'carousel' : 'grid')}>
            {view === 'grid' ? '☰ list' : view === 'list' ? '🎴 carousel' : '⊞ grid'}
          </button>
          <button style={glassBtnGhost} onClick={() => onNavigate('recipes')}>+ browse</button>
          <button style={glassBtnGhost} onClick={() => setShowTemplates(true)}>📋 templates</button>
          <button style={{ ...glassBtnGhost, opacity: !primaries.length ? 0.5 : 1 }} onClick={() => setShowPrepGuide(true)} disabled={!primaries.length}>⚡ prep guide</button>
          <button style={{ ...glassBtnPrimary, opacity: !primaries.length ? 0.5 : 1 }} onClick={generateShoppingList} disabled={!primaries.length}>generate shopping →</button>
        </div>
      </div>

      {/* Auto-curate panel */}
      <Glass padding={16} style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <span style={{ fontFamily: display, fontStyle: 'italic', fontSize: 16, color: THEME.ink }}>auto-curate the week</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 10, color: THEME.dim, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>strategy</span>
          <div style={{
            display: 'flex',
            background: 'oklch(1 0 0 / 0.45)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 999, padding: 3,
            boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
          }}>
            {[
              { key: 'overlap',   label: 'overlap',   title: 'maximize shared ingredients — cheapest shopping' },
              { key: 'top-rated', label: 'top-rated', title: 'pick highest-rated recipes regardless of overlap' },
              { key: 'novelty',   label: '✨ novelty', title: 'adhd mode — minimize shared ingredients, every day feels new' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setStrategy(s.key)}
                title={s.title}
                style={{
                  background: strategy === s.key
                    ? `linear-gradient(180deg, color-mix(in oklch, ${THEME.accent} 80%, white 20%), ${THEME.accent})`
                    : 'transparent',
                  color: strategy === s.key ? 'white' : THEME.dim,
                  border: 'none', borderRadius: 999, padding: '5px 14px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: strategy === s.key ? '0 2px 6px -2px oklch(0.42 0.10 50 / 0.5)' : 'none',
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 10, color: THEME.dim, fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>days</span>
          <select value={planDays} onChange={e => setPlanDays(Number(e.target.value))} style={{ fontSize: 13, padding: '6px 10px', width: 64 }}>
            {[3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <button style={{ ...glassBtnPrimary, fontSize: 13 }} onClick={autoCurate} disabled={curating}>
          {curating ? '…' : primaries.length ? 're-curate' : 'auto-fill week'}
        </button>

        {cost && cost.total_usd > 0 && (
          <div style={{ marginLeft: 'auto', fontSize: 12, color: THEME.dim }}>
            est. weekly cost{' '}
            <span style={{ color: THEME.sage, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>${cost.total_usd.toFixed(0)}</span>
            {cost.meals_with_cost_data < cost.meals && (
              <span style={{ fontSize: 11, marginLeft: 4, color: THEME.faint }}> ({cost.meals_with_cost_data}/{cost.meals} priced)</span>
            )}
          </div>
        )}
      </Glass>

      {/* Unscheduled pool */}
      {unscheduled.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>Unscheduled · drag to a slot</SectionLabel>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {unscheduled.map(item => {
              const slot = SLOT_BY_KEY[item.meal_type];
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragging(item)}
                  onDragEnd={() => setDragging(null)}
                  style={{ cursor: 'grab', minWidth: 180, opacity: dragging?.id === item.id ? 0.5 : 1 }}
                >
                  <Glass padding={12}>
                    <Badge tone={slot?.tone || 'neutral'}>{item.meal_type}</Badge>
                    <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8, color: THEME.ink, lineHeight: 1.3 }}>{item.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 10px' }} onClick={() => setSelected(item)}>View</button>
                      <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 10px', color: THEME.red }} onClick={() => removeItem(item)}>✕</button>
                    </div>
                  </Glass>
                </div>
              );
            })}
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
              <div key={dayIdx} style={{ position: 'relative' }}>
                <Glass padding={0} style={{ overflow: 'hidden', outline: isToday ? `2px solid ${THEME.accent}` : 'none', outlineOffset: -1 }}>
                  <div style={{
                    height: isToday ? 140 : 88,
                    background: heroImage
                      ? `linear-gradient(180deg, transparent 35%, oklch(0.20 0.02 50 / 0.65) 100%), url("${heroImage}") center/cover`
                      : `linear-gradient(135deg, oklch(0.85 0.10 50 / 0.4), oklch(0.82 0.10 80 / 0.25))`,
                    display: 'flex', alignItems: 'flex-end', padding: '12px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{
                        fontFamily: display,
                        fontWeight: 500, fontStyle: 'italic',
                        fontSize: isToday ? 26 : 19,
                        color: heroImage ? 'oklch(1 0 0)' : THEME.ink,
                        textShadow: heroImage ? '0 1px 6px oklch(0.20 0.02 50 / 0.6)' : 'none',
                        letterSpacing: '-0.01em',
                      }}>{dayLabel}</div>
                      {isToday && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: 'white',
                          background: 'oklch(0.55 0.13 50 / 0.85)',
                          padding: '4px 10px', borderRadius: 999,
                          letterSpacing: '0.12em',
                          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                          boxShadow: '0 0 0 0.5px oklch(1 0 0 / 0.3)',
                        }}>TODAY</span>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    {mealCount === 0 && (
                      <div style={{ fontSize: 13, color: THEME.dim, padding: '12px 0', fontStyle: 'italic' }}>
                        nothing here yet. drag from unscheduled or let auto-curate take a swing.
                      </div>
                    )}
                    {MEAL_SLOTS.map(slot => {
                      const meal = daysMeals[slot.key];
                      if (!meal && !isToday) return null;
                      return (
                        <div key={slot.key} style={{
                          borderTop: `1px solid ${THEME.hairline}`, paddingTop: 10, marginTop: 10,
                        }}>
                          <div style={{
                            fontSize: 10, fontWeight: 700, color: slot.accent,
                            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
                          }}>{slot.label}</div>
                          {meal ? (
                            <div style={{ opacity: meal.skipped ? 0.4 : 1, transition: 'opacity 200ms ease' }}>
                              <div style={{
                                fontWeight: 600, fontSize: isToday ? 15 : 13,
                                lineHeight: 1.3, marginBottom: 4, color: THEME.ink,
                                textDecoration: meal.skipped ? 'line-through' : 'none',
                                textDecorationColor: THEME.faint,
                              }}>
                                {meal.name}
                                {meal.skipped && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: THEME.sage, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>· forgiven</span>}
                              </div>
                              <div style={{ fontSize: 11, color: THEME.dim, display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: isToday ? 8 : 0 }}>
                                <span>{meal.cuisine}</span>
                                <span style={{ color: THEME.faint }}>·</span>
                                <span>{(meal.prep_time_min || 0) + (meal.cook_time_min || 0)} min</span>
                                {meal.cost_per_serving != null && (
                                  <>
                                    <span style={{ color: THEME.faint }}>·</span>
                                    <span style={{ color: THEME.sage, fontWeight: 600 }}>${meal.cost_per_serving.toFixed(0)}/serving</span>
                                  </>
                                )}
                              </div>
                              {isToday && meal.description && (
                                <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.5, marginBottom: 10 }}>{meal.description}</div>
                              )}
                              {isToday && meal.ingredients?.length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{
                                    fontSize: 10, fontWeight: 700, color: THEME.dim,
                                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
                                  }}>Ingredients · {meal.ingredients.length}</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {meal.ingredients.slice(0, 6).map((ing, i) => (
                                      <Badge key={i} tone="neutral">{ing.name}</Badge>
                                    ))}
                                    {meal.ingredients.length > 6 && (
                                      <span style={{ fontSize: 11, color: THEME.dim, alignSelf: 'center' }}>+{meal.ingredients.length - 6} more</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 12px' }} onClick={() => setSelected(meal)}>View</button>
                                {alternates.length > 0 && !meal.skipped && (
                                  <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 12px' }} onClick={() => setSwapFromId(swapFromId === meal.id ? null : meal.id)}>🔄 Swap</button>
                                )}
                                {meal.skipped ? (
                                  <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 12px', color: THEME.sage }} onClick={() => unforgiveItem(meal)}>↩ undo</button>
                                ) : (
                                  <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 12px' }} title="not making this — no shame" onClick={() => forgiveItem(meal)}>🤍 forgive</button>
                                )}
                                <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 12px', color: THEME.red }} onClick={() => removeItem(meal)}>✕</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: THEME.faint, fontStyle: 'italic', padding: '4px 0' }}>— empty —</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Glass>
              </div>
            );
          })}
        </div>
      ) : view === 'grid' ? (
        <Glass padding={4} style={{ overflow: 'auto', marginBottom: 24 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{
                  width: 90, padding: '12px', textAlign: 'left',
                  fontSize: 10, color: THEME.dim, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>Meal</th>
                {DAYS.map((d, i) => (
                  <th key={d} style={{
                    padding: '12px 6px', textAlign: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: i === todayDow ? THEME.accent : THEME.dim,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_SLOTS.map(slot => (
                <tr key={slot.key}>
                  <td style={{
                    padding: '8px 12px', fontSize: 11, fontWeight: 700,
                    color: slot.accent, whiteSpace: 'nowrap',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    borderTop: `1px solid ${THEME.hairline}`,
                  }}>{slot.label}</td>
                  {DAYS.map((day, dayIdx) => {
                    const cell = grid[dayIdx]?.[slot.key];
                    const isTarget = dragTarget?.day === dayIdx && dragTarget?.meal === slot.key;
                    return (
                      <td
                        key={dayIdx}
                        style={{ padding: 4, verticalAlign: 'top', borderTop: `1px solid ${THEME.hairline}`, borderLeft: `1px solid ${THEME.hairline}` }}
                        onDragOver={e => { e.preventDefault(); setDragTarget({ day: dayIdx, meal: slot.key }); }}
                        onDragLeave={() => setDragTarget(null)}
                        onDrop={async e => {
                          e.preventDefault();
                          setDragTarget(null);
                          if (dragging) { await assignSlot(dragging, dayIdx, slot.key); setDragging(null); }
                        }}
                      >
                        <div style={{
                          minHeight: 72,
                          background: isTarget
                            ? 'oklch(0.55 0.13 50 / 0.12)'
                            : cell ? 'oklch(1 0 0 / 0.5)' : 'transparent',
                          backdropFilter: cell ? 'blur(12px)' : 'none',
                          WebkitBackdropFilter: cell ? 'blur(12px)' : 'none',
                          borderRadius: 12,
                          border: isTarget ? `1px dashed ${THEME.accent}` : '1px dashed transparent',
                          padding: cell ? 8 : 0,
                          transition: 'background 0.1s',
                          boxShadow: cell ? 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.12)' : 'none',
                        }}>
                          {cell ? (
                            <div
                              draggable
                              onDragStart={() => setDragging(cell)}
                              onDragEnd={() => setDragging(null)}
                              style={{ cursor: 'grab', opacity: dragging?.id === cell.id ? 0.4 : 1 }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, lineHeight: 1.3, color: THEME.ink }}>{cell.name}</div>
                              <div style={{ fontSize: 10, color: THEME.dim, marginBottom: 6 }}>{cell.cuisine}</div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 12, padding: 0 }} title="View" onClick={() => setSelected(cell)}>👁</button>
                                {alternates.length > 0 && (
                                  <button
                                    style={{ background: 'none', border: 'none', color: THEME.accent, cursor: 'pointer', fontSize: 12, padding: 0 }}
                                    onClick={() => setSwapFromId(swapFromId === cell.id ? null : cell.id)}
                                    title="Swap from alternates"
                                  >🔄</button>
                                )}
                                <button style={{ background: 'none', border: 'none', color: THEME.red, cursor: 'pointer', fontSize: 12, padding: 0 }} title="Remove" onClick={() => removeItem(cell)}>✕</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.faint, fontSize: 18 }}>+</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Glass>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {primaries.length === 0 ? (
            <Glass padding={32} style={{ textAlign: 'center' }}>
              <div style={{ color: THEME.dim }}>nothing planned yet</div>
            </Glass>
          ) : (
            primaries.map(item => {
              const slot = SLOT_BY_KEY[item.meal_type];
              return (
                <Glass key={item.id} padding={14} style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: item.skipped ? 0.45 : 1 }}>
                  <Badge tone={item.skipped ? 'sage' : (slot?.tone || 'neutral')}>{item.skipped ? 'forgiven' : item.meal_type}</Badge>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: THEME.ink, textDecoration: item.skipped ? 'line-through' : 'none', textDecorationColor: THEME.faint }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: THEME.dim }}>
                      {item.cuisine}
                      {item.day_of_week != null ? ` · ${DAYS[item.day_of_week]}` : ' · Unscheduled'}
                      {item.cost_per_serving != null && ` · $${item.cost_per_serving.toFixed(0)}/serving`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {alternates.length > 0 && !item.skipped && (
                      <button style={{ ...glassBtnGhost, fontSize: 12 }} onClick={() => setSwapFromId(swapFromId === item.id ? null : item.id)}>🔄 Swap</button>
                    )}
                    <button style={{ ...glassBtnGhost, fontSize: 12 }} onClick={() => setSelected(item)}>View</button>
                    {item.skipped ? (
                      <button style={{ ...glassBtnGhost, fontSize: 12, color: THEME.sage }} onClick={() => unforgiveItem(item)}>↩ undo</button>
                    ) : (
                      <button style={{ ...glassBtnGhost, fontSize: 12 }} title="not making this — no shame" onClick={() => forgiveItem(item)}>🤍 Forgive</button>
                    )}
                    <button style={{ ...glassBtnGhost, fontSize: 12, color: THEME.red }} onClick={() => removeItem(item)}>Remove</button>
                  </div>
                </Glass>
              );
            })
          )}
        </div>
      )}

      {swapFromId && alternates.length > 0 && (() => {
        const target = primaries.find(p => p.id === swapFromId);
        return (
          <Glass tint="oklch(0.55 0.13 50 / 0.12)" padding={16} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: THEME.ink, fontSize: 13 }}>
                🔄 Swap "{target?.name}" with…
              </div>
              <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 12px' }} onClick={() => setSwapFromId(null)}>Cancel</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {alternates.map(alt => (
                <button
                  key={alt.id}
                  onClick={() => swapWith(swapFromId, alt.id)}
                  style={{
                    background: 'oklch(1 0 0 / 0.55)',
                    backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: 'none', borderRadius: 14, padding: '12px 14px',
                    textAlign: 'left', cursor: 'pointer', color: THEME.text,
                    display: 'flex', flexDirection: 'column', gap: 4,
                    fontFamily: 'inherit',
                    boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.7), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: THEME.ink }}>{alt.name}</div>
                  <div style={{ fontSize: 11, color: THEME.dim }}>
                    {alt.cuisine}
                    {alt.cost_per_serving != null && ` · $${alt.cost_per_serving.toFixed(0)}/serving`}
                    {alt.star_rating > 0 && ` · ★${alt.star_rating.toFixed(1)}`}
                  </div>
                </button>
              ))}
            </div>
          </Glass>
        );
      })()}

      {alternates.length > 0 && !swapFromId && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>🔁 Alternates · {alternates.length} ready</SectionLabel>
          <div style={{ fontSize: 12, color: THEME.dim, marginTop: -8, marginBottom: 12 }}>Click 🔄 on any day to swap one in</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {alternates.map(alt => (
              <Glass key={alt.id} padding={12}>
                <div style={{ fontWeight: 600, fontSize: 13, color: THEME.ink }}>{alt.name}</div>
                <div style={{ fontSize: 11, color: THEME.dim, marginTop: 2 }}>
                  {alt.cuisine}
                  {alt.cost_per_serving != null && ` · $${alt.cost_per_serving.toFixed(0)}`}
                  {alt.star_rating > 0 && ` · ★${alt.star_rating.toFixed(1)}`}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 10px' }} onClick={() => setSelected(alt)}>View</button>
                  <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 10px', color: THEME.red }} onClick={() => removeItem(alt)}>✕</button>
                </div>
              </Glass>
            ))}
          </div>
        </div>
      )}

      {primaries.length === 0 && !unscheduled.length && (
        <Glass padding={48} style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', color: THEME.ink, marginBottom: 8 }}>this week's blank</div>
          <div style={{ color: THEME.dim, marginBottom: 22, fontSize: 14 }}>
            want me to draft one? hit auto-curate above. or browse the library and pick yourself.
          </div>
          <button style={glassBtnPrimary} onClick={() => onNavigate('recipes')}>browse recipes</button>
        </Glass>
      )}

      {shared.length > 0 && (
        <Glass tint="oklch(0.78 0.08 50 / 0.18)" padding={16}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: THEME.accent,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12,
          }}>⚡ Batch prep opportunities</div>
          {shared.map(([ing, meals]) => (
            <div key={ing} style={{ fontSize: 13, marginBottom: 6, color: THEME.text }}>
              <span style={{ fontWeight: 600, color: THEME.ink }}>{ing.charAt(0).toUpperCase() + ing.slice(1)}</span>
              <span style={{ color: THEME.dim }}> — {meals.join(', ')}</span>
            </div>
          ))}
        </Glass>
      )}

      {selected && <RecipeModal recipe={selected} onClose={() => setSelected(null)} />}
      {showPrepGuide && plan?.id && <PrepGuide planId={plan.id} onClose={() => setShowPrepGuide(false)} />}

      {showTemplates && (
        <div className="modal-backdrop" onClick={() => setShowTemplates(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', color: THEME.ink, fontWeight: 500 }}>plan templates</div>
              <button className="modal-close" onClick={() => setShowTemplates(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: THEME.dim, marginBottom: 18, lineHeight: 1.5 }}>
                Save the current week as a reusable template, or load a past week's plan to kick off this week.
              </div>

              {primaries.length > 0 && (
                <Glass padding={14} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: THEME.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Save current plan · {primaries.length} meals
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveTemplate()}
                      placeholder="Template name…"
                      style={{ flex: 1 }}
                    />
                    <button style={{ ...glassBtnPrimary, opacity: !newTemplateName.trim() || savingTemplate ? 0.5 : 1 }}
                      disabled={!newTemplateName.trim() || savingTemplate}
                      onClick={saveTemplate}>
                      {savingTemplate ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </Glass>
              )}

              {templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: THEME.dim, fontSize: 14 }}>
                  No templates yet. Save a plan you like to reuse it next week.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {templates.map(t => (
                    <Glass key={t.id} padding={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: THEME.dim, marginTop: 2 }}>{t.meal_count} meals</div>
                      </div>
                      <button style={{ ...glassBtnPrimary, fontSize: 12, padding: '6px 14px' }}
                        onClick={async () => {
                          const res = await fetch(`/api/meal-plans/from-template/${t.id}`, { method: 'POST' });
                          if (res.ok) { showToast(`loaded "${t.name}". this week's set.`); setShowTemplates(false); loadPlan(); }
                          else showToast("couldn't load that one. try again?");
                        }}>
                        Load →
                      </button>
                      <button onClick={async () => {
                        await fetch(`/api/plan-templates/${t.id}`, { method: 'DELETE' });
                        setTemplates(ts => ts.filter(x => x.id !== t.id));
                        showToast(`tossed "${t.name}"`);
                      }} style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>✕</button>
                    </Glass>
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
