import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post } from '../../lib/api';

const PRESETS = [
  { label: 'moderate', calories: 2000, protein: 50, iron: 18 },
  { label: 'active', calories: 2400, protein: 80, iron: 18 },
  { label: 'high protein', calories: 2200, protein: 120, iron: 18 },
];

export default function AdultGoalsScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState({ calories: '', protein: '', iron: '', omega3_dha: '', weekly_budget: '' });

  useEffect(() => {
    get('/api/adult-goals').then(d => {
      if (d) setGoals({ calories: d.calories?.toString() || '', protein: d.protein?.toString() || '', iron: d.iron?.toString() || '', omega3_dha: d.omega3_dha?.toString() || '', weekly_budget: d.weekly_budget?.toString() || '' });
    }).catch(() => {});
  }, []);

  function applyPreset(p) {
    setGoals(g => ({ ...g, calories: p.calories.toString(), protein: p.protein.toString(), iron: p.iron.toString() }));
  }

  async function save() {
    const payload = {};
    Object.entries(goals).forEach(([k, v]) => { if (v) payload[k] = parseFloat(v); });
    await post('/api/adult-goals', payload).catch(() => {});
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>adult goals</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}>

        {/* Presets */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PRESETS.map(p => (
            <TouchableOpacity key={p.label} onPress={() => applyPreset(p)} style={{ flex: 1, backgroundColor: 'rgba(212,112,58,0.12)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(212,112,58,0.25)' }}>
              <Text style={{ color: '#D4703A', fontWeight: '600', fontSize: 12 }}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {[
          { key: 'calories', label: 'daily calories', placeholder: '2000', unit: 'kcal' },
          { key: 'protein', label: 'daily protein', placeholder: '50', unit: 'g' },
          { key: 'iron', label: 'daily iron', placeholder: '18', unit: 'mg' },
          { key: 'omega3_dha', label: 'omega-3 / DHA', placeholder: '250', unit: 'mg' },
          { key: 'weekly_budget', label: 'weekly grocery budget', placeholder: '150', unit: '$' },
        ].map(f => (
          <View key={f.key} className="gap-2">
            <Text className="text-goblin-dim text-xs font-bold tracking-wider uppercase">{f.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14 }}>
              <TextInput value={goals[f.key]} onChangeText={v => setGoals(g => ({...g, [f.key]: v}))} placeholder={f.placeholder} placeholderTextColor="#9A8374" keyboardType="numeric" style={{ flex: 1, paddingVertical: 11, fontSize: 14, color: '#3B2212' }}/>
              <Text style={{ color: '#9A8374', fontSize: 13 }}>{f.unit}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity onPress={save} style={{ backgroundColor: '#D4703A', borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 4 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>save goals</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
