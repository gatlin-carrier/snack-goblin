import { useState, useEffect } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

export default function IntegrationsSettings({ onClose, showToast }) {
  const [pexelsKey, setPexelsKey] = useState('');
  const [pexelsConfigured, setPexelsConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState({ in_progress: false, remaining: 0 });
  const [backfilling, setBackfilling] = useState(false);
  const [priceStatus, setPriceStatus] = useState({ in_progress: false, remaining: 0 });
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [krogerStatus, setKrogerStatus] = useState({ connected: false, configured: false });

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!backfillStatus.in_progress) return;
    const id = setInterval(async () => {
      const s = await fetch('/api/recipes/backfill-images/status').then(r => r.json());
      setBackfillStatus(s);
      if (!s.in_progress) {
        setBackfilling(false);
        showToast('every recipe has a face now');
      }
    }, 3000);
    return () => clearInterval(id);
  }, [backfillStatus.in_progress]);

  useEffect(() => {
    if (!priceStatus.in_progress) return;
    const id = setInterval(async () => {
      const s = await fetch('/api/recipes/refresh-prices/status').then(r => r.json());
      setPriceStatus(s);
      if (!s.in_progress) {
        setRefreshingPrices(false);
        showToast('prices refreshed');
      }
    }, 4000);
    return () => clearInterval(id);
  }, [priceStatus.in_progress]);

  async function load() {
    const [c, s, p, k] = await Promise.all([
      fetch('/api/pexels/configured').then(r => r.json()),
      fetch('/api/recipes/backfill-images/status').then(r => r.json()),
      fetch('/api/recipes/refresh-prices/status').then(r => r.json()),
      fetch('/api/retailer/kroger/status').then(r => r.json()).catch(() => ({ connected: false, configured: false })),
    ]);
    setPexelsConfigured(c.configured);
    setBackfillStatus(s);
    setPriceStatus(p);
    setKrogerStatus(k);
  }

  function connectKroger() {
    window.location.href = '/api/auth/kroger';
  }

  async function disconnectKroger() {
    await fetch('/api/auth/kroger/disconnect', { method: 'POST' });
    setKrogerStatus(s => ({ ...s, connected: false }));
    showToast('Kroger account disconnected');
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
    showToast(`pricing ${data.queued} recipes via Claude…`);
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
      showToast('Pexels key saved');
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
    showToast(`fetching images for ${data.queued} recipes…`);
    setBackfillStatus({ in_progress: true, remaining: data.queued });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>🔌 Integrations</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          <Glass padding={18} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: THEME.ink }}>📸 Pexels</div>
              {pexelsConfigured ? (
                <span style={{ fontSize: 11, color: THEME.sage, fontWeight: 700, letterSpacing: '0.06em' }}>● Connected</span>
              ) : (
                <span style={{ fontSize: 11, color: THEME.faint, letterSpacing: '0.06em' }}>○ Not configured</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.55, marginBottom: 14 }}>
              Free food photography for recipe cards. Get a free API key at{' '}
              <a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" style={{ color: THEME.accent, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>pexels.com/api</a>
              {' '}— 200 requests/hour, plenty for personal use.
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="password"
                value={pexelsKey}
                onChange={e => setPexelsKey(e.target.value)}
                placeholder={pexelsConfigured ? '•••••••• (saved)' : 'Paste your Pexels API key…'}
                style={{ flex: 1, fontSize: 13 }}
              />
              <button
                style={{ ...glassBtnPrimary, fontSize: 13, padding: '8px 16px', opacity: (!pexelsKey.trim() || saving) ? 0.5 : 1 }}
                onClick={savePexelsKey}
                disabled={!pexelsKey.trim() || saving}
              >
                {saving ? '…' : 'Save'}
              </button>
            </div>

            {pexelsConfigured && (
              <div style={{ paddingTop: 12, borderTop: `1px solid ${THEME.hairline}` }}>
                <div style={{ fontSize: 12, color: THEME.dim, marginBottom: 10 }}>
                  {backfillStatus.remaining > 0
                    ? <><span style={{ color: THEME.ink, fontWeight: 700 }}>{backfillStatus.remaining}</span> recipe{backfillStatus.remaining !== 1 ? 's' : ''} without images</>
                    : 'All recipes have images'}
                </div>
                {backfillStatus.remaining > 0 && (
                  <button
                    style={{ ...glassBtnGhost, fontSize: 12, padding: '6px 14px', opacity: (backfilling || backfillStatus.in_progress) ? 0.5 : 1 }}
                    onClick={startBackfill}
                    disabled={backfilling || backfillStatus.in_progress}
                  >
                    {backfilling || backfillStatus.in_progress ? '⏳ Fetching…' : '✨ Fetch images now'}
                  </button>
                )}
              </div>
            )}
          </Glass>

          <Glass padding={18} style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: THEME.ink, marginBottom: 8 }}>💰 Recipe pricing</div>
            <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.55, marginBottom: 14 }}>
              Estimates per-serving cost using Claude with live web search. Use this when recipes were generated by a local model (which can't search current prices) or to refresh stale estimates.
            </div>
            <div style={{ fontSize: 12, color: THEME.dim, marginBottom: 10 }}>
              {priceStatus.remaining > 0
                ? <><span style={{ color: THEME.ink, fontWeight: 700 }}>{priceStatus.remaining}</span> recipe{priceStatus.remaining !== 1 ? 's' : ''} without prices</>
                : 'All recipes have prices'}
            </div>
            <button
              style={{ ...glassBtnGhost, fontSize: 12, padding: '6px 14px', opacity: (refreshingPrices || priceStatus.in_progress || priceStatus.remaining === 0) ? 0.5 : 1 }}
              onClick={refreshPrices}
              disabled={refreshingPrices || priceStatus.in_progress || priceStatus.remaining === 0}
            >
              {refreshingPrices || priceStatus.in_progress ? '⏳ Pricing…' : '✨ Fetch prices now'}
            </button>
          </Glass>

          <Glass padding={18} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: THEME.ink }}>🛍 Kroger</div>
              {krogerStatus.connected ? (
                <span style={{ fontSize: 11, color: THEME.sage, fontWeight: 700, letterSpacing: '0.06em' }}>● Connected</span>
              ) : (
                <span style={{ fontSize: 11, color: THEME.faint, letterSpacing: '0.06em' }}>○ Not connected</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.55, marginBottom: 14 }}>
              Push your shopping list directly to your Kroger cart. Requires a free Kroger developer account —{' '}
              register at <a href="https://developer.kroger.com" target="_blank" rel="noreferrer" style={{ color: THEME.accent, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>developer.kroger.com</a>{' '}
              and add <code style={{ fontSize: 11, background: 'oklch(0 0 0 / 0.06)', padding: '1px 5px', borderRadius: 4 }}>KROGER_CLIENT_ID</code> and{' '}
              <code style={{ fontSize: 11, background: 'oklch(0 0 0 / 0.06)', padding: '1px 5px', borderRadius: 4 }}>KROGER_CLIENT_SECRET</code> to your <code style={{ fontSize: 11, background: 'oklch(0 0 0 / 0.06)', padding: '1px 5px', borderRadius: 4 }}>.env</code>.
            </div>
            {!krogerStatus.configured ? (
              <div style={{ fontSize: 12, color: THEME.faint, fontStyle: 'italic' }}>
                Environment variables not set — add them and redeploy to enable.
              </div>
            ) : krogerStatus.connected ? (
              <button
                style={{ ...glassBtnGhost, fontSize: 12, padding: '6px 14px', color: THEME.red }}
                onClick={disconnectKroger}
              >
                Disconnect Kroger account
              </button>
            ) : (
              <button
                style={{ ...glassBtnGhost, fontSize: 12, padding: '6px 14px' }}
                onClick={connectKroger}
              >
                Connect Kroger account →
              </button>
            )}
          </Glass>

          <div style={{ fontSize: 11, color: THEME.faint, lineHeight: 1.55 }}>
            Photos are fetched once per recipe and cached. Photographer attribution is preserved per Pexels guidelines.
            Prices use current 2026 US grocery data via web search.
          </div>
        </div>
      </div>
    </div>
  );
}
