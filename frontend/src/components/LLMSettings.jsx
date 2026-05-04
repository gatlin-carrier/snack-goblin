import { useState, useEffect } from 'react';
import { Glass, Badge, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

const PROVIDERS = [
  { key: 'anthropic', label: 'Claude (Anthropic)',     needsKey: true,  defaultModel: 'claude-haiku-4-5-20251001' },
  { key: 'openai',    label: 'OpenAI',                  needsKey: true,  defaultModel: 'gpt-4o-mini' },
  { key: 'google',    label: 'Google Gemini',           needsKey: true,  defaultModel: 'gemini-1.5-flash' },
  { key: 'groq',      label: 'Groq (fast & cheap)',     needsKey: true,  defaultModel: 'llama-3.3-70b-versatile' },
  { key: 'ollama',    label: 'Ollama (local)',          needsKey: false, defaultModel: 'gemma3:12b' },
  { key: 'lmstudio',  label: 'LM Studio (local)',       needsKey: false, defaultModel: 'local-model' },
  { key: 'custom',    label: 'Custom (OpenAI-compat)',  needsKey: false, defaultModel: '' },
];

const PROVIDER_TONE = {
  anthropic: 'rust',
  openai:    'sage',
  google:    'accent',
  groq:      'rust',
  ollama:    'accent',
  lmstudio:  'yellow',
  custom:    'neutral',
};

const LOCAL_PROVIDERS = new Set(['ollama', 'lmstudio', 'custom']);
const BLANK_FORM = { name: '', provider: 'anthropic', model: '', api_key: '', base_url: '' };

function FieldLabel({ children, hint }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {children}
      {hint && <span style={{ marginLeft: 8, fontWeight: 500, color: THEME.faint, textTransform: 'none', letterSpacing: 0 }}>{hint}</span>}
    </div>
  );
}

export default function LLMSettings({ onClose }) {
  const [configs, setConfigs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [testStatus, setTestStatus] = useState({});
  const [saving, setSaving] = useState(false);
  const [localModels, setLocalModels] = useState([]);
  const [browseStatus, setBrowseStatus] = useState('idle');
  const [browseError, setBrowseError] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(null);
  const [extraHosts, setExtraHosts] = useState('');
  const [savingHosts, setSavingHosts] = useState(false);
  const [showExtraHosts, setShowExtraHosts] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => setExtraHosts(s.extra_llm_hosts || '')).catch(() => {});
  }, []);

  useEffect(() => {
    setLocalModels([]);
    setBrowseStatus('idle');
    setBrowseError('');
  }, [form.provider, form.base_url]);

  async function load() {
    const res = await fetch('/api/llm-configs');
    setConfigs(await res.json());
  }

  async function detect() {
    setDetecting(true);
    setDetected(null);
    try {
      const res = await fetch('/api/detect-local-llms');
      const data = await res.json();
      setDetected(data);
    } catch {
      setDetected({ found: [] });
    } finally {
      setDetecting(false);
    }
  }

  async function saveExtraHosts() {
    setSavingHosts(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_llm_hosts: extraHosts }),
      });
    } finally { setSavingHosts(false); }
  }

  async function quickAdd(service, model) {
    const name = model
      ? `${service.label} — ${model.split('/').pop()}`
      : service.label;
    await fetch('/api/llm-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        provider: service.provider,
        model: model || (service.models[0] ?? ''),
        base_url: service.base_url,
        make_active: configs.length === 0,
      }),
    });
    load();
  }

  function startAdd() {
    setForm(BLANK_FORM);
    setLocalModels([]);
    setBrowseStatus('idle');
    setEditingId('new');
  }

  function startEdit(cfg) {
    setForm({ name: cfg.name, provider: cfg.provider, model: cfg.model, api_key: '', base_url: cfg.base_url });
    setLocalModels([]);
    setBrowseStatus('idle');
    setEditingId(cfg.id);
  }

  function cancelEdit() { setEditingId(null); setForm(BLANK_FORM); setLocalModels([]); setBrowseStatus('idle'); }

  const providerMeta = PROVIDERS.find(p => p.key === form.provider) || PROVIDERS[0];
  const isLocalProvider = LOCAL_PROVIDERS.has(form.provider);

  async function browseModels() {
    if (!form.base_url.trim()) return;
    setBrowseStatus('loading');
    setBrowseError('');
    try {
      const params = new URLSearchParams({ provider: form.provider, base_url: form.base_url.trim() });
      const res = await fetch(`/api/local-models?${params}`);
      const data = await res.json();
      if (!res.ok) { setBrowseStatus('error'); setBrowseError(data.error || 'Failed'); return; }
      setLocalModels(data.models || []);
      setBrowseStatus('done');
      if (data.models?.length && !form.model) {
        setForm(f => ({ ...f, model: data.models[0] }));
      }
    } catch (e) {
      setBrowseStatus('error');
      setBrowseError(e.message);
    }
  }

  async function save() {
    if (!form.name.trim() || !form.provider) return;
    setSaving(true);
    try {
      if (editingId === 'new') {
        await fetch('/api/llm-configs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, make_active: configs.length === 0 }),
        });
      } else {
        await fetch(`/api/llm-configs/${editingId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      cancelEdit();
      load();
    } finally { setSaving(false); }
  }

  async function activate(id) {
    await fetch(`/api/llm-configs/${id}/activate`, { method: 'POST' });
    load();
  }

  async function remove(id) {
    await fetch(`/api/llm-configs/${id}`, { method: 'DELETE' });
    load();
  }

  async function test(cfg) {
    setTestStatus(s => ({ ...s, [cfg.id]: 'testing' }));
    try {
      const res = await fetch(`/api/llm-configs/${cfg.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestStatus(s => ({ ...s, [cfg.id]: data.ok ? `ok:${data.response}` : `err:${data.error}` }));
    } catch (e) {
      setTestStatus(s => ({ ...s, [cfg.id]: `err:${e.message}` }));
    }
  }

  const configuredKeys = new Set(configs.map(c => `${c.base_url}|${c.model || ''}`));
  const isModelAdded = (baseUrl, model) => configuredKeys.has(`${baseUrl}|${model || ''}`);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>🤖 AI model</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {configs.length > 0 && editingId === null && (
            <Glass padding={4} style={{ marginBottom: 18 }}>
              {configs.map((cfg, i) => {
                const ts = testStatus[cfg.id];
                return (
                  <div key={cfg.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${THEME.hairline}` : 'none',
                  }}>
                    <button
                      onClick={() => activate(cfg.id)}
                      title={cfg.is_active ? 'Active' : 'Set as active'}
                      style={{
                        background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
                        color: cfg.is_active ? THEME.accent : THEME.faint,
                        padding: 0, flexShrink: 0, lineHeight: 1,
                      }}
                    >{cfg.is_active ? '●' : '○'}</button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>{cfg.name}</span>
                        <Badge tone={PROVIDER_TONE[cfg.provider] || 'neutral'}>{cfg.provider}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.dim, marginTop: 3 }}>
                        {cfg.model || <em>default model</em>}
                        {cfg.api_key_hint && <span> · key: {cfg.api_key_hint}</span>}
                        {cfg.base_url && <span> · {cfg.base_url}</span>}
                      </div>
                      {ts && (
                        <div style={{
                          fontSize: 12, marginTop: 4,
                          color: ts === 'testing' ? THEME.dim : ts.startsWith('ok') ? THEME.sage : THEME.red,
                          fontWeight: 500,
                        }}>
                          {ts === 'testing' && '⏳ Testing…'}
                          {ts.startsWith('ok:') && `✓ Connected — "${ts.slice(3)}"`}
                          {ts.startsWith('err:') && `✗ ${ts.slice(4)}`}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button style={{ ...glassBtnGhost, fontSize: 11, padding: '5px 12px' }}
                        onClick={() => test(cfg)} disabled={ts === 'testing'}>Test</button>
                      <button style={{ ...glassBtnGhost, fontSize: 11, padding: '5px 12px' }}
                        onClick={() => startEdit(cfg)}>Edit</button>
                      <button style={{ ...glassBtnGhost, fontSize: 11, padding: '5px 12px', color: THEME.red }}
                        onClick={() => remove(cfg.id)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </Glass>
          )}

          {configs.length === 0 && editingId === null && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: THEME.dim, fontSize: 14, marginBottom: 16 }}>
              No models configured yet. Add one to get started.
            </div>
          )}

          {editingId === null && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: detected ? 12 : 0 }}>
                <button
                  style={{ ...glassBtnGhost, flex: 1, opacity: detecting ? 0.5 : 1 }}
                  onClick={detect}
                  disabled={detecting}
                >
                  {detecting ? '🔍 Scanning for local LLM servers…' : '🔍 Auto-detect local servers'}
                </button>
                <button
                  style={{ ...glassBtnGhost, fontSize: 12, padding: '0 14px', whiteSpace: 'nowrap' }}
                  onClick={() => setShowExtraHosts(v => !v)}
                  title="Add custom hosts to scan"
                >⚙ Hosts</button>
              </div>

              {showExtraHosts && (
                <Glass padding={14} style={{ marginTop: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: THEME.text, marginBottom: 8, lineHeight: 1.5 }}>
                    Extra hosts to scan in addition to defaults — one per line. Examples:
                  </div>
                  <pre style={{
                    fontSize: 11, color: THEME.dim, fontFamily: 'ui-monospace, monospace',
                    background: 'oklch(1 0 0 / 0.5)',
                    padding: '8px 10px', borderRadius: 8, marginBottom: 10, lineHeight: 1.55,
                    boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.6), 0 0 0 0.5px oklch(0.4 0.02 60 / 0.12)',
                  }}>
{`192.168.5.10            ← scans all standard LLM ports
192.168.5.10:11434      ← exact host:port
http://my-llm.lan:8080  ← full URL`}
                  </pre>
                  <textarea
                    value={extraHosts}
                    onChange={e => setExtraHosts(e.target.value)}
                    placeholder="One host per line…"
                    style={{ width: '100%', minHeight: 64, fontSize: 12, fontFamily: 'ui-monospace, monospace', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: THEME.faint }}>
                      Saved hosts also pull in their sibling ports automatically.
                    </span>
                    <button style={{ ...glassBtnPrimary, fontSize: 12, padding: '6px 14px' }}
                      onClick={saveExtraHosts} disabled={savingHosts}>
                      {savingHosts ? '…' : 'Save'}
                    </button>
                  </div>
                </Glass>
              )}

              {detected && !detecting && detected.scanned_hosts && (
                <div style={{ fontSize: 11, color: THEME.faint, marginTop: 10, marginBottom: 10 }}>
                  Scanned: {detected.scanned_hosts.join(', ')}
                </div>
              )}

              {detected && !detecting && (
                detected.found.length === 0 ? (
                  <div style={{ fontSize: 13, color: THEME.dim, textAlign: 'center', padding: '14px 0' }}>
                    No local LLM servers found. If yours is on a different host, add it under ⚙ Hosts above.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {detected.found.map(service => {
                      const addedCount = service.models.filter(m => isModelAdded(service.base_url, m)).length;
                      const allAdded = service.models.length > 0 && addedCount === service.models.length;
                      const singleModel = service.models.length === 1;
                      const singleAdded = singleModel && isModelAdded(service.base_url, service.models[0]);
                      return (
                        <Glass key={service.base_url} padding={14}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: service.models.length ? 12 : 0 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>{service.label}</div>
                              <div style={{ fontSize: 11, color: THEME.dim, marginTop: 2 }}>
                                {service.base_url} · {service.models.length} model{service.models.length !== 1 ? 's' : ''}
                                {addedCount > 0 && service.models.length > 1 && (
                                  <span style={{ color: THEME.accent, fontWeight: 600 }}> · {addedCount} added</span>
                                )}
                              </div>
                            </div>
                            {singleAdded && (
                              <span style={{ fontSize: 11, color: THEME.accent, fontWeight: 700, letterSpacing: '0.04em' }}>✓ Added</span>
                            )}
                            {!singleAdded && singleModel && (
                              <button style={{ ...glassBtnPrimary, fontSize: 12, padding: '5px 14px' }}
                                onClick={() => quickAdd(service, service.models[0])}>+ Add</button>
                            )}
                            {allAdded && !singleModel && (
                              <span style={{ fontSize: 11, color: THEME.accent, fontWeight: 700, letterSpacing: '0.04em' }}>✓ All added</span>
                            )}
                          </div>

                          {service.models.length > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {service.models.map(m => {
                                const added = isModelAdded(service.base_url, m);
                                return (
                                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                      flex: 1, fontSize: 13,
                                      fontFamily: 'ui-monospace, monospace',
                                      color: added ? THEME.faint : THEME.text,
                                    }}>{m}</div>
                                    {added ? (
                                      <span style={{ fontSize: 12, color: THEME.accent, fontWeight: 700 }}>✓</span>
                                    ) : (
                                      <button style={{ ...glassBtnGhost, fontSize: 11, padding: '4px 12px' }}
                                        onClick={() => quickAdd(service, m)}>+ Add</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Glass>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {editingId !== null ? (
            <Glass padding={18}>
              <div style={{
                fontFamily: display, fontWeight: 500, fontStyle: 'italic',
                marginBottom: 16, fontSize: 18, color: THEME.ink,
              }}>{editingId === 'new' ? 'Add model' : 'Edit model'}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Claude Haiku, Local Gemma" style={{ width: '100%' }} />
                </div>

                <div>
                  <FieldLabel>Provider</FieldLabel>
                  <select value={form.provider} style={{ width: '100%' }}
                    onChange={e => setForm(f => ({ ...f, provider: e.target.value, model: '', base_url: '' }))}>
                    {PROVIDERS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>

                {isLocalProvider && (
                  <div>
                    <FieldLabel>Base URL</FieldLabel>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={form.base_url}
                        onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                        placeholder={form.provider === 'ollama' ? 'http://172.17.0.1:11434' : 'http://localhost:1234/v1'}
                        style={{ flex: 1 }} />
                      <button
                        style={{ ...glassBtnGhost, fontSize: 12, padding: '0 14px', flexShrink: 0, whiteSpace: 'nowrap' }}
                        onClick={browseModels}
                        disabled={!form.base_url.trim() || browseStatus === 'loading'}
                      >
                        {browseStatus === 'loading' ? '…' : '🔍 Browse'}
                      </button>
                    </div>
                    {browseStatus === 'error' && (
                      <div style={{ fontSize: 11, color: THEME.red, marginTop: 5 }}>
                        Could not connect: {browseError}
                      </div>
                    )}
                    {browseStatus === 'done' && localModels.length === 0 && (
                      <div style={{ fontSize: 11, color: THEME.dim, marginTop: 5 }}>
                        No models found on that server.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <FieldLabel hint={browseStatus === 'done' && localModels.length > 0 ? `${localModels.length} available` : null}>
                    Model
                  </FieldLabel>
                  {browseStatus === 'done' && localModels.length > 0 ? (
                    <select value={form.model} style={{ width: '100%' }}
                      onChange={e => setForm(f => ({ ...f, model: e.target.value }))}>
                      {localModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input value={form.model}
                      onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                      placeholder={isLocalProvider && !form.base_url.trim()
                        ? 'Enter base URL above, then click Browse'
                        : `default: ${providerMeta.defaultModel}`}
                      style={{ width: '100%' }} />
                  )}
                </div>

                {providerMeta.needsKey && (
                  <div>
                    <FieldLabel hint={editingId !== 'new' ? '(leave blank to keep existing)' : null}>API key</FieldLabel>
                    <input type="password" value={form.api_key}
                      onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                      placeholder={editingId !== 'new' ? '••••••••' : 'sk-ant-…'}
                      style={{ width: '100%' }} />
                    <div style={{ fontSize: 11, color: THEME.faint, marginTop: 5 }}>
                      Or set the env var and leave this blank — the server will use it automatically.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button style={{ ...glassBtnGhost, flex: 1 }} onClick={cancelEdit} disabled={saving}>Cancel</button>
                <button style={{ ...glassBtnPrimary, flex: 2, opacity: (saving || !form.name.trim()) ? 0.5 : 1 }}
                  onClick={save} disabled={saving || !form.name.trim()}>
                  {saving ? 'Saving…' : editingId === 'new' ? 'Add model' : 'Save changes'}
                </button>
              </div>
            </Glass>
          ) : (
            <button style={{ ...glassBtnGhost, width: '100%' }} onClick={startAdd}>+ Add manually</button>
          )}

          <div style={{ marginTop: 18, fontSize: 12, color: THEME.dim, lineHeight: 1.5 }}>
            The active model (●) is used for all recipe generation. Click ○ on any model to switch.
          </div>
        </div>
      </div>
    </div>
  );
}
