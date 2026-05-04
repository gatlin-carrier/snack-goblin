import { useState, useEffect } from 'react';

const PROVIDERS = [
  { key: 'anthropic', label: 'Claude (Anthropic)', needsKey: true,  defaultModel: 'claude-haiku-4-5-20251001' },
  { key: 'openai',    label: 'OpenAI',              needsKey: true,  defaultModel: 'gpt-4o-mini' },
  { key: 'google',    label: 'Google Gemini',       needsKey: true,  defaultModel: 'gemini-1.5-flash' },
  { key: 'ollama',    label: 'Ollama (local)',       needsKey: false, defaultModel: 'gemma3:12b' },
  { key: 'lmstudio',  label: 'LM Studio (local)',   needsKey: false, defaultModel: 'local-model' },
  { key: 'custom',    label: 'Custom (OpenAI-compat)', needsKey: false, defaultModel: '' },
];

const PROVIDER_COLORS = {
  anthropic: '#c97a5c', openai: '#10b981', google: '#4285f4',
  ollama: '#7c6ff7', lmstudio: '#f59e0b', custom: '#8b91b5',
};

const LOCAL_PROVIDERS = new Set(['ollama', 'lmstudio', 'custom']);
const BLANK_FORM = { name: '', provider: 'anthropic', model: '', api_key: '', base_url: '' };

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
  const [detected, setDetected] = useState(null); // null | { found: [] }

  useEffect(() => { load(); }, []);

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

  // IDs of base_urls already configured so we can show "already added" state
  const configuredUrls = new Set(configs.map(c => c.base_url).filter(Boolean));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontSize: 18, fontWeight: 700 }}>🤖 AI Model Settings</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* Config list */}
          {configs.length > 0 && editingId === null && (
            <div style={{ marginBottom: 20 }}>
              {configs.map(cfg => {
                const ts = testStatus[cfg.id];
                const color = PROVIDER_COLORS[cfg.provider] || 'var(--text-dim)';
                return (
                  <div key={cfg.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <button
                      onClick={() => activate(cfg.id)}
                      title={cfg.is_active ? 'Active' : 'Set as active'}
                      style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
                               color: cfg.is_active ? 'var(--accent)' : 'var(--border)', padding: 0, flexShrink: 0 }}
                    >{cfg.is_active ? '●' : '○'}</button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{cfg.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}20`,
                                       padding: '1px 7px', borderRadius: 20 }}>{cfg.provider}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                        {cfg.model || <em>default model</em>}
                        {cfg.api_key_hint && <span> · key: {cfg.api_key_hint}</span>}
                        {cfg.base_url && <span> · {cfg.base_url}</span>}
                      </div>
                      {ts && (
                        <div style={{ fontSize: 12, marginTop: 3,
                                      color: ts === 'testing' ? 'var(--text-dim)' : ts.startsWith('ok') ? 'var(--green)' : 'var(--red)' }}>
                          {ts === 'testing' && '⏳ Testing…'}
                          {ts.startsWith('ok:') && `✓ Connected — "${ts.slice(3)}"`}
                          {ts.startsWith('err:') && `✗ ${ts.slice(4)}`}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => test(cfg)} disabled={ts === 'testing'}>Test</button>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => startEdit(cfg)}>Edit</button>
                      <button className="btn-danger" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => remove(cfg.id)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {configs.length === 0 && editingId === null && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: 14, marginBottom: 16 }}>
              No models configured yet. Add one to get started.
            </div>
          )}

          {/* Auto-detect panel — shown when not editing */}
          {editingId === null && (
            <div style={{ marginBottom: 16 }}>
              <button
                className="btn-ghost"
                style={{ width: '100%', marginBottom: detected ? 12 : 0 }}
                onClick={detect}
                disabled={detecting}
              >
                {detecting ? '🔍 Scanning for local LLM servers…' : '🔍 Auto-detect local servers'}
              </button>

              {detected && !detecting && (
                detected.found.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '10px 0' }}>
                    No local LLM servers found. Make sure Ollama, LM Studio, etc. are running.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {detected.found.map(service => {
                      const alreadyAdded = configuredUrls.has(service.base_url);
                      return (
                        <div key={service.base_url} style={{
                          background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px',
                          border: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: service.models.length ? 10 : 0 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{service.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                                {service.base_url} · {service.models.length} model{service.models.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            {alreadyAdded && (
                              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>✓ Added</span>
                            )}
                            {!alreadyAdded && service.models.length <= 1 && (
                              <button className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}
                                onClick={() => quickAdd(service, service.models[0])}>
                                + Add
                              </button>
                            )}
                          </div>

                          {/* Per-model list for servers with multiple models */}
                          {service.models.length > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {service.models.map(m => (
                                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, fontSize: 13, fontFamily: 'monospace', color: 'var(--text)' }}>{m}</div>
                                  {!alreadyAdded && (
                                    <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }}
                                      onClick={() => quickAdd(service, m)}>
                                      + Add
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* Add / Edit form */}
          {editingId !== null ? (
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>
                {editingId === 'new' ? 'Add model' : 'Edit model'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Name</div>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Claude Haiku, Local Gemma" style={{ width: '100%' }} />
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Provider</div>
                  <select value={form.provider} style={{ width: '100%' }}
                    onChange={e => setForm(f => ({ ...f, provider: e.target.value, model: '', base_url: '' }))}>
                    {PROVIDERS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>

                {isLocalProvider && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Base URL</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={form.base_url}
                        onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                        placeholder={form.provider === 'ollama' ? 'http://172.17.0.1:11434' : 'http://localhost:1234/v1'}
                        style={{ flex: 1 }} />
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 12, padding: '0 12px', flexShrink: 0, whiteSpace: 'nowrap' }}
                        onClick={browseModels}
                        disabled={!form.base_url.trim() || browseStatus === 'loading'}
                      >
                        {browseStatus === 'loading' ? '…' : '🔍 Browse'}
                      </button>
                    </div>
                    {browseStatus === 'error' && (
                      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                        Could not connect: {browseError}
                      </div>
                    )}
                    {browseStatus === 'done' && localModels.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                        No models found on that server.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                    Model
                    {browseStatus === 'done' && localModels.length > 0 && (
                      <span style={{ marginLeft: 6, color: 'var(--accent)' }}>
                        {localModels.length} available
                      </span>
                    )}
                  </div>
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
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                      API Key {editingId !== 'new' && <span>(leave blank to keep existing)</span>}
                    </div>
                    <input type="password" value={form.api_key}
                      onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                      placeholder={editingId !== 'new' ? '••••••••' : 'sk-ant-…'}
                      style={{ width: '100%' }} />
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                      Or set the env var and leave this blank — the server will use it automatically.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={cancelEdit} disabled={saving}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving || !form.name.trim()}>
                  {saving ? 'Saving…' : editingId === 'new' ? 'Add Model' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-ghost" style={{ width: '100%' }} onClick={startAdd}>+ Add Manually</button>
          )}

          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            The active model (●) is used for all recipe generation. Click ○ on any model to switch.
          </div>
        </div>
      </div>
    </div>
  );
}
