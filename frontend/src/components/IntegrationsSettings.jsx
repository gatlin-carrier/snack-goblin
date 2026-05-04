import { useState, useEffect } from 'react';

export default function IntegrationsSettings({ onClose, showToast }) {
  const [pexelsKey, setPexelsKey] = useState('');
  const [pexelsConfigured, setPexelsConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState({ in_progress: false, remaining: 0 });
  const [backfilling, setBackfilling] = useState(false);
  const [priceStatus, setPriceStatus] = useState({ in_progress: false, remaining: 0 });
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  useEffect(() => { load(); }, []);

  // Poll backfill status every 3s while in progress
  useEffect(() => {
    if (!backfillStatus.in_progress) return;
    const id = setInterval(async () => {
      const s = await fetch('/api/recipes/backfill-images/status').then(r => r.json());
      setBackfillStatus(s);
      if (!s.in_progress) {
        setBackfilling(false);
        showToast('Image backfill complete');
      }
    }, 3000);
    return () => clearInterval(id);
  }, [backfillStatus.in_progress]);

  // Poll price refresh status
  useEffect(() => {
    if (!priceStatus.in_progress) return;
    const id = setInterval(async () => {
      const s = await fetch('/api/recipes/refresh-prices/status').then(r => r.json());
      setPriceStatus(s);
      if (!s.in_progress) {
        setRefreshingPrices(false);
        showToast('Price refresh complete');
      }
    }, 4000);
    return () => clearInterval(id);
  }, [priceStatus.in_progress]);

  async function load() {
    const [c, s, p] = await Promise.all([
      fetch('/api/pexels/configured').then(r => r.json()),
      fetch('/api/recipes/backfill-images/status').then(r => r.json()),
      fetch('/api/recipes/refresh-prices/status').then(r => r.json()),
    ]);
    setPexelsConfigured(c.configured);
    setBackfillStatus(s);
    setPriceStatus(p);
  }

  async function refreshPrices() {
    setRefreshingPrices(true);
    const res = await fetch('/api/recipes/refresh-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ only_missing: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Refresh failed');
      setRefreshingPrices(false);
      return;
    }
    showToast(`Pricing ${data.queued} recipes via Claude…`);
    setPriceStatus({ in_progress: true, remaining: data.queued });
  }

  async function savePexelsKey() {
    if (!pexelsKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pexels_api_key: pexelsKey.trim() }),
      });
      if (!res.ok) { showToast('Failed to save key'); return; }
      setPexelsKey('');
      setPexelsConfigured(true);
      showToast('Pexels API key saved');
    } finally { setSaving(false); }
  }

  async function startBackfill() {
    setBackfilling(true);
    const res = await fetch('/api/recipes/backfill-images', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Backfill failed');
      setBackfilling(false);
      return;
    }
    showToast(`Fetching images for ${data.queued} recipes…`);
    setBackfillStatus({ in_progress: true, remaining: data.queued });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontSize: 18, fontWeight: 700 }}>🔌 Integrations</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* Pexels */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>📸 Pexels</div>
              {pexelsConfigured ? (
                <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>● Connected</span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>○ Not configured</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 12 }}>
              Free food photography for recipe cards. Get a free API key at{' '}
              <a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>pexels.com/api</a>
              {' '}— 200 requests/hour, plenty for personal use.
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                type="password"
                value={pexelsKey}
                onChange={e => setPexelsKey(e.target.value)}
                placeholder={pexelsConfigured ? '•••••••• (saved)' : 'Paste your Pexels API key…'}
                style={{ flex: 1, fontSize: 13 }}
              />
              <button
                className="btn-primary"
                onClick={savePexelsKey}
                disabled={!pexelsKey.trim() || saving}
                style={{ fontSize: 13, padding: '8px 14px' }}
              >
                {saving ? '…' : 'Save'}
              </button>
            </div>

            {pexelsConfigured && (
              <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                  {backfillStatus.remaining > 0
                    ? `${backfillStatus.remaining} recipe${backfillStatus.remaining !== 1 ? 's' : ''} without images`
                    : 'All recipes have images'}
                </div>
                {backfillStatus.remaining > 0 && (
                  <button
                    className="btn-ghost"
                    onClick={startBackfill}
                    disabled={backfilling || backfillStatus.in_progress}
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    {backfilling || backfillStatus.in_progress ? '⏳ Fetching…' : '✨ Fetch images now'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Price refresh via Claude web search */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>💰 Recipe pricing</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 12 }}>
              Estimates per-serving cost using Claude with live web search. Use this when recipes were generated by a local model (which can't search current prices) or to refresh stale estimates.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
              {priceStatus.remaining > 0
                ? `${priceStatus.remaining} recipe${priceStatus.remaining !== 1 ? 's' : ''} without prices`
                : 'All recipes have prices'}
            </div>
            <button
              className="btn-ghost"
              onClick={refreshPrices}
              disabled={refreshingPrices || priceStatus.in_progress || priceStatus.remaining === 0}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              {refreshingPrices || priceStatus.in_progress ? '⏳ Pricing…' : '✨ Fetch prices now'}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Photos are fetched once per recipe and cached. Photographer attribution is preserved per Pexels guidelines.
            Prices use current 2026 US grocery data via web search.
          </div>
        </div>
      </div>
    </div>
  );
}
