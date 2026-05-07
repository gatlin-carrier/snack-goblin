import { useState, useEffect, useRef } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';
import Goblin from './Goblin.jsx';

export default function GoblinChat({ onClose, name = 'the goblin', showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch('/api/goblin/chat')
      .then(r => r.json())
      .then(rows => { if (Array.isArray(rows)) setMessages(rows); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // auto-scroll to bottom on new message
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    // optimistic insert
    setMessages(m => [...m, { role: 'user', content: text, optimistic: true }]);
    setSending(true);
    try {
      const res = await fetch('/api/goblin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast?.(data.error || "couldn't reach the goblin");
        // remove the optimistic message
        setMessages(m => m.filter(msg => !msg.optimistic));
        return;
      }
      setMessages(m => [
        ...m.filter(msg => !msg.optimistic),
        { role: 'user', content: text },
        { role: 'assistant', content: data.reply },
      ]);
    } catch (err) {
      showToast?.("the goblin's offline");
      setMessages(m => m.filter(msg => !msg.optimistic));
    } finally { setSending(false); }
  }

  async function clearHistory() {
    if (!confirm('clear chat history? this only affects this conversation.')) return;
    await fetch('/api/goblin/chat', { method: 'DELETE' });
    setMessages([]);
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 520, height: 'min(78vh, 720px)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Goblin state="curious" size={36} name={name} />
            <div>
              <div style={{ fontFamily: display, fontSize: 20, fontStyle: 'italic', fontWeight: 500, color: THEME.ink, lineHeight: 1.1 }}>
                Chat with {name}
              </div>
              <div style={{ fontSize: 11, color: THEME.faint, marginTop: 2 }}>
                knows your plan, recent cooks, and drinks settings
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div
          ref={scrollRef}
          style={{
            flex: 1, overflow: 'auto', padding: '14px 22px',
            display: 'flex', flexDirection: 'column', gap: 10,
            background: 'transparent',
          }}
        >
          {loading ? (
            <div style={{ color: THEME.dim, textAlign: 'center', marginTop: 40 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ color: THEME.dim, textAlign: 'center', marginTop: 40, lineHeight: 1.5, fontSize: 13 }}>
              say hi. ask "what should i cook tonight?", "what's a swap for tonight's recipe?", or anything food-shaped.
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                }}
              >
                <Glass
                  padding={'10px 14px'}
                  radius={16}
                  tint={m.role === 'user' ? 'oklch(0.55 0.13 50 / 0.16)' : undefined}
                  style={{ opacity: m.optimistic ? 0.55 : 1 }}
                >
                  <div style={{
                    fontSize: 13.5, color: THEME.text, lineHeight: 1.5,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>{m.content}</div>
                </Glass>
              </div>
            ))
          )}
          {sending && (
            <div style={{ alignSelf: 'flex-start' }}>
              <Glass padding={'10px 14px'} radius={16}>
                <div style={{ fontSize: 13, color: THEME.dim, fontStyle: 'italic' }}>…thinking</div>
              </Glass>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 18px 18px', borderTop: `1px solid ${THEME.hairline}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={`message ${name}…`}
              maxLength={2000}
              rows={2}
              style={{
                flex: 1, resize: 'none', fontFamily: 'inherit', fontSize: 13.5,
                padding: '10px 12px', borderRadius: 12,
                border: `1px solid ${THEME.hairline}`,
                background: 'oklch(1 0 0 / 0.55)',
              }}
            />
            <button
              style={{ ...glassBtnPrimary, padding: '10px 16px', opacity: (sending || !input.trim()) ? 0.5 : 1 }}
              onClick={send}
              disabled={sending || !input.trim()}
            >
              {sending ? '…' : 'send'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: THEME.faint, letterSpacing: '0.04em' }}>
              ⏎ to send · ⇧⏎ for newline
            </span>
            <button
              onClick={clearHistory}
              style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 10px', color: THEME.dim }}
            >clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}
