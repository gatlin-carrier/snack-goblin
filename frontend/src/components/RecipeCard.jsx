import { Glass, Badge, PhotoBg, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const MEAL_TYPE_LABEL = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'snack' };
const MEAL_TYPE_TONE  = { breakfast: 'yellow',     lunch: 'sage',  dinner: 'accent', snack: 'rust' };

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
            color: s <= Math.round(rating || 0) ? 'oklch(0.78 0.15 85)' : 'oklch(0.4 0.02 60 / 0.25)',
            lineHeight: 1,
            userSelect: 'none',
          }}
          title={onRate ? `rate ${s} star${s > 1 ? 's' : ''}` : `${rating?.toFixed(1)} (${count} ratings)`}
        >★</span>
      ))}
      {count > 0 && (
        <span style={{ fontSize: 11, color: THEME.dim, marginLeft: 4 }}>
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
  const totalMin = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);

  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        outline: selected ? `2px solid ${THEME.accent}` : 'none',
        outlineOffset: -1,
        borderRadius: 22,
      }}
    >
      <Glass padding={0} style={{ overflow: 'hidden' }}>
        <PhotoBg
          name={recipe.name}
          cuisine={recipe.cuisine}
          src={recipe.image_url}
          h={150}
        >
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <Badge tone={MEAL_TYPE_TONE[mealType] || 'neutral'}>{MEAL_TYPE_LABEL[mealType] || mealType}</Badge>
          </div>
          {recipe.in_rotation === 0 && (
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <Badge tone="rust">paused</Badge>
            </div>
          )}
        </PhotoBg>

        <div style={{ padding: 16 }}>
          <div style={{
            fontFamily: display, fontStyle: 'italic', fontSize: 18, fontWeight: 500, lineHeight: 1.2,
            color: THEME.ink, marginBottom: 6, letterSpacing: '-0.01em',
          }}>{recipe.name}</div>

          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
            fontSize: 12, color: THEME.dim, marginBottom: 10,
          }}>
            <span>{recipe.cuisine}</span>
            <span style={{ color: THEME.faint }}>·</span>
            <span>{totalMin} min</span>
            {recipe.cost_per_serving != null && (
              <>
                <span style={{ color: THEME.faint }}>·</span>
                <span style={{ color: THEME.sage, fontWeight: 600 }} title="estimated cost per serving">
                  ${recipe.cost_per_serving.toFixed(0)}/serving
                </span>
              </>
            )}
            {n.iron_mg > 3 && <span style={{ color: THEME.sage }}>· iron</span>}
            {n.dha_mg > 50 && <span style={{ color: THEME.accent }}>· dha</span>}
          </div>

          <div style={{
            fontSize: 13, color: THEME.text, lineHeight: 1.45,
            marginBottom: 12,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{recipe.description}</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <StarRating rating={recipe.star_rating} count={recipe.rating_count} onRate={onRate} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {recipe.toddler_safe ? (
              <Badge tone="sage">👶 toddler ok</Badge>
            ) : (
              <Badge tone="rust">⚠ modify</Badge>
            )}
            {hasHazards && <Badge tone="yellow">✂ prep needed</Badge>}
            {(recipe.tags || []).slice(0, 2).map(t => (
              <Badge key={t} tone="neutral">{t}</Badge>
            ))}
          </div>

          {(onAdd || onDiscard) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }} onClick={e => e.stopPropagation()}>
              {onAdd && (
                <button
                  style={{ ...glassBtnPrimary, flex: 1, fontSize: 13, opacity: planItemCount >= 35 ? 0.5 : 1 }}
                  onClick={onAdd}
                  disabled={planItemCount >= 35}
                >
                  + add to week
                </button>
              )}
              {onDiscard && (
                <button
                  style={{ ...glassBtnGhost, color: THEME.red, padding: '9px 14px' }}
                  onClick={onDiscard}
                  title="delete recipe"
                >✕</button>
              )}
            </div>
          )}
        </div>
      </Glass>
    </div>
  );
}
