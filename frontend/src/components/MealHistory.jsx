import { useState, useEffect } from 'react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

export default function MealHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cook-history?limit=50')
      .then(r => r.json())
      .then(data => { setHistory(data); setLoading(false); });
  }, []);

  if (loading) return <div className="page"><div style={{ color: 'var(--text-dim)', display: 'flex', gap: 10 }}><div className="spinner" /> Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Cook History</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{history.length} sessions logged</div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No cook history yet</div>
          <div style={{ fontSize: 13 }}>When you finish a recipe in Cook Mode, it gets logged here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {history.map(entry => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, width: 32, textAlign: 'center', flexShrink: 0 }}>
                {MEAL_ICONS[entry.meal_type] || '🍽️'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {entry.cuisine} · {(entry.prep_time_min || 0) + (entry.cook_time_min || 0)} min
                  {entry.notes && ` · ${entry.notes}`}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{timeAgo(entry.cooked_at)}</div>
                <div style={{ fontSize: 11, color: 'var(--border)', marginTop: 2 }}>
                  cooked {entry.cook_count}×
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
