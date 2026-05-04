import { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PrepGuide({ planId, onClose }) {
  const [step, setStep] = useState('config');
  const [prepDay, setPrepDay] = useState('Saturday');
  const [prepStart, setPrepStart] = useState('10:00');
  const [prepDuration, setPrepDuration] = useState(90);
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState(null);

  async function generate() {
    setStep('loading');
    setError(null);
    try {
      const params = new URLSearchParams({ prep_day: prepDay, prep_start: prepStart, prep_duration: prepDuration });
      const res = await fetch(`/api/meal-plans/${planId}/prep-guide?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGuide(data);
      setStep('done');
    } catch (e) {
      setError(e.message);
      setStep('error');
    }
  }

  const canClose = step !== 'loading';

  return (
    <div className="modal-backdrop" onClick={canClose ? onClose : undefined}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontSize: 18, fontWeight: 700 }}>⚡ Batch Prep Scheduler</div>
          {canClose && <button className="modal-close" onClick={onClose}>×</button>}
        </div>
        <div className="modal-body">

          {step === 'config' && (
            <>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                Set your prep window — Claude will build a time-blocked schedule that fits, considering parallel tasks, oven temps, and chopping order.
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Prep day</div>
                  <select value={prepDay} onChange={e => setPrepDay(e.target.value)} style={{ width: '100%' }}>
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ width: 130 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Start time</div>
                  <input type="time" value={prepStart} onChange={e => setPrepStart(e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                  <span>Prep window duration</span>
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>{prepDuration} min</span>
                </div>
                <input type="range" min={30} max={240} step={15} value={prepDuration}
                  onChange={e => setPrepDuration(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  <span>30 min</span><span>4 hours</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={generate}>
                  Generate Schedule
                </button>
              </div>
            </>
          )}

          {step === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 0', color: 'var(--text-dim)' }}>
              <div className="spinner" />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Building your prep schedule…</div>
                <div style={{ fontSize: 13 }}>Finding parallel tasks and fitting your {prepDuration}-minute window</div>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ padding: '16px 0' }}>
              <div style={{ color: 'var(--red)', fontSize: 14, marginBottom: 16 }}>⚠️ {error}</div>
              <button className="btn-ghost" onClick={() => setStep('config')}>← Back</button>
            </div>
          )}

          {step === 'done' && guide && (
            <>
              {/* Summary header */}
              <div style={{
                background: 'rgba(124,111,247,0.08)', border: '1px solid rgba(124,111,247,0.2)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                display: 'flex', gap: 20, flexWrap: 'wrap',
              }}>
                {[
                  { label: 'Day',         value: guide.prep_day || prepDay      },
                  { label: 'Start',       value: guide.start_time || prepStart  },
                  { label: 'Est. finish', value: guide.end_time || '—'          },
                  { label: 'Active time', value: `${guide.estimated_total_min || '—'} min` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>

              {guide.overage_warning && (
                <div style={{ color: 'var(--yellow)', fontSize: 13, marginBottom: 16, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 8, padding: '10px 14px' }}>
                  ⚠️ {guide.overage_warning}
                </div>
              )}

              {/* Time blocks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {(guide.slots || []).map((slot, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 48, flexShrink: 0, paddingTop: 10, textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{slot.time}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{slot.duration_min}m</div>
                    </div>
                    <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid var(--accent)' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: slot.used_in?.length || slot.tip ? 4 : 0 }}>{slot.task}</div>
                      {slot.used_in?.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: slot.tip ? 3 : 0 }}>
                          For: {slot.used_in.join(', ')}
                        </div>
                      )}
                      {slot.tip && (
                        <div style={{ fontSize: 12, color: 'var(--accent)' }}>💡 {slot.tip}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {guide.notes && (
                <div className="card" style={{ background: 'rgba(124,111,247,0.05)', borderColor: 'rgba(124,111,247,0.2)', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>📝 Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>{guide.notes}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep('config')}>← Adjust</button>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Done</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
