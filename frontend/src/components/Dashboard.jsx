import { useState, useEffect } from 'react';
import CookMode from './CookMode.jsx';
import EnergyPill from './EnergyPill.jsx';
import Goblin, { GoblinWidget } from './Goblin.jsx';
import GoblinChat from './GoblinChat.jsx';
import DrinkLogger from './DrinkLogger.jsx';
import { Glass, Badge, NutritionBar, PhotoBg, glassBtnPrimary, glassBtnGhost, THEME, display } from '../lib/glass.jsx';
import { usePrefs } from '../lib/prefs.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmtTimeSaved(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return { h, m: String(m).padStart(2, '0') };
}

export default function Dashboard({ currentPlan, setCurrentPlan, onNavigate, showToast }) {
  const { prefs } = usePrefs();
  const [nutrition, setNutrition] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cookingRecipe, setCookingRecipe] = useState(null);
  const [leftovers, setLeftovers] = useState([]);
  const [monthCount, setMonthCount] = useState(0);
  const [adultGoals, setAdultGoals] = useState(null);
  const [cost, setCost] = useState(null);
  const [pickingForMe, setPickingForMe] = useState(false);
  const [goblin, setGoblin] = useState({ state: 'idle', recipe: null });
  const [chatOpen, setChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 700);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [planRes, histRes, leftRes, streakRes, goalsRes, goblinRes] = await Promise.all([
        fetch('/api/meal-plans/current'),
        fetch('/api/cook-history?limit=5'),
        fetch('/api/leftovers'),
        fetch('/api/batch-streak'),
        fetch('/api/adult-goals'),
        fetch('/api/goblin-state'),
      ]);
      const plan = await planRes.json();
      const hist = await histRes.json();
      setCurrentPlan(plan);
      setHistory(hist);
      setLeftovers(await leftRes.json());
      const streakData = await streakRes.json();
      setMonthCount(streakData.month_count || 0);
      setAdultGoals(await goalsRes.json());
      const g = await goblinRes.json().catch(() => null);
      if (g?.state) setGoblin({ state: g.state, recipe: g.recipe });
      if (plan?.id) {
        const [nutData, costData] = await Promise.all([
          fetch(`/api/meal-plans/${plan.id}/nutrition`).then(r => r.json()),
          fetch(`/api/meal-plans/${plan.id}/cost`).then(r => r.json()).catch(() => null),
        ]);
        setNutrition(nutData);
        setCost(costData);
      }
    } catch {
      showToast('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: THEME.dim }}>
        <div className="spinner" /> Loading…
      </div>
    </div>
  );

  const items = (currentPlan?.items || []).filter(i => !i.is_alternate);
  const todayIdx = new Date().getDay();
  const todayMeals = items.filter(m => m.day_of_week === todayIdx);
  const tonight = todayMeals.find(m => m.meal_type === 'dinner') || todayMeals[0];

  // Estimated time saved — heuristic: 14 min per cooked meal vs cooking-everything-fresh baseline
  const planSize = items.length;
  const timeSavedMin = planSize * 14;
  const ts = fmtTimeSaved(timeSavedMin);

  const byDay = {};
  for (const it of items) (byDay[it.day_of_week] = byDay[it.day_of_week] || []).push(it);

  // Find what to use up
  const expiring = (leftovers || []).filter(l => {
    const days = Math.ceil((new Date(l.use_by_date) - new Date()) / 86400000);
    return days <= 3;
  }).map(l => ({
    ...l,
    days_until_expiry: Math.max(0, Math.ceil((new Date(l.use_by_date) - new Date()) / 86400000)),
  }));

  // Nutrition warnings → calmer messaging. On low-capacity days, hide
  // entirely — no nudging on a rough day. Sugar nudge fires when juice
  // pushes the toddler near/over the AAP cap.
  let calciumNote = null;
  if (!prefs.low_capacity_mode) {
    if (nutrition?.drinks?.juice_oz_pct >= 100) calciumNote = "juice is over the AAP cap. swap one cup for water/milk when you can.";
    else if (nutrition?.pct?.sugar_g >= 100) calciumNote = "sugar's running high. mostly drinks — check the drinks panel.";
    else if (nutrition?.pct?.calcium_mg < 75) calciumNote = "calcium's a bit low. yogurt-pasta swap can patch it.";
    else if (nutrition?.pct?.dha_mg < 50) calciumNote = "DHA running low. one salmon meal this week would do it.";
    else if (nutrition?.pct?.iron_mg < 50) calciumNote = "iron's a bit low. red meat or lentils when you can.";
  }
  const drinksLoggerOn = nutrition?.drinks?.logger_enabled;

  async function pickForMe() {
    if (!currentPlan?.id || pickingForMe) return;
    setPickingForMe(true);
    try {
      const res = await fetch(`/api/meal-plans/${currentPlan.id}/auto-curate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: 'overlap', days: 5, alternates: 6 }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "couldn't pick"); return; }
      const energyLabel = prefs.low_capacity_mode ? 'low-energy' : (prefs.energy_level === 'high' ? 'ambitious' : prefs.energy_level === 'low' ? 'low-energy' : 'easy-ish');
      showToast(`picked ${data.picked} ${energyLabel} meals for you`);
      await loadData();
    } finally { setPickingForMe(false); }
  }

  if (cookingRecipe) {
    return <CookMode recipe={cookingRecipe} onClose={() => setCookingRecipe(null)} />;
  }

  const lowCap = prefs.low_capacity_mode;
  // CookMode runs entirely client-side, so "cooking" overrides whatever the
  // server inferred whenever a CookMode session is open on this device.
  const goblinState = cookingRecipe ? 'cooking' : goblin.state;
  const goblinRecipe = cookingRecipe ? cookingRecipe.name : goblin.recipe;

  // ───────── DESKTOP ─────────
  if (!isMobile) {
    return (
      <>
      {chatOpen && <GoblinChat onClose={() => setChatOpen(false)} name={prefs.goblin_name} showToast={showToast} />}
      <div className="page">
        {/* Goblin widget — top-left mascot per BRAND.md Phase B. Click to chat. */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14, paddingLeft: 4 }}>
          <GoblinWidget state={goblinState} recipe={goblinRecipe} size={56} name={prefs.goblin_name} onClick={() => setChatOpen(true)} />
        </div>

        {drinksLoggerOn && <DrinkLogger onChange={loadData} showToast={showToast} />}

        {/* Energy / pick-for-me bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 22, flexWrap: 'wrap', paddingLeft: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: THEME.dim, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>energy</span>
            <EnergyPill />
            {lowCap && (
              <span style={{ fontSize: 11, color: THEME.sage, fontWeight: 700, letterSpacing: '0.08em' }}>🌿 low-capacity day</span>
            )}
          </div>
          <button
            onClick={pickForMe}
            disabled={pickingForMe}
            style={{
              ...glassBtnPrimary,
              padding: '10px 22px', fontSize: 14,
              opacity: pickingForMe ? 0.6 : 1,
            }}
          >
            {pickingForMe ? 'thinking…' : <><Goblin state="idle" size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> just pick for me</>}
          </button>
        </div>

        {/* Headline + time-saved */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24, marginBottom: 28, alignItems: 'flex-end' }}>
          <div style={{ paddingLeft: 8 }}>
            <div style={{ fontSize: 11, color: THEME.accent, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>
              {DAY_LONG[todayIdx]} · this week
            </div>
            {tonight ? (
              <h1 style={{
                fontFamily: display, fontSize: 52, fontWeight: 400, fontStyle: 'italic',
                color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0,
              }}>
                {(() => {
                  const proteinHint = (tonight.name || '').match(/salmon|chicken|lamb|beef|tofu|fish|pork|turkey|shrimp|lentil|chickpea|egg/i);
                  const protein = proteinHint ? proteinHint[0].toLowerCase() : 'dinner';
                  const total = (tonight.prep_time_min || 0) + (tonight.cook_time_min || 0);
                  return <>Tonight, {protein} —<br />
                    <span style={{ fontStyle: 'normal', fontWeight: 600 }}>
                      {total ? `${total} minutes flat.` : 'ready when you are.'}
                    </span>
                  </>;
                })()}
              </h1>
            ) : (
              <h1 style={{ fontFamily: display, fontSize: 48, fontWeight: 400, fontStyle: 'italic', color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 }}>
                Nothing planned for tonight —<br />
                <span style={{ fontStyle: 'normal', fontWeight: 600 }}>let's fix that.</span>
              </h1>
            )}
            <p style={{ fontSize: 15, color: THEME.dim, marginTop: 14, maxWidth: 520, lineHeight: 1.55 }}>
              {tonight
                ? (tonight.description || 'A balanced meal for the whole family.')
                : 'Auto-curate a week from your recipes, or browse the library.'}
            </p>
          </div>

          <Glass padding={22} radius={22}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: THEME.faint, marginBottom: 8 }}>
              Time saved this week
            </div>
            <div style={{ fontFamily: display, fontSize: 56, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.04em', color: THEME.ink, fontVariantNumeric: 'tabular-nums' }}>
              {ts.h}<span style={{ fontStyle: 'italic', color: THEME.accent }}>h</span> {ts.m}<span style={{ fontStyle: 'italic', color: THEME.accent }}>m</span>
            </div>
            <div style={{ fontSize: 12, color: THEME.dim, marginTop: 8, lineHeight: 1.5 }}>
              vs cooking everything fresh.{' '}
              <b style={{ color: THEME.ink }}>
                {planSize} {planSize === 1 ? 'meal' : 'meals'} planned{!prefs.low_capacity_mode && monthCount > 0 ? ` · ${monthCount} ${monthCount === 1 ? 'cook' : 'cooks'} this month` : ''}.
              </b>
            </div>
            {cost?.budget_usd > 0 && (
              <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: `1px solid ${THEME.hairline}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: THEME.faint, marginBottom: 4 }}>
                    Budget
                  </div>
                  <div style={{ fontSize: 13, color: THEME.text, fontVariantNumeric: 'tabular-nums' }}>
                    <b style={{ color: cost.over_budget ? THEME.rust : THEME.ink }}>${cost.total_usd.toFixed(0)}</b>
                    <span style={{ color: THEME.dim }}> / ${cost.budget_usd.toFixed(0)}</span>
                  </div>
                </div>
                <div style={{ flex: 1, marginLeft: 12, height: 6, borderRadius: 999, background: 'oklch(0.4 0.02 60 / 0.10)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, cost.budget_pct || 0)}%`,
                    background: cost.over_budget ? 'oklch(0.55 0.13 50 / 0.6)' : 'oklch(0.78 0.07 50)',
                    transition: 'width 0.4s',
                  }} />
                </div>
              </div>
            )}
          </Glass>
        </div>

        {/* Hero — full-bleed photo with floating glass info card */}
        {tonight && (
          <div style={{
            position: 'relative', marginBottom: 40,
            borderRadius: 28, overflow: 'hidden',
            boxShadow: '0 20px 50px -20px oklch(0.3 0.04 50 / 0.35), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
          }}>
            <PhotoBg name={tonight.name} cuisine={tonight.cuisine} src={tonight.image_url} h={460} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, transparent 30%, oklch(0.30 0.05 50 / 0.45) 100%)' }} />
            <div style={{ position: 'absolute', left: 28, bottom: 28, right: 28, display: 'flex', gap: 16, alignItems: 'flex-end' }}>
              <Glass padding={24} radius={22} strong style={{ flex: 1, maxWidth: 560 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <Badge tone="accent">Tonight</Badge>
                  {tonight.cuisine && <Badge>{tonight.cuisine}</Badge>}
                  {tonight.toddler_safe && <Badge tone="sage">Toddler OK</Badge>}
                  {(tonight.choking_hazards?.length > 0) && <Badge tone="yellow">Prep needed</Badge>}
                </div>
                <h2 style={{ fontFamily: display, fontSize: 30, fontWeight: 500, color: THEME.ink, lineHeight: 1.1, letterSpacing: '-0.015em', margin: 0, marginBottom: 10 }}>
                  {tonight.name}
                </h2>
                {tonight.description && (
                  <p style={{ fontSize: 13.5, color: THEME.text, lineHeight: 1.55, margin: 0, marginBottom: 18 }}>
                    {tonight.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={glassBtnPrimary} onClick={() => setCookingRecipe(tonight)}>Start cooking →</button>
                  <button style={glassBtnGhost} onClick={() => onNavigate('plan')}>Swap meal</button>
                </div>
              </Glass>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { k: 'Hands-on', v: tonight.prep_time_min ? `${tonight.prep_time_min}m` : '—' },
                  { k: 'Total',    v: `${(tonight.prep_time_min || 0) + (tonight.cook_time_min || 0)}m` },
                  { k: '/srv',     v: tonight.cost_per_serving != null ? `$${Math.round(tonight.cost_per_serving)}` : '—' },
                ].map(s => (
                  <Glass key={s.k} padding={'14px 18px'} radius={16} style={{ minWidth: 92 }}>
                    <div style={{ fontSize: 10, color: THEME.dim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{s.k}</div>
                    <div style={{ fontFamily: display, fontSize: 24, fontWeight: 600, color: THEME.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 2 }}>
                      {s.v}
                    </div>
                  </Glass>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Week — glass tiles with photo + caption */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, paddingLeft: 8, paddingRight: 8 }}>
            <h3 style={{ fontFamily: display, fontSize: 26, fontWeight: 500, color: THEME.ink, margin: 0, letterSpacing: '-0.015em' }}>
              The week in dinners
            </h3>
            <button onClick={() => onNavigate('plan')} style={{ background: 'transparent', border: 'none', fontSize: 12, color: THEME.accent, fontWeight: 600, cursor: 'pointer' }}>Edit plan →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, alignItems: 'stretch' }}>
            {DAYS.map((d, i) => {
              const meals = byDay[i] || [];
              const dinner = meals.find(m => m.meal_type === 'dinner') || meals[0];
              const isToday = i === todayIdx;
              return (
                <div key={i} style={{
                  position: 'relative', borderRadius: 16, overflow: 'hidden',
                  boxShadow: '0 4px 14px -8px oklch(0.3 0.04 50 / 0.18)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ flex: '0 0 auto' }}>
                    {dinner ? (
                      <PhotoBg name={dinner.name} cuisine={dinner.cuisine} src={dinner.image_url} h={130} />
                    ) : (
                      <div style={{ height: 130, background: 'oklch(1 0 0 / 0.4)', display: 'grid', placeItems: 'center', color: THEME.faint, fontSize: 22 }}>+</div>
                    )}
                  </div>
                  <div style={{
                    flex: '1 1 auto',
                    padding: '12px 14px',
                    background: 'oklch(1 0 0 / 0.62)',
                    backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    minHeight: 78,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: isToday ? THEME.accent : THEME.dim,
                      marginBottom: 5,
                    }}>
                      {d}{isToday ? ' · today' : ''}
                    </div>
                    <div style={{ fontFamily: display, fontSize: 15, fontStyle: 'italic', color: THEME.ink, lineHeight: 1.25 }}>
                      {dinner?.name || '—'}
                    </div>
                  </div>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none',
                    boxShadow: isToday
                      ? 'inset 0 0 0 1.5px oklch(0.55 0.13 50 / 0.85)'
                      : 'inset 0 0 0 0.5px oklch(0.4 0.02 60 / 0.18)',
                  }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: nutrition + use-up + batch */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          <Glass padding={28} radius={22}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontFamily: display, fontSize: 22, fontWeight: 500, color: THEME.ink, margin: 0 }}>
                Toddler nutrition
              </h3>
              <span style={{ fontSize: 11, color: THEME.faint }}>weekly target coverage</span>
            </div>
            {nutrition && items.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 36px' }}>
                <NutritionBar label="Iron"      pct={nutrition.pct.iron_mg}      value={nutrition.totals.iron_mg}      max={nutrition.rdas.iron_mg} unit="mg" />
                <NutritionBar label="DHA"       pct={nutrition.pct.dha_mg}       value={nutrition.totals.dha_mg}       max={nutrition.rdas.dha_mg} unit="mg" />
                <NutritionBar label="Calcium"   pct={nutrition.pct.calcium_mg}   value={nutrition.totals.calcium_mg}   max={nutrition.rdas.calcium_mg} unit="mg" />
                <NutritionBar label="Vitamin D" pct={nutrition.pct.vitamin_d_iu} value={nutrition.totals.vitamin_d_iu} max={nutrition.rdas.vitamin_d_iu} unit="IU" />
                {nutrition.totals.zinc_mg !== undefined && <NutritionBar label="Zinc" pct={nutrition.pct.zinc_mg} value={nutrition.totals.zinc_mg} max={nutrition.rdas.zinc_mg} unit="mg" />}
                {nutrition.totals.choline_mg !== undefined && <NutritionBar label="Choline" pct={nutrition.pct.choline_mg} value={nutrition.totals.choline_mg} max={nutrition.rdas.choline_mg} unit="mg" />}
                {nutrition.rdas?.added_sugar_g > 0 && (
                  <NutritionBar label="Sugar (cap)" pct={nutrition.pct.sugar_g} value={nutrition.totals.sugar_g} max={nutrition.rdas.added_sugar_g} unit="g" />
                )}
                {nutrition.drinks && (
                  <NutritionBar label="Juice (≤6 oz/day)" pct={nutrition.drinks.juice_oz_pct} value={nutrition.drinks.contribution.juice_oz} max={nutrition.drinks.juice_cap_weekly_oz} unit="oz" />
                )}
              </div>
            ) : (
              <div style={{ color: THEME.dim, fontSize: 14, padding: '8px 0 16px' }}>
                Add meals to your plan to see nutrition tracking.
              </div>
            )}
            {calciumNote && (
              <Glass radius={14} padding={'12px 14px'} style={{ marginTop: 22, fontSize: 13, color: THEME.text, lineHeight: 1.55 }}>
                <span style={{ color: THEME.dim, fontWeight: 600, marginRight: 4 }}>just noticing —</span>
                {calciumNote}
              </Glass>
            )}
          </Glass>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {expiring.length > 0 && (
              <Glass padding={22} radius={20}>
                <div style={{ fontSize: 10, color: THEME.faint, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Use up soon
                </div>
                {expiring.slice(0, 4).map((l, i, arr) => (
                  <div key={l.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${THEME.hairline}` : 'none',
                    fontSize: 13,
                  }}>
                    <span style={{ flex: 1, fontFamily: display, fontStyle: 'italic', color: THEME.ink, fontSize: 14 }}>{l.recipe_name}</span>
                    <span style={{ fontSize: 11, color: THEME.faint, fontVariantNumeric: 'tabular-nums' }}>{l.servings_remaining} srv</span>
                    <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: l.days_until_expiry <= 1 ? THEME.rust : THEME.yellow }}>
                      {l.days_until_expiry === 0 ? 'today' : l.days_until_expiry === 1 ? 'tomorrow' : `${l.days_until_expiry}d`}
                    </span>
                  </div>
                ))}
              </Glass>
            )}

            {nutrition?.adult_totals && adultGoals?.calories && (
              <Glass padding={22} radius={20}>
                <div style={{ fontSize: 10, color: THEME.faint, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Your nutrition (avg per day)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Calories', actual: nutrition.adult_totals.calories / 7,  goal: adultGoals.calories },
                    { label: 'Protein',  actual: nutrition.adult_totals.protein_g / 7, goal: adultGoals.protein_g },
                    { label: 'Iron',     actual: nutrition.adult_totals.iron_mg / 7,   goal: adultGoals.iron_mg },
                    { label: 'Omega-3',  actual: nutrition.adult_totals.dha_mg / 7,    goal: adultGoals.dha_mg },
                  ].filter(r => r.goal > 0).map(row => {
                    const pct = Math.round((row.actual / row.goal) * 100);
                    return <NutritionBar key={row.label} label={row.label} pct={pct} value={row.actual} max={row.goal} unit="" />;
                  })}
                </div>
              </Glass>
            )}
          </div>
        </div>
      </div>
      </>
    );
  }

  // ───────── MOBILE ─────────
  return (
    <>
    {chatOpen && <GoblinChat onClose={() => setChatOpen(false)} name={prefs.goblin_name} showToast={showToast} />}
    <div className="page">
      {/* Goblin widget — click to chat */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
        <GoblinWidget state={goblinState} recipe={goblinRecipe} size={44} name={prefs.goblin_name} onClick={() => setChatOpen(true)} />
      </div>

      {drinksLoggerOn && <DrinkLogger onChange={loadData} showToast={showToast} />}

      {/* Energy + pick-for-me */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 18, paddingLeft: 4 }}>
        <EnergyPill compact />
        <button
          onClick={pickForMe}
          disabled={pickingForMe}
          style={{ ...glassBtnPrimary, fontSize: 12, padding: '7px 14px', opacity: pickingForMe ? 0.6 : 1 }}
        >
          {pickingForMe ? '…' : <><Goblin state="idle" size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> pick for me</>}
        </button>
      </div>

      <div style={{ fontSize: 10, color: THEME.accent, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
        {DAY_LONG[todayIdx]} · this week{lowCap ? ' · 🌿 low-capacity' : ''}
      </div>
      {tonight ? (
        <h1 style={{ fontFamily: display, fontSize: 28, fontWeight: 500, color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0, marginBottom: 16, paddingLeft: 4 }}>
          Tonight, {(tonight.name || '').split(' ').slice(-1)[0].toLowerCase()} —
          <br />
          <span style={{ fontStyle: 'italic', color: THEME.accent }}>
            {(tonight.prep_time_min || 0) + (tonight.cook_time_min || 0)} min flat.
          </span>
        </h1>
      ) : (
        <h1 style={{ fontFamily: display, fontSize: 28, fontWeight: 500, color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0, marginBottom: 16, paddingLeft: 4 }}>
          Nothing tonight —<br /><span style={{ fontStyle: 'italic', color: THEME.accent }}>plan it now.</span>
        </h1>
      )}

      {tonight && (
        <Glass padding={16} radius={20} strong style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <Badge tone="accent">Tonight</Badge>
            {tonight.cuisine && <Badge>{tonight.cuisine}</Badge>}
          </div>
          <h2 style={{ fontFamily: display, fontSize: 22, fontWeight: 500, color: THEME.ink, lineHeight: 1.15, margin: 0, marginBottom: 12 }}>
            {tonight.name}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
            {[
              ['Hands-on', tonight.prep_time_min ? `${tonight.prep_time_min}m` : '—'],
              ['Total',    `${(tonight.prep_time_min || 0) + (tonight.cook_time_min || 0)}m`],
              ['/srv',     tonight.cost_per_serving != null ? `$${Math.round(tonight.cost_per_serving)}` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{
                background: 'oklch(1 0 0 / 0.55)', borderRadius: 10, padding: '8px 10px',
                boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.7), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.1)',
              }}>
                <div style={{ fontSize: 9.5, color: THEME.dim, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontFamily: display, fontSize: 18, fontWeight: 600, color: THEME.ink }}>{v}</div>
              </div>
            ))}
          </div>
          <button style={{ ...glassBtnPrimary, width: '100%' }} onClick={() => setCookingRecipe(tonight)}>Start cooking →</button>
        </Glass>
      )}

      <Glass padding={16} radius={18} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: THEME.faint, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
          Time saved
        </div>
        <div style={{ fontFamily: display, fontSize: 38, fontWeight: 600, color: THEME.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          {ts.h}<span style={{ fontStyle: 'italic', color: THEME.accent }}>h</span> {ts.m}<span style={{ fontStyle: 'italic', color: THEME.accent }}>m</span>
        </div>
        <div style={{ fontSize: 11, color: THEME.dim, marginTop: 4 }}>{planSize} {planSize === 1 ? 'meal' : 'meals'} planned</div>
      </Glass>

      <div style={{ fontSize: 10, color: THEME.faint, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>The week</div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 16, marginLeft: -14, paddingLeft: 14, marginRight: -14, paddingRight: 14, paddingBottom: 4 }}>
        {DAYS.map((d, i) => {
          const dinner = (byDay[i] || []).find(m => m.meal_type === 'dinner') || (byDay[i] || [])[0];
          const isToday = i === todayIdx;
          return (
            <div key={i} style={{
              flex: '0 0 130px', position: 'relative', borderRadius: 14, overflow: 'hidden',
              boxShadow: isToday ? '0 0 0 1.5px oklch(0.55 0.13 50 / 0.7)' : '0 0 0 0.5px oklch(0.4 0.02 60 / 0.14)',
            }}>
              {dinner ? <PhotoBg name={dinner.name} cuisine={dinner.cuisine} src={dinner.image_url} h={90} /> : <div style={{ height: 90, background: 'oklch(1 0 0 / 0.4)', display: 'grid', placeItems: 'center', color: THEME.faint }}>+</div>}
              <div style={{
                padding: '6px 9px',
                background: 'oklch(1 0 0 / 0.55)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: isToday ? THEME.accent : THEME.faint }}>
                  {d}{isToday ? ' · today' : ''}
                </div>
                <div style={{ fontFamily: display, fontSize: 12, fontStyle: 'italic', color: THEME.ink, lineHeight: 1.2, marginTop: 1, height: 28, overflow: 'hidden' }}>
                  {dinner?.name || '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {nutrition && items.length > 0 && (
        <Glass padding={16} radius={18} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: THEME.faint, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>Toddler nutrition</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <NutritionBar label="Iron"    pct={nutrition.pct.iron_mg}    value={nutrition.totals.iron_mg}    max={nutrition.rdas.iron_mg} unit="mg" />
            <NutritionBar label="DHA"     pct={nutrition.pct.dha_mg}     value={nutrition.totals.dha_mg}     max={nutrition.rdas.dha_mg} unit="mg" />
            <NutritionBar label="Calcium" pct={nutrition.pct.calcium_mg} value={nutrition.totals.calcium_mg} max={nutrition.rdas.calcium_mg} unit="mg" />
          </div>
        </Glass>
      )}

      {expiring.length > 0 && (
        <Glass padding={16} radius={18}>
          <div style={{ fontSize: 10, color: THEME.faint, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Use up soon</div>
          {expiring.slice(0, 3).map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13 }}>
              <span style={{ flex: 1, fontFamily: display, fontStyle: 'italic', color: THEME.ink }}>{l.recipe_name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: l.days_until_expiry <= 1 ? THEME.rust : THEME.yellow }}>
                {l.days_until_expiry === 0 ? 'today' : l.days_until_expiry === 1 ? 'tomorrow' : `${l.days_until_expiry}d`}
              </span>
            </div>
          ))}
        </Glass>
      )}
    </div>
    </>
  );
}
