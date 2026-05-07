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
  const [list, setList]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [showStores, setShowStores]   = useState(false);
  const [storeStatus, setStoreStatus] = useState({ instacart: false, kroger: false, krogerConfigured: false });
  const [sendingTo, setSendingTo]     = useState(null);

  useEffect(() => {
    if (currentPlan?.id) loadList(currentPlan.id);
    else setLoading(false);
  }, [currentPlan?.id]);

  useEffect(() => {
    Promise.all([
      fetch('/api/retailer/instacart/status').then(r => r.json()).catch(() => ({ configured: false })),
      fetch('/api/retailer/kroger/status').then(r => r.json()).catch(() => ({ connected: false, configured: false })),
    ]).then(([ic, kr]) => {
      setStoreStatus({ instacart: ic.configured, kroger: kr.connected, krogerConfigured: kr.configured });
    });
  }, []);

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

  async function sendToInstacart() {
    setSendingTo('instacart');
    try {
      const res = await fetch(`/api/shopping-lists/${list.id}/send/instacart`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Instacart error'); return; }
      window.open(data.url, '_blank');
      setShowStores(false);
      showToast('opening Instacart cart…');
    } catch {
      showToast('could not reach Instacart');
    } finally {
      setSendingTo(null);
    }
  }

  async function sendToKroger() {
    setSendingTo('kroger');
    try {
      const res = await fetch(`/api/shopping-lists/${list.id}/send/kroger`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        if (data.reconnect) { showToast('Kroger session expired. Reconnect in Integrations settings.'); }
        else showToast(data.error || 'Kroger error');
        return;
      }
      window.open(data.url, '_blank');
      setShowStores(false);
      showToast(`${data.added} items added to your Kroger cart`);
    } catch {
      showToast('could not reach Kroger');
    } finally {
      setSendingTo(null);
    }
  }

  function searchWalmart() {
    if (!list?.items) return;
    const unchecked = list.items.filter(i => !i.checked);
    const query = unchecked.map(i => i.ingredient_name).join(' ');
    window.open(`https://www.walmart.com/search?q=${encodeURIComponent(query)}`, '_blank');
    setShowStores(false);
  }

  function searchAmazonFresh() {
    if (!list?.items) return;
    const unchecked = list.items.filter(i => !i.checked);
    const query = unchecked.map(i => i.ingredient_name).join(' ');
    // rh=n:16310101 scopes to Amazon Fresh / grocery
    window.open(`https://www.amazon.com/s?k=${encodeURIComponent(query)}&rh=n%3A16310101`, '_blank');
    setShowStores(false);
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

  const total        = list.items.length;
  const checkedCount = list.items.filter(i => i.checked).length;
  const allDone      = total > 0 && checkedCount === total;

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
          <button style={glassBtnGhost} onClick={() => setShowStores(true)}>
            🛒 Send to store
          </button>
        </div>
      </div>

      {allDone && (
        <Glass tint="oklch(0.55 0.10 50 / 0.20)" padding={20} style={{ marginBottom: 22, textAlign: 'center' }}>
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
            {items.map((item) => (
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
                      ? 'inset 0 1px 0 oklch(1 0 0 / 0.4), 0 0 0 0.5px oklch(0.35 0.10 50 / 0.4)'
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

      {showStores && (
        <StorePickerModal
          storeStatus={storeStatus}
          sendingTo={sendingTo}
          onInstacart={sendToInstacart}
          onKroger={sendToKroger}
          onWalmart={searchWalmart}
          onAmazonFresh={searchAmazonFresh}
          onClose={() => setShowStores(false)}
        />
      )}
    </div>
  );
}

function StorePickerModal({ storeStatus, sendingTo, onInstacart, onKroger, onWalmart, onAmazonFresh, onClose }) {
  const stores = [
    {
      id: 'instacart',
      name: 'Instacart',
      logo: '🛒',
      desc: storeStatus.instacart
        ? 'Creates a shared cart link with all your items'
        : 'API key required — apply at developers.instacart.com',
      available: storeStatus.instacart,
      onClick: onInstacart,
    },
    {
      id: 'kroger',
      name: 'Kroger',
      logo: '🛍',
      desc: storeStatus.kroger
        ? 'Adds items directly to your Kroger cart'
        : storeStatus.krogerConfigured
          ? 'Connect your Kroger account in Integrations settings'
          : 'Configure KROGER_CLIENT_ID in environment first',
      available: storeStatus.kroger,
      onClick: onKroger,
    },
    {
      id: 'walmart',
      name: 'Walmart',
      logo: '🏪',
      desc: 'Opens walmart.com — search pre-filled with your items',
      available: true,
      onClick: onWalmart,
    },
    {
      id: 'amazon',
      name: 'Amazon Fresh',
      logo: '📦',
      desc: 'Opens Amazon Fresh grocery search',
      available: true,
      onClick: onAmazonFresh,
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontFamily: display, fontSize: 20, fontStyle: 'italic', fontWeight: 500, color: THEME.ink }}>
            Send to store
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stores.map(store => {
            const busy = sendingTo === store.id;
            return (
              <button
                key={store.id}
                onClick={store.available ? store.onClick : undefined}
                disabled={!store.available || !!sendingTo}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', textAlign: 'left',
                  background: store.available ? 'oklch(1 0 0 / 0.55)' : 'oklch(1 0 0 / 0.28)',
                  border: 'none', borderRadius: 14, cursor: store.available ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                  boxShadow: store.available
                    ? 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)'
                    : 'none',
                  opacity: store.available ? 1 : 0.55,
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  transition: 'background 150ms ease',
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }}>{store.logo}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{store.name}</div>
                  <div style={{ fontSize: 12, color: THEME.dim, marginTop: 2, lineHeight: 1.4 }}>{store.desc}</div>
                </div>
                {busy && <div className="spinner" style={{ width: 16, height: 16 }} />}
                {store.available && !busy && <span style={{ color: THEME.faint, fontSize: 18 }}>›</span>}
              </button>
            );
          })}
          <div style={{ fontSize: 11, color: THEME.faint, lineHeight: 1.5, marginTop: 4 }}>
            Walmart and Amazon Fresh open a search — no account needed. Instacart and Kroger create a full cart.
          </div>
        </div>
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
