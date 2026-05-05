import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { Glass, THEME, display, ambientBG, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

function ProviderButton({ icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...glassBtnGhost,
        width: '100%',
        padding: '12px 16px',
        fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
  );
}

export default function Login() {
  const { signInWithMagicLink, signInWithProvider, error } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function send(e) {
    e?.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    const ok = await signInWithMagicLink(email.trim());
    setSending(false);
    if (ok) setSent(true);
  }

  return (
    <>
      <div className="mesh-bg" />
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
        position: 'relative',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              fontSize: 11, color: THEME.accent, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8,
            }}>Welcome back</div>
            <div style={{
              fontFamily: display, fontSize: 44, fontWeight: 400, fontStyle: 'italic',
              color: THEME.ink, lineHeight: 1, letterSpacing: '-0.02em',
            }}>Mealhouse<span style={{ color: THEME.accent }}>.</span></div>
            <div style={{ color: THEME.dim, fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>
              Sign in to plan the family's week.
            </div>
          </div>

          <Glass padding={24} strong>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 38, marginBottom: 12 }}>📬</div>
                <div style={{
                  fontFamily: display, fontSize: 22, fontStyle: 'italic',
                  color: THEME.ink, marginBottom: 8,
                }}>Check your email</div>
                <div style={{ color: THEME.text, fontSize: 13, lineHeight: 1.55, marginBottom: 18 }}>
                  We sent a magic link to <strong style={{ color: THEME.ink }}>{email}</strong>. Tap it on this device to sign in.
                </div>
                <button
                  style={{ ...glassBtnGhost, fontSize: 12 }}
                  onClick={() => { setSent(false); setEmail(''); }}
                >Use a different method</button>
              </div>
            ) : (
              <>
                <form onSubmit={send}>
                  <FieldLabel>Email</FieldLabel>
                  <input
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ width: '100%', marginBottom: 14 }}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    style={{
                      ...glassBtnPrimary, width: '100%', padding: '12px 16px', fontSize: 14,
                      opacity: (!email.trim() || sending) ? 0.5 : 1,
                    }}
                    disabled={!email.trim() || sending}
                  >
                    {sending ? 'Sending…' : 'Email me a magic link'}
                  </button>
                </form>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  margin: '20px 0 16px', color: THEME.faint,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>
                  <div style={{ flex: 1, height: 1, background: THEME.hairline }} />
                  <span>or</span>
                  <div style={{ flex: 1, height: 1, background: THEME.hairline }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <ProviderButton
                    icon="🇬"
                    label="Continue with Google"
                    onClick={() => signInWithProvider('google')}
                  />
                  <ProviderButton
                    icon="🍎"
                    label="Continue with Apple"
                    onClick={() => signInWithProvider('apple')}
                  />
                </div>

                {error && (
                  <Glass tint="oklch(0.55 0.18 25 / 0.18)" padding={12} style={{ marginTop: 16 }}>
                    <div style={{ color: THEME.red, fontSize: 13 }}>⚠ {error}</div>
                  </Glass>
                )}
              </>
            )}
          </Glass>

          <div style={{
            textAlign: 'center', marginTop: 22,
            fontSize: 11, color: THEME.faint, lineHeight: 1.6, letterSpacing: '0.02em',
          }}>
            This is a private, family-use app. Access is by invitation only.
          </div>
        </div>
      </div>
    </>
  );
}
