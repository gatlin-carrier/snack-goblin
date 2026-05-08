import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { Glass, THEME, display, ambientBG, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';
import { isPasskeySupported, getCachedCredentialId, getCachedEmail, authWithPasskey, forgetPasskey } from '../lib/passkeys.js';
import Goblin from './Goblin.jsx';

const RESEND_COOLDOWN = 60;

function ResendTimer({ secondsLeft, onResend, sending }) {
  const ready = secondsLeft <= 0;
  const pct = ready ? 1 : (RESEND_COOLDOWN - secondsLeft) / RESEND_COOLDOWN;
  return (
    <button
      type="button"
      onClick={ready && !sending ? onResend : undefined}
      disabled={!ready || sending}
      style={{
        position: 'relative',
        ...glassBtnGhost,
        width: '100%',
        padding: '11px 16px',
        fontSize: 13,
        cursor: ready && !sending ? 'pointer' : 'default',
        opacity: sending ? 0.6 : 1,
        overflow: 'hidden',
      }}
      title={ready ? 'resend the magic link' : `wait ${secondsLeft}s before resending`}
    >
      {/* fill bar showing time elapsed */}
      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        width: `${pct * 100}%`,
        background: ready
          ? `linear-gradient(90deg, oklch(0.78 0.07 50 / 0.25), oklch(0.78 0.07 50 / 0.15))`
          : `linear-gradient(90deg, oklch(0.55 0.13 50 / 0.18), oklch(0.55 0.13 50 / 0.08))`,
        transition: 'width 1s linear',
        pointerEvents: 'none',
      }} />
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {sending ? 'sending…' : ready ? '↻ resend magic link' : (
          <>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: THEME.dim }}>
              resend in <strong style={{ color: THEME.ink, fontWeight: 700 }}>{secondsLeft}s</strong>
            </span>
          </>
        )}
      </span>
    </button>
  );
}

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
  const remembered = (typeof window !== 'undefined' ? localStorage.getItem('mealhouse_last_email') : null) || '';
  const [email, setEmail] = useState(remembered);
  const [showSwitch, setShowSwitch] = useState(!remembered);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resentAt, setResentAt] = useState(null);

  const passkeyAvailable = isPasskeySupported() && !!getCachedCredentialId();
  const passkeyEmail = getCachedEmail();
  const [usingPasskey, setUsingPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState(null);

  async function tryFaceID() {
    setUsingPasskey(true);
    setPasskeyError(null);
    try {
      await authWithPasskey();
      // session restored — AuthProvider will pick it up via onAuthStateChange
    } catch (err) {
      setPasskeyError(err.message);
      setUsingPasskey(false);
    }
  }

  async function forgetThisDevice() {
    await forgetPasskey();
    location.reload();
  }

  useEffect(() => {
    if (!sent || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [sent, secondsLeft]);

  async function send(e) {
    e?.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    const ok = await signInWithMagicLink(email.trim());
    setSending(false);
    if (ok) {
      try { localStorage.setItem('mealhouse_last_email', email.trim()); } catch {}
      setSent(true);
      setSecondsLeft(RESEND_COOLDOWN);
    }
  }

  function forgetMe() {
    try { localStorage.removeItem('mealhouse_last_email'); } catch {}
    setEmail('');
    setShowSwitch(true);
  }

  async function resend() {
    if (sending || secondsLeft > 0) return;
    setSending(true);
    const ok = await signInWithMagicLink(email.trim());
    setSending(false);
    if (ok) {
      setSecondsLeft(RESEND_COOLDOWN);
      setResentAt(Date.now());
    }
  }

  function reset() {
    setSent(false);
    setEmail('');
    setSecondsLeft(0);
    setResentAt(null);
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
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              fontSize: 11, color: THEME.dim, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
            }}>welcome to the den</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Goblin state="idle" size={86} title="Snack Goblin mascot" />
            </div>
            <div style={{
              fontFamily: display, fontSize: 44, fontWeight: 400, fontStyle: 'italic',
              color: THEME.ink, lineHeight: 1, letterSpacing: '-0.02em',
            }}>snack goblin</div>
            <div style={{ color: THEME.text, fontSize: 14, marginTop: 14, lineHeight: 1.55, fontStyle: 'italic', fontFamily: display }}>
              dinner planning for adhd brains.<br />
              <span style={{ color: THEME.dim }}>sign in and we'll figure out food together.</span>
            </div>
          </div>

          <Glass padding={24} strong>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 38, marginBottom: 12 }}>📬</div>
                <div style={{
                  fontFamily: display, fontSize: 22, fontStyle: 'italic',
                  color: THEME.ink, marginBottom: 8,
                }}>check your email</div>
                <div style={{ color: THEME.text, fontSize: 13, lineHeight: 1.55, marginBottom: 18 }}>
                  {resentAt ? 'resent — t' : 't'}ap the link in <strong style={{ color: THEME.ink }}>{email}</strong> on this device to sign in.
                </div>

                <ResendTimer
                  secondsLeft={secondsLeft}
                  onResend={resend}
                  sending={sending}
                />

                {error && (
                  <Glass tint="oklch(0.55 0.18 25 / 0.18)" padding={10} style={{ marginTop: 12 }}>
                    <div style={{ color: THEME.red, fontSize: 12 }}>⚠ {error}</div>
                  </Glass>
                )}

                <button
                  style={{ ...glassBtnGhost, fontSize: 12, marginTop: 14, opacity: 0.85 }}
                  onClick={reset}
                >use a different method</button>
              </div>
            ) : (
              <>
                {passkeyAvailable && (
                  <div style={{ marginBottom: 18 }}>
                    <button
                      onClick={tryFaceID}
                      disabled={usingPasskey}
                      style={{
                        ...glassBtnPrimary,
                        width: '100%', padding: '14px 16px', fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        opacity: usingPasskey ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 22, lineHeight: 1 }}>👁</span>
                      {usingPasskey ? 'authenticating…' : `use Face ID${passkeyEmail ? ` · ${passkeyEmail.split('@')[0]}` : ''}`}
                    </button>
                    {passkeyError && (
                      <Glass tint="oklch(0.55 0.18 25 / 0.18)" padding={10} style={{ marginTop: 10 }}>
                        <div style={{ color: THEME.red, fontSize: 12 }}>⚠ {passkeyError}</div>
                      </Glass>
                    )}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, marginTop: 12,
                      fontSize: 11, color: THEME.faint,
                    }}>
                      <span>or sign in with email</span>
                      <button onClick={forgetThisDevice} style={{ background: 'none', border: 'none', color: THEME.faint, cursor: 'pointer', fontSize: 11, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                        forget this device
                      </button>
                    </div>
                  </div>
                )}

                {remembered && !showSwitch ? (
                  <>
                    <div style={{
                      textAlign: 'center', padding: '4px 0 18px',
                      fontSize: 13, color: THEME.text, lineHeight: 1.55,
                    }}>
                      welcome back,{' '}
                      <strong style={{ color: THEME.ink }}>{remembered}</strong>
                    </div>
                    <button
                      onClick={send}
                      disabled={sending}
                      style={{
                        ...glassBtnPrimary, width: '100%', padding: '12px 16px', fontSize: 14,
                        opacity: sending ? 0.5 : 1,
                      }}
                    >
                      {sending ? 'sending…' : '✉ send me a magic link'}
                    </button>
                    <button
                      type="button"
                      onClick={forgetMe}
                      style={{
                        ...glassBtnGhost, width: '100%', marginTop: 10,
                        fontSize: 12, opacity: 0.7,
                      }}
                    >
                      not me · use a different email
                    </button>
                  </>
                ) : (
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
                      {sending ? 'sending…' : 'email me a magic link'}
                    </button>
                  </form>
                )}

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
            Built for our weird little family. Access by invitation only.
          </div>
        </div>
      </div>
    </>
  );
}
