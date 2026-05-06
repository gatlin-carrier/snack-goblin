import { useState } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';
import { registerPasskey } from '../lib/passkeys.js';

export default function PasskeyPrompt({ onClose, showToast }) {
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState(null);

  async function setUp() {
    setRegistering(true);
    setError(null);
    try {
      await registerPasskey('this device');
      showToast?.('Face ID set up. one tap next time.');
      onClose();
    } catch (err) {
      setError(err.message || 'something went wrong');
      setRegistering(false);
    }
  }

  function notNow() {
    sessionStorage.setItem('passkey_prompt_skipped', '1');
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={registering ? undefined : notNow}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👁</div>
            <div style={{
              fontFamily: display, fontSize: 24, fontStyle: 'italic',
              color: THEME.ink, marginBottom: 8, lineHeight: 1.2,
            }}>trust this device?</div>
            <div style={{ color: THEME.text, fontSize: 13, lineHeight: 1.6 }}>
              register Face ID and you won't need to magic-link from this
              device again. one tap to sign in next time.
            </div>
          </div>

          <Glass padding={14} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: THEME.dim, lineHeight: 1.55 }}>
              <strong style={{ color: THEME.ink }}>how it works:</strong> Face ID
              unlocks your saved sign-in on this device only. nothing leaves
              the phone. you can forget this device any time from the Login
              screen.
            </div>
          </Glass>

          {error && (
            <Glass tint="oklch(0.55 0.18 25 / 0.18)" padding={12} style={{ marginBottom: 14 }}>
              <div style={{ color: THEME.red, fontSize: 13 }}>⚠ {error}</div>
            </Glass>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...glassBtnGhost, flex: 1 }} onClick={notNow} disabled={registering}>not now</button>
            <button
              style={{ ...glassBtnPrimary, flex: 2, padding: '12px 16px', opacity: registering ? 0.5 : 1 }}
              onClick={setUp}
              disabled={registering}
            >
              {registering ? 'registering…' : '👁 set up Face ID'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
