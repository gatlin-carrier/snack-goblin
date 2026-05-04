import { useState, useEffect, useRef } from 'react';
import NutritionBar from './NutritionBar.jsx';
import CookMode from './CookMode.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
const MEAL_COLORS = { breakfast: '#f59e0b', lunch: '#10b981', dinner: '#7c6ff7', snack: '#ec4899' };

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function Dashboard({ currentPlan, setCurrentPlan, onNavigate, showToast }) {
  const [nutrition, setNutrition] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cookingRecipe, setCookingRecipe] = useState(null);
  const [leftovers, setLeftovers] = useState([]);
  const [streak, setStreak] = useState(0);
  const [adultGoals, setAdultGoals] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 700);
  const carouselRef = useRef(null);
  const todayCardRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { loadData(); }, []);

  // After data loads on mobile, scroll today's card into view
  useEffect(() => {
    if (!loading && isMobile && todayCardRef.current && carouselRef.current) {
      const card = todayCardRef.current;
      const carousel = carouselRef.current;
      const offset = card.offsetLeft - 16;
      carousel.scrollTo({ left: offset, behavior: 'auto' });
    }
  }, [loading, isMobile]);

  async function loadData() {
    setLoading(true);
    try {
      const [planRes, histRes, leftRes, streakRes, goalsRes] = await Promise.all([
        fetch('/api/meal-plans/current'),
        fetch('/api/cook-history?limit=5'),
        fetch('/api/leftovers'),
        fetch('/api/batch-streak'),
        fetch('/api/adult-goals'),
      ]);
      const plan = await planRes.json();
      const hist = await histRes.json();
      setCurrentPlan(plan);
      setHistory(hist);
      setLeftovers(await leftRes.json());
      const streakData = await streakRes.json();
      setStreak(streakData.streak || 0);
      setAdultGoals(await goalsRes.json());
      if (plan?.id) {
        const nutData = await fetch(`/api/meal-plans/${plan.id}/nutrition`).then(r => r.json());
        setNutrition(nutData);
      }
    } catch {
      showToast('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  const items = currentPlan?.items || [];
  const mealCount = items.length;

  // Group by day
  const byDay = {};
  for (const item of items) {
    if (item.day_of_week != null) {
      if (!byDay[item.day_of_week]) byDay[item.day_of_week] = [];
      byDay[item.day_of_week].push(item);
    }
  }

  // Tonight's meal (today's day of week)
  const todayIdx = new Date().getDay();
  const tonightMeals = byDay[todayIdx] || [];
  const tonightDinner = tonightMeals.find(m => m.meal_type === 'dinner') || tonightMeals[0];

  // Nutrition warnings
  const warnings = [];
  if (nutrition) {
    if (nutrition.pct.iron_mg < 50)    warnings.push({ level: 'red',    text: '🩸 Iron critically low — add red meat or legumes this week' });
    else if (nutrition.pct.iron_mg < 75) warnings.push({ level: 'yellow', text: '🩸 Iron is low — add a lentil dish or lean beef' });
    if (nutrition.pct.dha_mg < 50)     warnings.push({ level: 'red',    text: '🐟 DHA critically low — add salmon or sardines' });
    else if (nutrition.pct.dha_mg < 75) warnings.push({ level: 'yellow', text: '🐟 DHA low — include oily fish this week' });
    if (nutrition.pct.calcium_mg < 75)  warnings.push({ level: 'yellow', text: '🥛 Calcium low — add dairy or fortified foods' });
    if (nutrition.pct.vitamin_d_iu < 75) warnings.push({ level: 'yellow', text: '☀️ Vitamin D low — add eggs or fortified milk' });
  }
  if (items.some(i => (i.choking_hazards || []).length > 0)) {
    warnings.push({ level: 'yellow', text: '✂️ Some meals need toddler prep — check recipe notes' });
  }

  if (loading) return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-dim)' }}>
        <div className="spinner" /> Loading...
      </div>
    </div>
  );

  return (
    <div className="page">
      {cookingRecipe && <CookMode recipe={cookingRecipe} onClose={() => setCookingRecipe(null)} />}

      <div className="page-header">
        <div className="page-title">This Week</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={() => onNavigate('recipes')}>Browse Recipes</button>
          <button className="btn-primary" onClick={() => onNavigate('plan')}>Edit Plan</button>
        </div>
      </div>

      {/* Tonight's meal widget */}
      {tonightDinner ? (
        <div className="card" style={{ marginBottom: 24, background: 'rgba(124,111,247,0.05)', borderColor: 'rgba(124,111,247,0.25)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36 }}>🌙</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tonight</div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{tonightDinner.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
              {tonightDinner.cuisine} · {(tonightDinner.prep_time_min || 0) + (tonightDinner.cook_time_min || 0)} min
            </div>
          </div>
          <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px', flexShrink: 0 }}
            onClick={() => setCookingRecipe(tonightDinner)}>
            🍳 Cook
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
          <div style={{ fontSize: 28 }}>📅</div>
          <div style={{ flex: 1, color: 'var(--text-dim)', fontSize: 14 }}>No meal planned for today.</div>
          <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => onNavigate('plan')}>Plan it</button>
        </div>
      )}

      {/* Week — grid on desktop, scroll-snap carousel on mobile */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title">Meal Plan</div>
        {isMobile ? (
          <div className="meal-carousel" ref={carouselRef}>
            {DAYS.map((day, i) => {
              const dayMeals = byDay[i] || [];
              const isToday = i === todayIdx;
              const heroMeal = dayMeals.find(m => m.meal_type === 'dinner') || dayMeals[0];
              const heroImage = heroMeal?.image_url;
              return (
                <div
                  key={i}
                  ref={isToday ? todayCardRef : null}
                  className={`meal-day-card${isToday ? ' today' : ''}`}
                  style={{ padding: 0, overflow: 'hidden' }}
                >
                  {/* Card hero image — uses dinner image, gradient fallback */}
                  <div style={{
                    height: isToday ? 140 : 80,
                    background: heroImage
                      ? `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%), url("${heroImage}") center/cover`
                      : `linear-gradient(135deg, ${heroMeal ? MEAL_COLORS[heroMeal.meal_type] : 'rgba(124,111,247,0.4)'}40, rgba(255,255,255,0.04))`,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '10px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ fontWeight: 700, fontSize: isToday ? 22 : 16, color: heroImage ? 'white' : 'var(--text)', textShadow: heroImage ? '0 1px 4px rgba(0,0,0,0.6)' : 'none' }}>{day}</div>
                      {isToday && <div style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'rgba(124,111,247,0.85)', padding: '3px 8px', borderRadius: 20, letterSpacing: '0.06em', backdropFilter: 'blur(6px)' }}>TODAY</div>}
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                  {dayMeals.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '14px 0' }}>
                      Nothing planned
                    </div>
                  ) : isToday ? (
                    /* Today: rich detail per meal */
                    dayMeals.map((meal, idx) => (
                      <div key={meal.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none', paddingTop: idx > 0 ? 10 : 0, marginTop: idx > 0 ? 10 : 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: MEAL_COLORS[meal.meal_type], textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                          {MEAL_ICONS[meal.meal_type]} {meal.meal_type}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, lineHeight: 1.3 }}>{meal.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                          {meal.cuisine && <span>🌍 {meal.cuisine}</span>}
                          <span>⏱ {(meal.prep_time_min || 0) + (meal.cook_time_min || 0)} min</span>
                          {meal.cost_per_serving != null && <span style={{ color: 'var(--green)', fontWeight: 600 }}>≈${meal.cost_per_serving.toFixed(0)}/serving</span>}
                        </div>
                        {meal.description && (
                          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45, marginBottom: 8 }}>{meal.description}</div>
                        )}
                        {(meal.choking_hazards?.length > 0) && (
                          <span className="badge badge-yellow" style={{ fontSize: 10, marginBottom: 8, display: 'inline-block' }}>✂️ Prep needed for toddler</span>
                        )}
                        <button
                          className="btn-primary"
                          style={{ fontSize: 12, padding: '6px 14px', marginTop: 4 }}
                          onClick={() => setCookingRecipe(meal)}
                        >🍳 Cook</button>
                      </div>
                    ))
                  ) : (
                    /* Other days: condensed */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dayMeals.map(meal => (
                        <div key={meal.id} style={{ fontSize: 13 }}>
                          <span style={{ marginRight: 6 }}>{MEAL_ICONS[meal.meal_type]}</span>
                          <span style={{ fontWeight: 500 }}>{meal.name}</span>
                          {meal.cost_per_serving != null && (
                            <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 6 }}>≈${meal.cost_per_serving.toFixed(0)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="week-grid">
            {DAYS.map((day, i) => {
              const dayMeals = byDay[i] || [];
              const isToday = i === todayIdx;
              return (
                <div key={i} className={`day-cell${dayMeals.length ? ' has-meal' : ''}`}
                     style={isToday ? { borderColor: 'var(--accent)', background: 'rgba(124,111,247,0.06)' } : {}}>
                  <div className="day-label" style={isToday ? { color: 'var(--accent)', fontWeight: 700 } : {}}>{day}</div>
                  {dayMeals.length ? (
                    dayMeals.map((meal, j) => (
                      <div key={j} style={{ marginTop: j === 0 ? 4 : 2 }}>
                        <div className="day-meal-name">{MEAL_ICONS[meal.meal_type]} {meal.name}</div>
                        {(meal.choking_hazards?.length > 0) && (
                          <span className="badge badge-yellow" style={{ fontSize: 10 }}>✂️ Prep</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--border)', fontSize: 13, marginTop: 8 }}>—</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Nutrition */}
        <div className="card">
          <div className="section-title">Toddler Nutrition (weekly)</div>
          {nutrition && mealCount > 0 ? (
            <div className="nutrition-bar-wrap">
              <NutritionBar label="Iron" value={nutrition.totals.iron_mg} max={nutrition.rdas.iron_mg} unit="mg" />
              <NutritionBar label="Calcium" value={nutrition.totals.calcium_mg} max={nutrition.rdas.calcium_mg} unit="mg" />
              <NutritionBar label="Vitamin D" value={nutrition.totals.vitamin_d_iu} max={nutrition.rdas.vitamin_d_iu} unit="IU" />
              <NutritionBar label="DHA/Omega-3" value={nutrition.totals.dha_mg} max={nutrition.rdas.dha_mg} unit="mg" />
              <NutritionBar label="Zinc" value={nutrition.totals.zinc_mg} max={nutrition.rdas.zinc_mg} unit="mg" />
              <NutritionBar label="Choline" value={nutrition.totals.choline_mg} max={nutrition.rdas.choline_mg} unit="mg" />
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-dim)' }}>
                Based on {mealCount} meal{mealCount !== 1 ? 's' : ''} planned
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>
              Add meals to your plan to see nutrition tracking.
              <br /><br />
              <button className="btn-primary" onClick={() => onNavigate('recipes')}>Browse Recipes</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(250,204,21,0.3)' }}>
              <div className="section-title">Alerts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 13, color: w.level === 'red' ? 'var(--red)' : 'var(--yellow)' }}>{w.text}</div>
                ))}
              </div>
            </div>
          )}

          {/* Recent cooks */}
          {history.length > 0 && (
            <div className="card">
              <div className="section-title">Recently Cooked</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map(entry => (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 16 }}>{MEAL_ICONS[entry.meal_type] || '🍽️'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.name}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{timeAgo(entry.cooked_at)}</div>
                  </div>
                ))}
                <button className="btn-ghost" style={{ fontSize: 12, marginTop: 4 }} onClick={() => onNavigate('history')}>
                  View all →
                </button>
              </div>
            </div>
          )}

          {/* Leftovers expiring soon */}
          {leftovers.length > 0 && (() => {
            const expiring = leftovers.filter(l => {
              const days = Math.ceil((new Date(l.use_by_date) - new Date()) / 86400000);
              return days <= 3;
            });
            if (expiring.length === 0) return null;
            return (
              <div className="card" style={{ borderColor: 'rgba(249,115,22,0.35)' }}>
                <div className="section-title">⏰ Use Up Soon</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {expiring.map(l => {
                    const days = Math.ceil((new Date(l.use_by_date) - new Date()) / 86400000);
                    return (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <span style={{ flex: 1, fontWeight: 600 }}>{l.recipe_name}</span>
                        <span style={{ color: days <= 1 ? 'var(--red)' : 'var(--yellow)', fontWeight: 600 }}>
                          {days <= 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days}d`}
                        </span>
                        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{l.servings_remaining} srv left</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Batch prep streak */}
          {streak > 0 && (
            <div className="card" style={{ borderColor: 'rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28 }}>🔥</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{streak}-week streak</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>Batch prep consistency</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>KEEP IT UP</div>
              </div>
            </div>
          )}

          {/* Adult nutrition */}
          {nutrition?.adult_totals && adultGoals?.calories && (
            <div className="card">
              <div className="section-title">Your Nutrition (weekly avg)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Calories',  actual: nutrition.adult_totals.calories,  goal: adultGoals.calories  * 7, unit: 'kcal' },
                  { label: 'Protein',   actual: nutrition.adult_totals.protein_g,  goal: adultGoals.protein_g * 7, unit: 'g'    },
                  { label: 'Iron',      actual: nutrition.adult_totals.iron_mg,    goal: adultGoals.iron_mg   * 7, unit: 'mg'   },
                  { label: 'Omega-3',   actual: nutrition.adult_totals.dha_mg,     goal: adultGoals.dha_mg    * 7, unit: 'mg'   },
                ].filter(r => r.goal > 0).map(row => {
                  const pct = Math.min(100, Math.round((row.actual / row.goal) * 100));
                  const color = pct >= 90 ? 'var(--green)' : pct >= 65 ? 'var(--yellow)' : 'var(--red)';
                  return (
                    <div key={row.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text-dim)' }}>{row.label}</span>
                        <span style={{ fontWeight: 600, color }}>
                          {Math.round(row.actual)}<span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/{Math.round(row.goal)} {row.unit}</span>
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="card">
            <div className="section-title">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => onNavigate('recipes')}>
                🍽️ Generate new meal options
              </button>
              <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => onNavigate('plan')}>
                📅 Build this week's plan
              </button>
              <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => onNavigate('shopping')}>
                🛒 View shopping list
              </button>
              <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => onNavigate('firstfoods')}>
                👶 First foods log
              </button>
              <button className="btn-ghost" style={{ textAlign: 'left' }} onClick={() => onNavigate('allergens')}>
                🧪 Allergen tracker
              </button>
            </div>
          </div>

          {/* Week summary */}
          <div className="card">
            <div className="section-title">Week Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Meals planned: </span>
                <span style={{ fontWeight: 600 }}>{mealCount}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Status: </span>
                <span className={`badge ${mealCount >= 5 ? 'badge-green' : mealCount > 0 ? 'badge-yellow' : 'badge-red'}`}>
                  {mealCount >= 5 ? 'Complete' : mealCount > 0 ? 'In progress' : 'Empty'}
                </span>
              </div>
              {streak > 0 && (
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Streak: </span>
                  <span style={{ fontWeight: 600, color: 'var(--green)' }}>🔥 {streak} weeks</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
