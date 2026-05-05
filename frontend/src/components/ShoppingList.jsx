import { useState, useEffect } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const CATEGORY_LABELS = {
  produce: '🥦 Produce',
  meat:    '🥩 Meat & Poultry',
  seafood: '🐟 Seafood',
  dairy:   '🧀 Dairy & Eggs',
  frozen:  '🧊 Frozen',
  bakery:  '🍞 Bakery',
  pantry:  '🫙 Pantry & Dry Goods',
};

export default function ShoppingList({ currentPlan, showToast }) {
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (currentPlan?.id) loadList(currentPlan.id);
    else setLoading(false);
  }, [currentPlan?.id]);

  async function loadList(planId) {
    setLoading(true);
    try {
      const res = await fetch(`/api/shopping-lists/for-plan/${planId}`);
      setList(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (!currentPlan?.id) { showToast('no plan to shop for yet'); return; }
    setGenerating(true);
    try {
      await fetch('/api/shopping-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_plan_id: currentPlan.id }),
      });
      loadList(currentPlan.id);
      showToast("list ready. let's forage.");
    } catch {
      showToast("couldn't build the list. try again?");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleItem(item) {
    const newChecked = !item.checked;
    await fetch(`/api/shopping-lists/${list.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: newChecked }),
    });
    setList(l => ({
      ...l,
      items: l.items.map(i => i.id === item.id ? { ...i, checked: newChecked } : i),
    }));
  }

  async function copyList() {
    if (!list) return;
    const res = await fetch(`/api/shopping-lists/${list.id}/export`);
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    showToast('copied. paste anywhere.');
  }

  if (loading) {
    return <div className="page"><div style={{ color: THEME.dim, display: 'flex', gap: 10 }}><div className="spinner" /> Loading…</div></div>;
  }

  if (!currentPlan?.id) {
    return (
      <div className="page">
        <PageHeader eyebrow="To buy" title="Shopping list" />
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>🛒</div>
          <div style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', color: THEME.ink, marginBottom: 8 }}>
            no plan yet
          </div>
          <div style={{ color: THEME.dim }}>build a meal plan first and i'll turn it into a shopping list.</div>
        </Glass>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="page">
        <PageHeader eyebrow="To buy" title="Shopping list" />
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>🛒</div>
          <div style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', color: THEME.ink, marginBottom: 8 }}>
            no list yet
          </div>
          <div style={{ color: THEME.dim, marginBottom: 22, fontSize: 14 }}>
            i'll pull one together from this week's plan.
          </div>
          <button style={{ ...glassBtnPrimary, opacity: generating ? 0.5 : 1 }} onClick={generate} disabled={generating}>
            {generating ? 'generating…' : "let's forage"}
          </button>
        </Glass>
      </div>
    );
  }

  const grouped = {};
  for (const item of list.items) {
    const cat = item.category || 'pantry';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  const total = list.items.length;
  const checkedCount = list.items.filter(i => i.checked).length;
  const allDone = total > 0 && checkedCount === total;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{
            fontSize: 11, color: THEME.accent, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6,
          }}>To buy</div>
          <div style={{
            fontFamily: display, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
            color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.01em',
          }}>Shopping list</div>
          <div style={{ color: THEME.dim, fontSize: 13, marginTop: 6 }}>
            <span style={{
              color: THEME.ink, fontFamily: display, fontStyle: 'italic',
              fontWeight: 500, fontSize: 18,
            }}>{checkedCount}</span>{' '}
            <span style={{ color: THEME.faint }}>/ {total}</span> items checked
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={glassBtnGhost} onClick={copyList}>📋 Copy</button>
          <button style={{ ...glassBtnGhost, opacity: generating ? 0.5 : 1 }} onClick={generate} disabled={generating}>
            {generating ? 'Regenerating…' : '🔄 Regenerate'}
          </button>
          <button
            style={{ ...glassBtnGhost, opacity: 0.5 }}
            title="Apply for Instacart API at developers.instacart.com"
            disabled
          >
            🛒 Instacart (API pending)
          </button>
        </div>
      </div>

      {allDone && (
        <Glass tint="oklch(0.55 0.10 145 / 0.20)" padding={20} style={{ marginBottom: 22, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
          <div style={{ fontFamily: display, fontSize: 20, fontStyle: 'italic', color: THEME.ink }}>
            all foraged · go cook something good
          </div>
        </Glass>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.entries(grouped).map(([cat, items]) => (
          <Glass key={cat} padding={4}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: THEME.accent,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              padding: '14px 16px 10px',
            }}>{CATEGORY_LABELS[cat] || cat}</div>
            {items.map((item, i) => (
              <label
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px',
                  borderTop: `1px solid ${THEME.hairline}`,
                  cursor: 'pointer',
                  opacity: item.checked ? 0.45 : 1,
                  transition: 'opacity 200ms ease',
                }}
              >
                <div
                  onClick={() => toggleItem(item)}
                  style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    background: item.checked
                      ? `linear-gradient(180deg, color-mix(in oklch, ${THEME.accent} 80%, white 20%), ${THEME.accent})`
                      : 'oklch(1 0 0 / 0.55)',
                    boxShadow: item.checked
                      ? 'inset 0 1px 0 oklch(1 0 0 / 0.4), 0 0 0 0.5px oklch(0.4 0.1 35 / 0.4)'
                      : 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: 'white', fontWeight: 700,
                  }}>{item.checked ? '✓' : ''}</div>
                <div style={{
                  flex: 1, fontSize: 14, fontWeight: 500, color: THEME.ink,
                  textDecoration: item.checked ? 'line-through' : 'none',
                  textDecorationColor: THEME.faint,
                }}>{item.ingredient_name}</div>
                <div style={{
                  fontSize: 12, color: THEME.dim, fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                }}>
                  {item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : ''}
                </div>
              </label>
            ))}
          </Glass>
        ))}
      </div>
    </div>
  );
}

function PageHeader({ eyebrow, title }) {
  return (
    <div className="page-header">
      <div>
        <div style={{
          fontSize: 11, color: THEME.accent, fontWeight: 700,
          letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6,
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: display, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
          color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.01em',
        }}>{title}</div>
      </div>
    </div>
  );
}
