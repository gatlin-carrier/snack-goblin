import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post } from '../../lib/api';

export default function IntegrationsScreen() {
  const router = useRouter();
  const [pexelsKey, setPexelsKey] = useState('');
  const [pexelsStatus, setPexelsStatus] = useState(null);
  const [krogerStatus, setKrogerStatus] = useState(null);
  const [backfillStatus, setBackfillStatus] = useState(null);
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    get('/api/pexels/configured').then(d => setPexelsStatus(d?.configured)).catch(() => {});
    get('/api/retailer/kroger/status').then(d => setKrogerStatus(d)).catch(() => {});
  }, []);

  async function savePexels() {
    await post('/api/settings', { pexels_api_key: pexelsKey }).catch(() => {});
    setPexelsStatus(true);
  }

  async function connectKroger() {
    const data = await get('/api/auth/kroger').catch(() => null);
    if (data?.url) Linking.openURL(data.url);
  }

  async function disconnectKroger() {
    await post('/api/auth/kroger/disconnect', {}).catch(() => {});
    setKrogerStatus({ connected: false });
  }

  async function backfillImages() {
    setBackfilling(true);
    const data = await post('/api/recipes/backfill-images', {}).catch(() => null);
    setBackfillStatus(data?.status || 'started');
    setBackfilling(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>integrations</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}>

        {/* Pexels */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 18, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontWeight: '700', color: '#3B2212', fontSize: 16 }}>Pexels</Text>
            <View style={{ backgroundColor: pexelsStatus ? 'rgba(106,152,112,0.2)' : 'rgba(200,185,165,0.35)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: pexelsStatus ? '#3A6B50' : '#7A6150', fontWeight: '600' }}>{pexelsStatus ? 'connected' : 'not configured'}</Text>
            </View>
          </View>
          <Text style={{ color: '#7A6150', fontSize: 13 }}>food photography for your recipes.</Text>
          <TextInput value={pexelsKey} onChangeText={setPexelsKey} placeholder="Pexels API key" placeholderTextColor="#9A8374" secureTextEntry style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#3B2212' }}/>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={savePexels} disabled={!pexelsKey} style={{ flex: 1, backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 10, alignItems: 'center', opacity: !pexelsKey ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '700' }}>save key</Text></TouchableOpacity>
            <TouchableOpacity onPress={backfillImages} disabled={backfilling} style={{ flex: 1, backgroundColor: 'rgba(212,112,58,0.12)', borderRadius: 999, paddingVertical: 10, alignItems: 'center' }}>
              {backfilling ? <ActivityIndicator size="small" color="#D4703A"/> : <Text style={{ color: '#D4703A', fontWeight: '600' }}>backfill images</Text>}
            </TouchableOpacity>
          </View>
          {backfillStatus && <Text style={{ color: '#7A6150', fontSize: 12 }}>{backfillStatus}</Text>}
        </View>

        {/* Kroger */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 18, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontWeight: '700', color: '#3B2212', fontSize: 16 }}>Kroger</Text>
            <View style={{ backgroundColor: krogerStatus?.connected ? 'rgba(106,152,112,0.2)' : 'rgba(200,185,165,0.35)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: krogerStatus?.connected ? '#3A6B50' : '#7A6150', fontWeight: '600' }}>{krogerStatus?.connected ? 'connected' : 'not connected'}</Text>
            </View>
          </View>
          <Text style={{ color: '#7A6150', fontSize: 13 }}>send shopping list directly to your Kroger cart.</Text>
          {krogerStatus?.connected ? (
            <TouchableOpacity onPress={disconnectKroger} style={{ backgroundColor: 'rgba(188,56,56,0.10)', borderRadius: 999, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: '#BC3838', fontWeight: '600' }}>disconnect</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={connectKroger} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: 'white', fontWeight: '700' }}>connect Kroger</Text></TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
