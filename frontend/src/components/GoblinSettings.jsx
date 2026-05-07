import { useState } from 'react';
import { display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';
import { usePrefs } from '../lib/prefs.jsx';
import Goblin from './Goblin.jsx';

export default function GoblinSettings({ onClose, showToast }) {
  const { prefs, update } = usePrefs();
  const [name, setName] = useState(prefs.goblin_name === 'the goblin' ? '' : (prefs.goblin_name || ''));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const next = name.trim();
      const res = await fetch('/api/user-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goblin_name: next }),
      });
      const data = await res.json();
      if (data.error) { showToast?.(data.error); return; }
      await update({});
      showToast?.(next ? `meet ${next}.` : "back to 'the goblin'.");
      onClose();
    } finally { setSaving(false); }
  }

  const previewName = name.trim() || 'the goblin';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2" style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', fontWeight: 500 }}>
            <Goblin state="idle" size={24} />
            <span className="text-ink">The goblin</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
            <Goblin state="idle" size={64} name={previewName} />
            <div>
              <div style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', lineHeight: 1.1 }} className="text-ink">
                {previewName}
              </div>
              <div className="text-[12px] text-dim mt-1">
                {previewName}'s looking at you funny.
              </div>
            </div>
          </div>

          <div className="text-[11px] text-dim font-bold uppercase tracking-[0.08em] mb-1.5">
            Name
          </div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={24}
            placeholder="the goblin"
            style={{ width: '100%', marginBottom: 6 }}
          />
          <div className="text-[11px] text-faint mb-4" style={{ lineHeight: 1.5 }}>
            up to 24 characters. letters, numbers, spaces, hyphens, and apostrophes only. keep it family-friendly — the goblin lives in front of a kid.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...glassBtnGhost, flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              style={{ ...glassBtnPrimary, flex: 2, opacity: saving ? 0.5 : 1 }}
              onClick={save}
              disabled={saving}
            >{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
