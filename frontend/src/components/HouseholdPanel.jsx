import { useState, useEffect } from 'react';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

export default function HouseholdPanel({ onClose, showToast }) {
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetch('/api/household')
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else { setHousehold(data); setName(data.name || ''); }
      })
      .finally(() => setLoading(false));
  }, []);

  const isFounder = household?.members?.find(m => m.role === 'founder');

  async function rename() {
    setSavingName(true);
    const res = await fetch('/api/household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setSavingName(false);
    if (res.ok) { setHousehold(data); showToast('renamed.'); }
    else showToast(data.error || "couldn't rename");
  }

  async function invite() {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
    setInviting(true);
    const res = await fetch('/api/household/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), display_name: inviteName.trim() }),
    });
    const data = await res.json();
    setInviting(false);
    if (res.ok) {
      setHousehold(data);
      setInviteEmail('');
      setInviteName('');
      showToast(`${inviteEmail} can join now. tell them to sign in.`);
    } else {
      showToast(data.error || "couldn't invite");
    }
  }

  async function removeMember(member) {
    if (!confirm(`remove ${member.email}?`)) return;
    const res = await fetch(`/api/household/members/${member.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) { setHousehold(data); showToast(`${member.email} removed.`); }
    else showToast(data.error || "couldn't remove");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontFamily: display, fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: THEME.ink }}>
            🏠 the den
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {loading ? (
            <div style={{ display: 'flex', gap: 10, color: THEME.dim, padding: '20px 0' }}>
              <div className="spinner" /> loading…
            </div>
          ) : error ? (
            <Glass tint="oklch(0.55 0.18 25 / 0.18)" padding={12}>
              <div style={{ color: THEME.red, fontSize: 13 }}>⚠ {error}</div>
            </Glass>
          ) : household ? (
            <>
              <div style={{ fontSize: 13, color: THEME.text, marginBottom: 22, lineHeight: 1.6 }}>
                everyone in here sees the same recipes, plan, pantry, and shopping list. each member has their own login + their own personal prefs (energy, mood, goals).
              </div>

              {isFounder && (
                <div style={{ marginBottom: 24 }}>
                  <FieldLabel>household name</FieldLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={name} onChange={e => setName(e.target.value)}
                      placeholder="the carrier den" style={{ flex: 1 }} />
                    <button style={{ ...glassBtnGhost, fontSize: 13, opacity: (savingName || !name.trim() || name === household.name) ? 0.5 : 1 }}
                      onClick={rename} disabled={savingName || !name.trim() || name === household.name}>
                      {savingName ? 'saving…' : 'rename'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: THEME.accent,
                  letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12,
                }}>
                  members · {household.members.length}
                </div>
                <Glass padding={4}>
                  {household.members.map((m, i) => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      borderTop: i > 0 ? `1px solid ${THEME.hairline}` : 'none',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: m.role === 'founder' ? 'oklch(0.62 0.14 35 / 0.18)' : 'oklch(0.55 0.10 145 / 0.18)',
                        color: m.role === 'founder' ? THEME.accent : THEME.sage,
                        fontWeight: 700, fontSize: 14,
                      }}>{(m.display_name || m.email)[0]?.toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: THEME.ink, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {m.display_name || m.email.split('@')[0]}
                          {m.role === 'founder' && <Badge tone="accent">founder</Badge>}
                          {!m.joined_at && <Badge tone="yellow">awaiting first sign-in</Badge>}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.dim, marginTop: 2 }}>
                          {m.email}{m.joined_at ? ` · joined ${new Date(m.joined_at).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      {isFounder && m.role !== 'founder' && (
                        <button
                          style={{ background: 'none', border: 'none', color: THEME.dim, cursor: 'pointer', fontSize: 16, padding: 4 }}
                          onClick={() => removeMember(m)}
                          title="remove from household"
                        >✕</button>
                      )}
                    </div>
                  ))}
                </Glass>
              </div>

              {isFounder && (
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: THEME.accent,
                    letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12,
                  }}>invite someone</div>
                  <Glass padding={14}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ flex: 2, minWidth: 180 }}>
                        <FieldLabel>email</FieldLabel>
                        <input type="email" value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && invite()}
                          placeholder="them@example.com" style={{ width: '100%' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <FieldLabel>name (optional)</FieldLabel>
                        <input value={inviteName}
                          onChange={e => setInviteName(e.target.value)}
                          placeholder="e.g. wife" style={{ width: '100%' }} />
                      </div>
                    </div>
                    <button style={{ ...glassBtnPrimary, width: '100%', opacity: (inviting || !inviteEmail.includes('@')) ? 0.5 : 1 }}
                      onClick={invite} disabled={inviting || !inviteEmail.includes('@')}>
                      {inviting ? 'inviting…' : '+ invite to the den'}
                    </button>
                    <div style={{ fontSize: 11, color: THEME.faint, marginTop: 10, lineHeight: 1.5 }}>
                      they'll be able to sign in with this email and see the same household data.
                    </div>
                  </Glass>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
