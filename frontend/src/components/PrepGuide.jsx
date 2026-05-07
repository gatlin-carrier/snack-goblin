import { useState } from 'react';
import { Glass, THEME, display, glassBtnPrimary, glassBtnGhost } from '../lib/glass.jsx';

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
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>⚡ Batch prep scheduler</div>
          {canClose && <button className="modal-close" onClick={onClose}>×</button>}
        </div>
        <div className="modal-body">

          {step === 'config' && (
            <>
              <div style={{ color: THEME.text, fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
                Set your prep window — Claude will build a time-blocked schedule that fits, considering parallel tasks, oven temps, and chopping order.
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <FieldLabel>Prep day</FieldLabel>
                  <select value={prepDay} onChange={e => setPrepDay(e.target.value)} style={{ width: '100%' }}>
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ width: 140 }}>
                  <FieldLabel>Start time</FieldLabel>
                  <input type="time" value={prepStart} onChange={e => setPrepStart(e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <FieldLabel style={{ marginBottom: 0 }}>Prep window</FieldLabel>
                  <span style={{
                    color: THEME.ink, fontFamily: display, fontStyle: 'italic',
                    fontWeight: 500, fontSize: 18,
                  }}>{prepDuration} min</span>
                </div>
                <input type="range" min={30} max={240} step={15} value={prepDuration}
                  onChange={e => setPrepDuration(Number(e.target.value))}
                  style={{ width: '100%', accentColor: THEME.accent }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: THEME.faint, marginTop: 4 }}>
                  <span>30 min</span><span>4 hours</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...glassBtnGhost, flex: 1 }} onClick={onClose}>Cancel</button>
                <button style={{ ...glassBtnPrimary, flex: 2 }} onClick={generate}>
                  Generate schedule
                </button>
              </div>
            </>
          )}

          {step === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '28px 0', color: THEME.dim }}>
              <div className="spinner" />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: THEME.ink, fontSize: 15 }}>Building your prep schedule…</div>
                <div style={{ fontSize: 13 }}>Finding parallel tasks and fitting your {prepDuration}-minute window</div>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ padding: '16px 0' }}>
              <Glass tint="oklch(0.55 0.18 25 / 0.18)" padding={14} style={{ marginBottom: 16 }}>
                <div style={{ color: THEME.red, fontSize: 14 }}>⚠️ {error}</div>
              </Glass>
              <button style={glassBtnGhost} onClick={() => setStep('config')}>← Back</button>
            </div>
          )}

          {step === 'done' && guide && (
            <>
              <Glass tint="oklch(0.55 0.13 50 / 0.14)" padding={16} style={{
                marginBottom: 22, display: 'flex', gap: 24, flexWrap: 'wrap',
              }}>
                {[
                  { label: 'Day',         value: guide.prep_day || prepDay      },
                  { label: 'Start',       value: guide.start_time || prepStart  },
                  { label: 'Est. finish', value: guide.end_time || '—'          },
                  { label: 'Active time', value: `${guide.estimated_total_min || '—'} min` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{
                      fontSize: 10, color: THEME.dim, marginBottom: 4,
                      textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                    }}>{label}</div>
                    <div style={{
                      fontWeight: 700, color: THEME.ink, fontSize: 15,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{value}</div>
                  </div>
                ))}
              </Glass>

              {guide.overage_warning && (
                <Glass tint="oklch(0.68 0.13 80 / 0.20)" padding={12} style={{ marginBottom: 18 }}>
                  <div style={{ color: 'oklch(0.45 0.13 80)', fontSize: 13, fontWeight: 500 }}>
                    ⚠️ {guide.overage_warning}
                  </div>
                </Glass>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                {(guide.slots || []).map((slot, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 56, flexShrink: 0, paddingTop: 12, textAlign: 'right' }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700, color: THEME.accent,
                        fontVariantNumeric: 'tabular-nums',
                      }}>{slot.time}</div>
                      <div style={{ fontSize: 11, color: THEME.faint, marginTop: 2 }}>{slot.duration_min}m</div>
                    </div>
                    <Glass padding={14} style={{
                      flex: 1,
                      borderLeft: `3px solid ${THEME.accent}`,
                      borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
                    }}>
                      <div style={{
                        fontWeight: 600, fontSize: 14,
                        marginBottom: (slot.used_in?.length || slot.tip) ? 6 : 0,
                        color: THEME.ink,
                      }}>{slot.task}</div>
                      {slot.used_in?.length > 0 && (
                        <div style={{ fontSize: 12, color: THEME.dim, marginBottom: slot.tip ? 4 : 0 }}>
                          <span style={{ fontWeight: 600, color: THEME.faint, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>For</span>{' '}
                          {slot.used_in.join(', ')}
                        </div>
                      )}
                      {slot.tip && (
                        <div style={{ fontSize: 12, color: THEME.accent, lineHeight: 1.5 }}>💡 {slot.tip}</div>
                      )}
                    </Glass>
                  </div>
                ))}
              </div>

              {guide.notes && (
                <Glass tint="oklch(0.78 0.08 50 / 0.20)" padding={16} style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: THEME.accent,
                    letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8,
                  }}>📝 Notes</div>
                  <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.55 }}>{guide.notes}</div>
                </Glass>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...glassBtnGhost, flex: 1 }} onClick={() => setStep('config')}>← Adjust</button>
                <button style={{ ...glassBtnGhost, flex: 1 }} onClick={onClose}>Done</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 11, color: THEME.dim, marginBottom: 6, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em', ...style,
    }}>{children}</div>
  );
}
