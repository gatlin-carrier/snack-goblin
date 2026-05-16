import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post, del } from '../../lib/api';

const ALLERGENS = ['peanuts','tree nuts','eggs','dairy','wheat','soy','fish','shellfish','sesame'];
const STATUSES = ['not introduced','introduced','passed','reaction'];
const STATUS_COLORS = { 'not introduced':'#CFC2AE', introduced:'#C09E38', passed:'#6A9870', reaction:'#BC3838' };
const REACTION_LEVELS = ['mild','moderate','severe'];

export default function AllergensScreen() {
  const router = useRouter();
  const [exposures, setExposures] = useState({});

  useEffect(() => {
    get('/api/allergens').then(data => {
      const map = {};
      (data || []).forEach(e => { map[e.allergen] = e; });
      setExposures(map);
    }).catch(() => {});
  }, []);

  async function updateAllergen(allergen, patch) {
    const prev = exposures[allergen] || { allergen, status: 'not introduced' };
    const next = { ...prev, ...patch };
    setExposures(e => ({ ...e, [allergen]: next }));
    await post('/api/allergens', next).catch(() => {});
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>allergens</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}>
        {ALLERGENS.map(a => {
          const exp = exposures[a] || { status: 'not introduced' };
          return (
            <View key={a} style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 18, padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontWeight: '700', color: '#3B2212', fontSize: 15 }}>{a}</Text>
                <View style={{ backgroundColor: STATUS_COLORS[exp.status] + '30', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, color: STATUS_COLORS[exp.status], fontWeight: '700' }}>{exp.status}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {STATUSES.map(s => (
                  <TouchableOpacity key={s} onPress={() => updateAllergen(a, { status: s })}
                    style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: exp.status === s ? STATUS_COLORS[s] : 'rgba(200,185,165,0.3)', borderWidth: 0.5, borderColor: STATUS_COLORS[s] }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: exp.status === s ? 'white' : STATUS_COLORS[s] }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {exp.status === 'reaction' && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {REACTION_LEVELS.map(lvl => (
                    <TouchableOpacity key={lvl} onPress={() => updateAllergen(a, { reaction_level: lvl })}
                      style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: exp.reaction_level === lvl ? '#BC3838' : 'rgba(200,185,165,0.3)' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: exp.reaction_level === lvl ? 'white' : '#7A6150' }}>{lvl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
