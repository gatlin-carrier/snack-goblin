import { useState, useEffect } from 'react';

const CATEGORY_LABELS = {
  produce: '🥦 Produce',
  meat: '🥩 Meat & Poultry',
  seafood: '🐟 Seafood',
  dairy: '🧀 Dairy & Eggs',
  frozen: '🧊 Frozen',
  bakery: '🍞 Bakery',
  pantry: '🫙 Pantry & Dry Goods',
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
    if (!currentPlan?.id) { showToast('No active meal plan'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/shopping-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_plan_id: currentPlan.id }),
      });
      const data = await res.json();
      loadList(currentPlan.id);
      showToast('Shopping list generated!');
    } catch {
      showToast('Failed to generate list');
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
    showToast('Shopping list copied to clipboard!');
  }

  if (loading) {
    return <div className="page"><div style={{ color: 'var(--text-dim)', display: 'flex', gap: 10 }}><div className="spinner" /> Loading...</div></div>;
  }

  if (!currentPlan?.id) {
    return (
      <div className="page">
        <div className="page-title" style={{ marginBottom: 24 }}>Shopping List</div>
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛒</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No active meal plan</div>
          <div style={{ color: 'var(--text-dim)' }}>Build a meal plan first, then generate your shopping list here.</div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title">Shopping List</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛒</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No shopping list yet</div>
          <div style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
            Generate a shopping list from your meal plan.
          </div>
          <button className="btn-primary" onClick={generate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Shopping List'}
          </button>
        </div>
      </div>
    );
  }

  // Group by category
  const grouped = {};
  for (const item of list.items) {
    const cat = item.category || 'pantry';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  const total = list.items.length;
  const checked = list.items.filter(i => i.checked).length;
  const allDone = total > 0 && checked === total;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Shopping List</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
            {checked}/{total} items checked
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn-ghost" onClick={copyList}>📋 Copy List</button>
          <button className="btn-ghost" onClick={generate} disabled={generating}>
            {generating ? 'Regenerating...' : '🔄 Regenerate'}
          </button>
          {process.env.INSTACART_API_KEY ? (
            <button className="btn-primary" disabled>
              🛒 Send to Instacart
            </button>
          ) : (
            <button
              className="btn-ghost"
              title="Apply for Instacart API at developers.instacart.com"
              disabled
              style={{ opacity: 0.5 }}
            >
              🛒 Instacart (API pending)
            </button>
          )}
        </div>
      </div>

      {allDone && (
        <div className="card" style={{ background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.3)', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🎉</div>
          <div style={{ fontWeight: 600 }}>All done! Happy cooking.</div>
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="shop-category">
          <div className="shop-category-title">{CATEGORY_LABELS[cat] || cat}</div>
          {items.map(item => (
            <div key={item.id} className={`shop-item${item.checked ? ' checked' : ''}`}>
              <input
                type="checkbox"
                checked={!!item.checked}
                onChange={() => toggleItem(item)}
              />
              <div className="shop-item-name">{item.ingredient_name}</div>
              <div className="shop-item-qty">
                {item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : ''}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
