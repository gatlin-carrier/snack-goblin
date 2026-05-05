import { useState, useEffect } from 'react';
import { Glass, Badge, THEME, display } from '../lib/glass.jsx';

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

const MEAL_TONE = { breakfast: 'yellow', lunch: 'sage', dinner: 'accent', snack: 'rust' };

export default function MealHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cook-history?limit=50')
      .then(r => r.json())
      .then(data => { setHistory(data); setLoading(false); });
  }, []);

  if (loading) return <div className="page"><div style={{ color: THEME.dim, display: 'flex', gap: 10 }}><div className="spinner" /> Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{
            fontSize: 11, color: THEME.accent, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6,
          }}>Cook log</div>
          <div style={{
            fontFamily: display, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
            color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.01em',
          }}>History</div>
          <div style={{ fontSize: 13, color: THEME.dim, marginTop: 6 }}>
            <span style={{
              color: THEME.ink, fontFamily: display, fontStyle: 'italic',
              fontWeight: 500, fontSize: 18, marginRight: 4,
            }}>{history.length}</span>
            sessions logged
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 14 }}>📖</div>
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            color: THEME.ink, marginBottom: 8,
          }}>no meals on record</div>
          <div style={{ fontSize: 13, color: THEME.dim, lineHeight: 1.55 }}>
            cook one in Cook Mode and i'll remember.
          </div>
        </Glass>
      ) : (
        <Glass padding={4}>
          {history.map((entry, i) => (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px',
              borderTop: i > 0 ? `1px solid ${THEME.hairline}` : 'none',
            }}>
              <Badge tone={MEAL_TONE[entry.meal_type] || 'neutral'}>{entry.meal_type || 'meal'}</Badge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>{entry.name}</div>
                <div style={{ fontSize: 12, color: THEME.dim, marginTop: 2 }}>
                  {entry.cuisine} · {(entry.prep_time_min || 0) + (entry.cook_time_min || 0)} min
                  {entry.notes && ` · ${entry.notes}`}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: THEME.text, fontWeight: 500 }}>{timeAgo(entry.cooked_at)}</div>
                <div style={{
                  fontSize: 10, color: THEME.faint, marginTop: 4,
                  textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                }}>cooked {entry.cook_count}×</div>
              </div>
            </div>
          ))}
        </Glass>
      )}
    </div>
  );
}
