export default function NutritionBar({ label, value, max, unit }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 100 ? 'var(--green)' : pct >= 75 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="nutrition-bar-row">
      <div className="nutrition-bar-label">
        <span>{label}</span>
        <span style={{ color }}>
          {Math.round(value)}/{max} {unit} ({pct}%)
        </span>
      </div>
      <div className="nutrition-bar-track">
        <div
          className="nutrition-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
