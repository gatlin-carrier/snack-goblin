import { useState, useEffect } from 'react';
import BarcodeScanner from './BarcodeScanner.jsx';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const FOOD_CATEGORIES = [
  { key: 'produce', label: '🥦 Produce' },
  { key: 'meat',    label: '🥩 Meat & Poultry' },
  { key: 'seafood', label: '🐟 Seafood' },
  { key: 'dairy',   label: '🧀 Dairy & Eggs' },
  { key: 'pantry',  label: '🫙 Pantry & Dry Goods' },
  { key: 'frozen',  label: '🧊 Frozen' },
  { key: 'bakery',  label: '🍞 Bakery' },
];

const COMMON_UNITS = ['', 'g', 'kg', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'ml', 'L', 'can', 'bunch', 'head', 'piece', 'pkg'];

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

function AddFoodForm({ onAdd, prefill, onScanRequest }) {
  const [name, setName] = useState(prefill?.name || '');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState(prefill?.category || 'pantry');
  const [expiry, setExpiry] = useState('');
  const [lowStock, setLowStock] = useState('');

  useEffect(() => {
    if (prefill?.name) { setName(prefill.name); setCategory(prefill.category || 'pantry'); }
  }, [prefill]);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ ingredient_name: name.trim(), quantity: qty ? parseFloat(qty) : null, unit, category, expiry_date: expiry || null, low_stock_threshold: lowStock ? parseFloat(lowStock) : null });
    setName(''); setQty(''); setUnit(''); setCategory('pantry'); setExpiry(''); setLowStock('');
  }

  return (
    <Glass padding={16} style={{ marginBottom: 22 }}>
      <form onSubmit={submit}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <FieldLabel>Item name</FieldLabel>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. chickpeas" style={{ width: '100%' }} required />
          </div>
          <div style={{ width: 80 }}>
            <FieldLabel>Qty</FieldLabel>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="—" style={{ width: '100%' }} min="0" step="any" />
          </div>
          <div style={{ width: 90 }}>
            <FieldLabel>Unit</FieldLabel>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: '100%' }}>
              {COMMON_UNITS.map(u => <option key={u} value={u}>{u || '—'}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <FieldLabel>Category</FieldLabel>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%' }}>
              {FOOD_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <FieldLabel>Expiry (optional)</FieldLabel>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <FieldLabel>Low-stock alert</FieldLabel>
            <input type="number" value={lowStock} onChange={e => setLowStock(e.target.value)} placeholder="—" style={{ width: '100%' }} min="0" step="any" />
          </div>
          {onScanRequest && (
            <button type="button" style={{ ...glassBtnGhost, flexShrink: 0, padding: '9px 14px' }} onClick={onScanRequest} title="Scan barcode">📷</button>
          )}
          <button style={glassBtnPrimary} type="submit">+ Add</button>
        </div>
      </form>
    </Glass>
  );
}

function AddEquipmentForm({ onAdd }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), notes });
    setName(''); setNotes('');
  }

  return (
    <Glass padding={16} style={{ marginBottom: 22 }}>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <FieldLabel>Equipment name</FieldLabel>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rice cooker" style={{ width: '100%' }} required />
        </div>
        <div style={{ flex: 3, minWidth: 200 }}>
          <FieldLabel>Notes (optional)</FieldLabel>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 6-cup capacity, makes perfect rice" style={{ width: '100%' }} />
        </div>
        <button style={glassBtnPrimary} type="submit">+ Add</button>
      </form>
    </Glass>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <Glass padding={40} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', color: THEME.ink, marginBottom: 8 }}>{title}</div>
      <div style={{ color: THEME.dim, fontSize: 13, lineHeight: 1.55 }}>{body}</div>
    </Glass>
  );
}

export default function PantryManager({ showToast }) {
  const [tab, setTab] = useState('food');
  const [food, setFood] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [freezer, setFreezer] = useState([]);
  const [newFreezerName, setNewFreezerName] = useState('');
  const [newFreezerServings, setNewFreezerServings] = useState(2);
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanPrefill, setScanPrefill] = useState(null);

  useEffect(() => {
    loadFood();
    loadEquipment();
    loadFreezer();
  }, []);

  async function loadFood() {
    const res = await fetch('/api/pantry');
    setFood(await res.json());
  }
  async function loadEquipment() {
    const res = await fetch('/api/equipment');
    setEquipment(await res.json());
  }
  async function loadFreezer() {
    const res = await fetch('/api/freezer');
    setFreezer(await res.json());
  }
  async function addFreezerItem() {
    if (!newFreezerName.trim()) return;
    await fetch('/api/freezer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_name: newFreezerName.trim(), servings: newFreezerServings }),
    });
    setNewFreezerName(''); setNewFreezerServings(2);
    loadFreezer();
    showToast('on ice. future-you says thanks.');
  }
  async function removeFreezerItem(id, name) {
    await fetch(`/api/freezer/${id}`, { method: 'DELETE' });
    setFreezer(f => f.filter(i => i.id !== id));
    showToast(`tossed ${name}`);
  }
  async function addFood(item) {
    const res = await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) { loadFood(); showToast(`stashed ${item.ingredient_name}`); }
  }
  async function removeFood(id, name) {
    await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
    setFood(f => f.filter(i => i.id !== id));
    showToast(`tossed ${name}`);
  }
  async function addEquipment(item) {
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) { loadEquipment(); showToast(`logged ${item.name}`); }
    else { const d = await res.json(); showToast(d.error || "couldn't add that one"); }
  }
  async function removeEquipment(id, name) {
    await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
    setEquipment(e => e.filter(i => i.id !== id));
    showToast(`tossed ${name}`);
  }

  const filteredFood = food.filter(i => !search || i.ingredient_name.toLowerCase().includes(search.toLowerCase()));
  const byCategory = {};
  for (const item of filteredFood) {
    const cat = item.category || 'pantry';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  }
  const filteredEquipment = equipment.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{
            fontSize: 11, color: THEME.accent, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6,
          }}>What's on hand</div>
          <div style={{
            fontFamily: display, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
            color: THEME.ink, lineHeight: 1.05, letterSpacing: '-0.01em',
          }}>Pantry</div>
          <div style={{ fontSize: 13, color: THEME.dim, marginTop: 6 }}>
            <span style={{ color: THEME.ink, fontFamily: display, fontStyle: 'italic', fontWeight: 500, fontSize: 18, marginRight: 4 }}>{food.length}</span>
            <span style={{ marginRight: 10 }}>food items</span>
            <span style={{ color: THEME.ink, fontFamily: display, fontStyle: 'italic', fontWeight: 500, fontSize: 18, marginRight: 4 }}>{equipment.length}</span>
            equipment
          </div>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ width: 200, fontSize: 13 }}
        />
      </div>

      <div style={{
        display: 'flex', gap: 2, alignSelf: 'flex-start',
        background: 'oklch(1 0 0 / 0.45)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 999, padding: 3, marginBottom: 22,
        boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.16)',
      }}>
        {[
          { key: 'food',      label: '🥫 Food' },
          { key: 'freezer',   label: '🧊 Freezer' },
          { key: 'equipment', label: '🔧 Equipment' },
        ].map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                background: active
                  ? `linear-gradient(180deg, color-mix(in oklch, ${THEME.accent} 80%, white 20%), ${THEME.accent})`
                  : 'transparent',
                color: active ? 'white' : THEME.dim,
                border: 'none', borderRadius: 999, padding: '6px 16px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: active ? '0 2px 6px -2px oklch(0.55 0.16 35 / 0.5)' : 'none',
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'freezer' ? (
        <>
          <Glass padding={16} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <FieldLabel>Recipe name</FieldLabel>
                <input
                  placeholder="e.g. Turkey Meatballs"
                  value={newFreezerName}
                  onChange={e => setNewFreezerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addFreezerItem()}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ width: 90 }}>
                <FieldLabel>Servings</FieldLabel>
                <input
                  type="number" min="1" max="20"
                  value={newFreezerServings}
                  onChange={e => setNewFreezerServings(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <button style={{ ...glassBtnPrimary, opacity: !newFreezerName.trim() ? 0.5 : 1 }} onClick={addFreezerItem} disabled={!newFreezerName.trim()}>+ Freeze</button>
            </div>
          </Glass>

          {freezer.length === 0 ? (
            <EmptyState icon="🧊" title="nothing on ice"
              body="future-you will thank present-you. log batch-cooked meals here and i'll remind you before they expire." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {freezer.map(item => {
                const daysLeft = Math.ceil((new Date(item.use_by_date) - new Date()) / 86400000);
                const urgent = daysLeft <= 14;
                return (
                  <Glass key={item.id} padding={14} tint={urgent ? 'oklch(0.68 0.13 80 / 0.16)' : null} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 24 }}>🧊</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>{item.recipe_name}</div>
                      <div style={{ fontSize: 12, color: THEME.dim, marginTop: 2 }}>
                        {item.servings} serving{item.servings !== 1 ? 's' : ''} · frozen {item.frozen_date}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: urgent ? 'oklch(0.45 0.13 80)' : THEME.dim,
                      }}>{daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}</div>
                      <div style={{ fontSize: 11, color: THEME.faint, marginTop: 2 }}>use by {item.use_by_date}</div>
                    </div>
                    <button onClick={() => removeFreezerItem(item.id, item.recipe_name)}
                      style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 18, padding: '2px 6px' }}>✕</button>
                  </Glass>
                );
              })}
            </div>
          )}
        </>
      ) : tab === 'food' ? (
        <>
          <AddFoodForm onAdd={addFood} prefill={scanPrefill} onScanRequest={() => setShowScanner(true)} />
          {showScanner && (
            <BarcodeScanner
              onScanned={result => { setScanPrefill(result); setShowScanner(false); showToast(`found it: ${result.name}`); }}
              onClose={() => setShowScanner(false)}
            />
          )}

          {Object.keys(byCategory).length === 0 && (
            <EmptyState icon="🫙" title="the stash is bare"
              body="toss something in. the shopping list will subtract whatever you've already got." />
          )}

          {FOOD_CATEGORIES.filter(c => byCategory[c.key]?.length).map(cat => (
            <div key={cat.key} style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: THEME.accent,
                letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12,
              }}>{cat.label}</div>
              <Glass padding={4}>
                {byCategory[cat.key].map((item, i) => {
                  const daysToExpiry = item.expiry_date ? Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000) : null;
                  const isLowStock = item.low_stock_threshold != null && item.quantity != null && item.quantity <= item.low_stock_threshold;
                  const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 7;
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px',
                      borderTop: i > 0 ? `1px solid ${THEME.hairline}` : 'none',
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: THEME.ink }}>{item.ingredient_name}</span>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          {isLowStock && <Badge tone="yellow">⚠ Low stock</Badge>}
                          {isExpiringSoon && (
                            daysToExpiry <= 0
                              ? <Badge tone="rust">🔴 Expired</Badge>
                              : <Badge tone="yellow">🟡 {daysToExpiry}d left</Badge>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: THEME.dim, textAlign: 'right', minWidth: 80, fontVariantNumeric: 'tabular-nums' }}>
                        {item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : '—'}
                      </div>
                      <button
                        onClick={() => removeFood(item.id, item.ingredient_name)}
                        style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 16, padding: '2px 6px', lineHeight: 1 }}
                        title="Remove">✕</button>
                    </div>
                  );
                })}
              </Glass>
            </div>
          ))}
        </>
      ) : (
        <>
          <AddEquipmentForm onAdd={addEquipment} />

          {filteredEquipment.length === 0 ? (
            <EmptyState icon="🔧" title="no tools logged"
              body="tell me what you've got. i'll suggest recipes that actually use them." />
          ) : (
            <Glass padding={4}>
              {filteredEquipment.map((item, i) => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                  borderTop: i > 0 ? `1px solid ${THEME.hairline}` : 'none',
                }}>
                  <div style={{ fontSize: 22 }}>🔧</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>{item.name}</div>
                    {item.notes && <div style={{ fontSize: 12, color: THEME.dim, marginTop: 2 }}>{item.notes}</div>}
                  </div>
                  <button
                    onClick={() => removeEquipment(item.id, item.name)}
                    style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 16, padding: '2px 6px', lineHeight: 1 }}
                    title="Remove">✕</button>
                </div>
              ))}
            </Glass>
          )}
        </>
      )}
    </div>
  );
}
