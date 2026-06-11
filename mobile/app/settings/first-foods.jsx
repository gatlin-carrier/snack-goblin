import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { get, post, del } from '../../lib/api';

const COMMON = ['avocado','banana','sweet potato','oatmeal','pea purée','mango','chicken','lentils','eggs','yogurt'];
const REACTIONS = ['none','mild','moderate','severe'];
const REACTION_COLORS = { none:'#6A9870', mild:'#C09E38', moderate:'#D4703A', severe:'#BC3838' };

export default function FirstFoodsScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [food, setFood] = useState('');
  const [reaction, setReaction] = useState('none');

  useEffect(() => {
    get('/api/first-foods').then(d => setEntries(d || [])).catch(() => {});
  }, []);

  async function addEntry(name) {
    const f = name || food.trim();
    if (!f) return;
    const today = new Date().toISOString().split('T')[0];
    const entry = await post('/api/first-foods', { food_name: f, reaction, date_tried: today }).catch(() => null);
    if (entry) setEntries(prev => [entry, ...prev]);
    setFood('');
  }

  async function remove(id) {
    await del(`/api/first-foods/${id}`).catch(() => {});
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  return (
    <SafeAreaView className="flex-1 bg-goblin-bg" edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#E5D5C0' }}>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#3B2212' }}>first foods</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20, color: '#7A6150' }}>×</Text></TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 16 }}>
            {/* Quick picks */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {COMMON.map(f => (
                <TouchableOpacity key={f} onPress={() => addEntry(f)} style={{ backgroundColor: 'rgba(212,112,58,0.10)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: 'rgba(212,112,58,0.25)' }}>
                  <Text style={{ color: '#D4703A', fontSize: 12, fontWeight: '600' }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={food} onChangeText={setFood} placeholder="other food" placeholderTextColor="#9A8374" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, borderWidth: 0.5, borderColor: '#CFC2AE', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#3B2212' }} returnKeyType="done" onSubmitEditing={() => addEntry()}/>
              <TouchableOpacity onPress={() => addEntry()} style={{ backgroundColor: '#D4703A', borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' }}><Text style={{ color: 'white', fontWeight: '700' }}>log</Text></TouchableOpacity>
            </View>

            {/* Reaction selector */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {REACTIONS.map(r => (
                <TouchableOpacity key={r} onPress={() => setReaction(r)} style={{ flex: 1, borderRadius: 999, paddingVertical: 7, alignItems: 'center', backgroundColor: reaction === r ? REACTION_COLORS[r] : 'rgba(200,185,165,0.3)', borderWidth: 0.5, borderColor: REACTION_COLORS[r] }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: reaction === r ? 'white' : REACTION_COLORS[r] }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 14, padding: 13 }}>
            <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: REACTION_COLORS[item.reaction || 'none'], marginRight: 12 }}/>
            <Text style={{ flex: 1, color: '#3B2212', fontSize: 14, fontWeight: '500' }}>{item.food_name}</Text>
            <Text style={{ color: '#9A8374', fontSize: 12, marginRight: 10 }}>{item.date_tried}</Text>
            <TouchableOpacity onPress={() => remove(item.id)}><Text style={{ color: '#9A8374', fontSize: 16 }}>×</Text></TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
