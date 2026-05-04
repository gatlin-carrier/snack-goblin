const MEAL_TYPE_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
const MEAL_TYPE_COLORS = { breakfast: '#f59e0b', lunch: '#10b981', dinner: '#7c6ff7', snack: '#ec4899' };

function StarRating({ rating, count, onRate, size = 'sm' }) {
  const stars = [1, 2, 3, 4, 5];
  const px = size === 'lg' ? 22 : 16;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {stars.map(s => (
        <span
          key={s}
          onClick={onRate ? (e) => { e.stopPropagation(); onRate(s); } : undefined}
          style={{
            fontSize: px,
            cursor: onRate ? 'pointer' : 'default',
            color: s <= Math.round(rating || 0) ? '#facc15' : 'var(--border)',
            lineHeight: 1,
            userSelect: 'none',
          }}
          title={onRate ? `Rate ${s} star${s > 1 ? 's' : ''}` : `${rating?.toFixed(1)} (${count} ratings)`}
        >★</span>
      ))}
      {count > 0 && (
        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>
          {rating?.toFixed(1)} ({count})
        </span>
      )}
    </div>
  );
}

export { StarRating };

export default function RecipeCard({ recipe, selected, onClick, onAdd, onDiscard, onRate, planItemCount }) {
  const n = recipe.nutrition || {};
  const hasHazards = recipe.choking_hazards?.length > 0;
  const mealType = recipe.meal_type || 'dinner';
  const color = MEAL_TYPE_COLORS[mealType];

  return (
    <div className={`card recipe-card${selected ? ' selected' : ''}`} onClick={onClick} style={{ padding: 0, overflow: 'hidden' }}>
      {/* Hero image (or gradient fallback) */}
      <div style={{
        position: 'relative',
        height: 140,
        background: recipe.image_url
          ? `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.5) 100%), url("${recipe.image_url}") center/cover`
          : `linear-gradient(135deg, ${color}40, ${color}10)`,
      }}>
        {!recipe.image_url && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, opacity: 0.5 }}>
            {MEAL_TYPE_ICONS[mealType]}
          </div>
        )}
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, fontWeight: 600, color: 'white', background: `${color}cc`, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          {MEAL_TYPE_ICONS[mealType]} {mealType}
        </span>
      </div>

      <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div className="recipe-card-name" style={{ flex: 1 }}>{recipe.name}</div>
      </div>
      <div className="recipe-card-meta">
        <span>🌍 {recipe.cuisine}</span>
        <span>⏱ {(recipe.prep_time_min || 0) + (recipe.cook_time_min || 0)} min</span>
        {recipe.cost_per_serving != null && (
          <span style={{ color: 'var(--green)', fontWeight: 600 }} title="Estimated cost per serving (current US grocery prices)">
            ≈ ${recipe.cost_per_serving.toFixed(0)}/serving
          </span>
        )}
        {n.iron_mg > 3 && <span style={{ color: 'var(--green)' }}>🩸 Iron</span>}
        {n.dha_mg > 50 && <span style={{ color: 'var(--accent)' }}>🐟 DHA</span>}
      </div>
      <div className="recipe-card-desc">{recipe.description}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <StarRating rating={recipe.star_rating} count={recipe.rating_count} onRate={onRate} />
        {recipe.in_rotation === 0 && (
          <span style={{ fontSize: 11, color: 'var(--red)', background: 'rgba(248,113,113,0.1)', padding: '1px 6px', borderRadius: 10 }}>paused</span>
        )}
      </div>
      <div className="recipe-card-footer">
        {recipe.toddler_safe ? (
          <span className="badge badge-green">👶 Toddler OK</span>
        ) : (
          <span className="badge badge-red">⚠️ Modify</span>
        )}
        {hasHazards && <span className="badge badge-yellow">✂️ Prep needed</span>}
        {(recipe.tags || []).slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
      </div>
      {(onAdd || onDiscard) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }} onClick={e => e.stopPropagation()}>
          {onAdd && (
            <button className="btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={onAdd} disabled={planItemCount >= 35}>
              + Add to Week
            </button>
          )}
          {onDiscard && (
            <button className="btn-danger" onClick={onDiscard} title="Delete recipe">✕</button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
