import { useState, useEffect } from 'react';

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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontSize: 18, fontWeight: 700 }}>🔔 Notifications</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
            Connect ntfy to get push notifications when recipes are generated. A weekly cron runs every Sunday at 6pm and auto-generates new options.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>ntfy server URL</div>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://ntfy.sh" style={{ width: '100%' }} />
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Use ntfy.sh or your self-hosted instance</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Topic</div>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="meal-planner-gatlin" style={{ width: '100%' }} />
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Subscribe to this topic in the ntfy app</div>
            </div>
          </div>

          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>📅 Weekly schedule</div>
            <div style={{ color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Every Sunday at 6pm CT — generates 2 breakfasts, 2 lunches, 3 dinners, 2 snacks and sends a push notification linking back to the app.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={test} disabled={testing || !url.trim() || !topic.trim()}>
              {testing ? 'Sending…' : '🔔 Send Test'}
            </button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
