import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

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
  const [phase, setPhase] = useState('scanning'); // scanning | looking | error
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
              setErrorMsg(`Barcode not found in Open Food Facts. Enter name manually.`);
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
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, fontSize: 18 }}>📷 Scan Barcode</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {phase === 'scanning' && (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
                Point your camera at any product barcode — it will auto-detect.
              </div>
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                <video ref={videoRef} style={{ width: '100%', display: 'block' }} muted autoPlay playsInline />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{
                    width: '65%', height: '28%',
                    border: '2px solid var(--accent)', borderRadius: 4,
                    boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)',
                  }} />
                </div>
              </div>
            </>
          )}

          {phase === 'looking' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 0', color: 'var(--text-dim)' }}>
              <div className="spinner" />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Looking up product…</div>
                <div style={{ fontSize: 13 }}>Checking Open Food Facts</div>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div style={{ padding: '12px 0' }}>
              <div style={{ color: 'var(--yellow)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>⚠️ {errorMsg}</div>
              <button className="btn-primary" style={{ width: '100%' }} onClick={onClose}>Enter Manually</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
