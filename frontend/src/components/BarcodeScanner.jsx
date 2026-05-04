import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Glass, THEME, display, glassBtnPrimary } from '../lib/glass.jsx';

const CATEGORY_PATTERNS = [
  { patterns: ['dairy', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'], cat: 'dairy' },
  { patterns: ['meat', 'beef', 'pork', 'chicken', 'poultry', 'lamb', 'turkey', 'deli'], cat: 'meat' },
  { patterns: ['fish', 'seafood', 'salmon', 'tuna', 'shrimp', 'shellfish'], cat: 'seafood' },
  { patterns: ['frozen'], cat: 'frozen' },
  { patterns: ['bread', 'bakery', 'pastry', 'biscuit', 'cereal-based'], cat: 'bakery' },
  { patterns: ['vegetable', 'fruit', 'produce', 'fresh-food'], cat: 'produce' },
];

function guessCategory(tags = []) {
  const joined = tags.join(' ').toLowerCase();
  for (const { patterns, cat } of CATEGORY_PATTERNS) {
    if (patterns.some(p => joined.includes(p))) return cat;
  }
  return 'pantry';
}

export default function BarcodeScanner({ onScanned, onClose }) {
  const videoRef = useRef(null);
  const scannedRef = useRef(false);
  const [phase, setPhase] = useState('scanning');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        await reader.decodeFromVideoDevice(undefined, videoRef.current, async (result) => {
          if (!result || scannedRef.current) return;
          scannedRef.current = true;
          setPhase('looking');

          const barcode = result.getText();
          try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const data = await res.json();
            if (data.status === 1 && data.product?.product_name) {
              const name = (data.product.product_name || data.product.generic_name || '').trim();
              const tags = data.product.categories_tags || [];
              onScanned({ name, category: guessCategory(tags) });
            } else {
              setErrorMsg('Barcode not found in Open Food Facts. Enter name manually.');
              setPhase('error');
            }
          } catch {
            setErrorMsg('Could not look up product — check your connection.');
            setPhase('error');
          }
        });
      } catch {
        setErrorMsg('Camera access denied or unavailable.');
        setPhase('error');
      }
    })();

    return () => {
      try { BrowserMultiFormatReader.releaseAllStreams(); } catch {}
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{
            fontFamily: display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: THEME.ink,
          }}>📷 Scan barcode</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {phase === 'scanning' && (
            <>
              <div style={{ fontSize: 13, color: THEME.text, marginBottom: 14, lineHeight: 1.5 }}>
                Point your camera at any product barcode — it will auto-detect.
              </div>
              <div style={{
                position: 'relative', borderRadius: 14, overflow: 'hidden',
                background: 'oklch(0.18 0.02 50)', aspectRatio: '4/3',
                boxShadow: 'inset 0 0 0 0.5px oklch(0.4 0.02 60 / 0.2)',
              }}>
                <video ref={videoRef} style={{ width: '100%', display: 'block' }} muted autoPlay playsInline />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{
                    width: '65%', height: '28%',
                    border: `2px solid ${THEME.accent}`, borderRadius: 6,
                    boxShadow: '0 0 0 2000px oklch(0.18 0.02 50 / 0.5)',
                  }} />
                </div>
              </div>
            </>
          )}

          {phase === 'looking' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '28px 0', color: THEME.dim }}>
              <div className="spinner" />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: THEME.ink, fontSize: 15 }}>Looking up product…</div>
                <div style={{ fontSize: 13 }}>Checking Open Food Facts</div>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div style={{ padding: '12px 0' }}>
              <Glass tint="oklch(0.68 0.13 80 / 0.20)" padding={14} style={{ marginBottom: 22 }}>
                <div style={{ color: 'oklch(0.45 0.13 80)', fontSize: 14, lineHeight: 1.55 }}>⚠️ {errorMsg}</div>
              </Glass>
              <button style={{ ...glassBtnPrimary, width: '100%' }} onClick={onClose}>Enter manually</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
