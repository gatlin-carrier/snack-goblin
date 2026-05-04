import { useState, useEffect } from 'react';
import BarcodeScanner from './BarcodeScanner.jsx';

const FOOD_CATEGORIES = [
  { key: 'produce', label: '🥦 Produce' },
  { key: 'meat', label: '🥩 Meat & Poultry' },
  { key: 'seafood', label: '🐟 Seafood' },
  { key: 'dairy', label: '🧀 Dairy & Eggs' },
  { key: 'pantry', label: '🫙 Pantry & Dry Goods' },
  { key: 'frozen', label: '🧊 Frozen' },
  { key: 'bakery', label: '🍞 Bakery' },
];

const COMMON_UNITS = ['', 'g', 'kg', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'ml', 'L', 'can', 'bunch', 'head', 'piece', 'pkg'];

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
    <form onSubmit={submit} style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
        <div style={{ flex: 2, minWidth: 140 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Item name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. chickpeas" style={{ width: '100%' }} required />
        </div>
        <div style={{ width: 70 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Qty</div>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="—" style={{ width: '100%' }} min="0" step="any" />
        </div>
        <div style={{ width: 80 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Unit</div>
          <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: '100%' }}>
            {COMMON_UNITS.map(u => <option key={u} value={u}>{u || '—'}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Category</div>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%' }}>
            {FOOD_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Expiry date (optional)</div>
          <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ width: 120 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Low-stock alert</div>
          <input type="number" value={lowStock} onChange={e => setLowStock(e.target.value)} placeholder="—" style={{ width: '100%' }} min="0" step="any" />
        </div>
        {onScanRequest && (
          <button type="button" className="btn-ghost" style={{ flexShrink: 0, padding: '8px 12px' }} onClick={onScanRequest} title="Scan barcode">📷</button>
        )}
        <button className="btn-primary" type="submit" style={{ flexShrink: 0 }}>+ Add</button>
      </div>
    </form>
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
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
      <div style={{ flex: 2, minWidth: 160 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Equipment name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rice cooker" style={{ width: '100%' }} required />
      </div>
      <div style={{ flex: 3, minWidth: 160 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Notes (optional)</div>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 6-cup capacity, makes perfect rice" style={{ width: '100%' }} />
      </div>
      <button className="btn-primary" type="submit" style={{ flexShrink: 0 }}>+ Add</button>
    </form>
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
    showToast(`Added to freezer`);
  }

  async function removeFreezerItem(id, name) {
    await fetch(`/api/freezer/${id}`, { method: 'DELETE' });
    setFreezer(f => f.filter(i => i.id !== id));
    showToast(`Removed ${name}`);
  }

  async function addFood(item) {
    const res = await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) { loadFood(); showToast(`Added ${item.ingredient_name}`); }
  }

  async function removeFood(id, name) {
    await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
    setFood(f => f.filter(i => i.id !== id));
    showToast(`Removed ${name}`);
  }

  async function addEquipment(item) {
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) { loadEquipment(); showToast(`Added ${item.name}`); }
    else { const d = await res.json(); showToast(d.error || 'Error'); }
  }

  async function removeEquipment(id, name) {
    await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
    setEquipment(e => e.filter(i => i.id !== id));
    showToast(`Removed ${name}`);
  }

  // Group food by category
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
          <div className="page-title">Pantry</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            {food.length} food items · {equipment.length} equipment
          </div>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ width: 180, fontSize: 13 }}
        />
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 10, padding: 4, marginBottom: 24, alignSelf: 'flex-start' }}>
        {[{ key: 'food', label: '🥫 Food' }, { key: 'freezer', label: '🧊 Freezer' }, { key: 'equipment', label: '🔧 Equipment' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ background: tab === t.key ? 'var(--accent)' : 'transparent',
                     color: tab === t.key ? 'white' : 'var(--text-dim)',
                     border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'freezer' ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <input
              placeholder="Recipe name (e.g. Turkey Meatballs)"
              value={newFreezerName}
              onChange={e => setNewFreezerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFreezerItem()}
              style={{ flex: 2, minWidth: 180 }}
            />
            <input
              type="number" min="1" max="20"
              value={newFreezerServings}
              onChange={e => setNewFreezerServings(Number(e.target.value))}
              style={{ width: 70 }}
              placeholder="Servings"
            />
            <button className="btn-primary" onClick={addFreezerItem} disabled={!newFreezerName.trim()}>+ Freeze</button>
          </div>

          {freezer.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🧊</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Freezer is empty</div>
              <div style={{ fontSize: 13 }}>Log batch-cooked meals you've frozen — the dashboard will remind you before they expire.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {freezer.map(item => {
                const daysLeft = Math.ceil((new Date(item.use_by_date) - new Date()) / 86400000);
                const urgent = daysLeft <= 14;
                return (
                  <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderColor: urgent ? 'rgba(250,204,21,0.3)' : 'var(--glass-border)' }}>
                    <div style={{ fontSize: 22 }}>🧊</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.recipe_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                        {item.servings} serving{item.servings !== 1 ? 's' : ''} · frozen {item.frozen_date}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: urgent ? 'var(--yellow)' : 'var(--text-dim)' }}>
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>use by {item.use_by_date}</div>
                    </div>
                    <button onClick={() => removeFreezerItem(item.id, item.recipe_name)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, padding: '2px 6px' }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : tab === 'food' ? (
        <>
          <AddFoodForm onAdd={addFood} prefill={scanPrefill}
            onScanRequest={() => setShowScanner(true)} />
          {showScanner && (
            <BarcodeScanner
              onScanned={result => { setScanPrefill(result); setShowScanner(false); showToast(`Found: ${result.name}`); }}
              onClose={() => setShowScanner(false)}
            />
          )}

          {Object.keys(byCategory).length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🫙</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Pantry is empty</div>
              <div style={{ fontSize: 13 }}>Add staples you have on hand — the shopping list will subtract them.</div>
            </div>
          )}

          {FOOD_CATEGORIES.filter(c => byCategory[c.key]?.length).map(cat => (
            <div key={cat.key} style={{ marginBottom: 20 }}>
              <div className="section-title">{cat.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {byCategory[cat.key].map(item => {
                  const daysToExpiry = item.expiry_date ? Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000) : null;
                  const isLowStock = item.low_stock_threshold != null && item.quantity != null && item.quantity <= item.low_stock_threshold;
                  const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 7;
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{item.ingredient_name}</span>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                          {isLowStock && <span style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 600 }}>⚠️ Low stock</span>}
                          {isExpiringSoon && <span style={{ fontSize: 11, color: daysToExpiry <= 2 ? 'var(--red)' : 'var(--yellow)', fontWeight: 600 }}>
                            {daysToExpiry <= 0 ? '🔴 Expired' : `🟡 Expires in ${daysToExpiry}d`}
                          </span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'right', minWidth: 80 }}>
                        {item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : '—'}
                      </div>
                      <button
                        onClick={() => removeFood(item.id, item.ingredient_name)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
                                 fontSize: 16, padding: '2px 6px', lineHeight: 1 }}
                        title="Remove">✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          <AddEquipmentForm onAdd={addEquipment} />

          {filteredEquipment.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔧</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No equipment logged</div>
              <div style={{ fontSize: 13 }}>Add appliances and tools — Claude will suggest recipes that use them.</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredEquipment.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 20 }}>🔧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  {item.notes && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{item.notes}</div>}
                </div>
                <button
                  onClick={() => removeEquipment(item.id, item.name)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
                           fontSize: 16, padding: '2px 6px', lineHeight: 1 }}
                  title="Remove">✕</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
