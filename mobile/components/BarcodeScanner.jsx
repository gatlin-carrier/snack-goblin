import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const OPEN_FOOD_FACTS = 'https://world.openfoodfacts.org/api/v2/product';

const CATEGORY_MAP = [
  [['meat','chicken','beef','pork','fish','seafood'],   'meat'],
  [['milk','cheese','yogurt','dairy','cream','butter'], 'dairy'],
  [['frozen'],                                          'frozen'],
  [['bread','bakery','cereal','pasta'],                 'bakery'],
  [['vegetable','fruit','produce'],                     'produce'],
];

function detectCategory(tags = []) {
  const joined = tags.join(' ').toLowerCase();
  for (const [needles, cat] of CATEGORY_MAP) {
    if (needles.some(n => joined.includes(n))) return cat;
  }
  return 'pantry';
}

export function BarcodeScanner({ onResult, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState('scanning'); // scanning | looking | error
  const [errorMsg, setErrorMsg] = useState('');
  const lastScan = useRef(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  async function handleBarcode({ data }) {
    if (phase !== 'scanning') return;
    if (lastScan.current === data) return;
    lastScan.current = data;
    setPhase('looking');

    try {
      const res = await fetch(`${OPEN_FOOD_FACTS}/${data}?fields=product_name,categories_tags`);
      const json = await res.json();
      if (!json.product?.product_name) throw new Error('product not found');

      const name = json.product.product_name;
      const category = detectCategory(json.product.categories_tags || []);
      onResult({ name, category, barcode: data });
    } catch (e) {
      setErrorMsg(e.message || 'could not identify this barcode');
      setPhase('error');
    }
  }

  if (!permission) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <ActivityIndicator size="large" color="#D4703A"/>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#3B2212', textAlign: 'center' }}>camera access needed</Text>
        <Text style={{ color: '#7A6150', textAlign: 'center' }}>to scan barcodes, allow camera access.</Text>
        <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 24, paddingVertical: 13 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>allow camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: '#7A6150' }}>cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={phase === 'scanning' ? handleBarcode : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','upc_a','upc_e','code128','code39'] }}
      >
        {/* Viewfinder overlay */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 260, height: 160, borderWidth: 2, borderColor: '#D4703A', borderRadius: 16, backgroundColor: 'transparent' }}/>
          <Text style={{ color: 'white', marginTop: 20, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 }}>
            {phase === 'scanning' ? 'point at a barcode' : phase === 'looking' ? 'looking up product…' : errorMsg}
          </Text>
          {phase === 'looking' && <ActivityIndicator color="#D4703A" style={{ marginTop: 12 }}/>}
          {phase === 'error' && (
            <View style={{ marginTop: 16, gap: 10, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { lastScan.current = null; setPhase('scanning'); }} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CameraView>

      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        style={{ position: 'absolute', top: 52, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: 'white', fontSize: 18 }}>×</Text>
      </TouchableOpacity>
    </View>
  );
}
