import { useState, useEffect } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

export default function NtfySettings({ onClose, showToast }) {
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setUrl(s.ntfy_url || '');
      setTopic(s.ntfy_topic || '');
    });
  }, []);

  async function save() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ntfy_url: url.trim(), ntfy_topic: topic.trim() }),
    });
    setSaving(false);
    showToast('Notification settings saved');
    onClose();
  }

  async function test() {
    setTesting(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ntfy_url: url.trim(), ntfy_topic: topic.trim() }),
      });
      const res = await fetch('/api/notify/test', { method: 'POST' });
      const data = await res.json();
      showToast(data.ok ? '✓ Test notification sent!' : `Failed: ${data.error}`);
    } catch (e) { showToast('Failed to send test'); }
    setTesting(false);
  }

  const valid = url.trim() && topic.trim();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>🔔 Notifications</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: THEME.text, marginBottom: 22, lineHeight: 1.6 }}>
            Connect ntfy to get push notifications when recipes are generated. A weekly cron runs every Sunday at 6pm and auto-generates new options.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 22 }}>
            <div>
              <FieldLabel>Ntfy server URL</FieldLabel>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://ntfy.sh" style={{ width: '100%' }} />
              <div style={{ fontSize: 11, color: THEME.faint, marginTop: 5 }}>Use ntfy.sh or your self-hosted instance</div>
            </div>
            <div>
              <FieldLabel>Topic</FieldLabel>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="meal-planner-gatlin" style={{ width: '100%' }} />
              <div style={{ fontSize: 11, color: THEME.faint, marginTop: 5 }}>Subscribe to this topic in the ntfy app</div>
            </div>
          </div>

          <Glass tint="oklch(0.78 0.09 30 / 0.18)" padding={14} style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: THEME.accent,
              letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8,
            }}>📅 Weekly schedule</div>
            <div style={{ color: THEME.text, lineHeight: 1.6, fontSize: 13 }}>
              Every Sunday at 6pm CT — generates 2 breakfasts, 2 lunches, 3 dinners, 2 snacks and sends a push notification linking back to the app.
            </div>
          </Glass>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...glassBtnGhost, flex: 1, opacity: (testing || !valid) ? 0.5 : 1 }} onClick={test} disabled={testing || !valid}>
              {testing ? 'Sending…' : '🔔 Send test'}
            </button>
            <button style={{ ...glassBtnPrimary, flex: 2, opacity: saving ? 0.5 : 1 }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
